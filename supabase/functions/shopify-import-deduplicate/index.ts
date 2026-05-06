/**
 * Scan a finished import's Shopify products and surface media that look like
 * they shouldn't be there — typically photos whose filename color doesn't match
 * any of the product's variant colors, or photos for a different reference SKU
 * that crept in. The user reviews the list in a dialog and approves which ones
 * to delete.
 *
 * Two-call protocol:
 *   POST { brand_id, import_id, dry_run: true }
 *     → returns { ok, processed, candidates: [...] } — read-only scan, no
 *       Shopify mutations. Optionally enriches candidates with Claude
 *       reasoning when LLMGATEWAY_API_KEY is set on the project.
 *   POST { brand_id, import_id, dry_run: false, media_ids: [...] }
 *     → deletes only the explicitly-listed media via productDeleteMedia.
 *       The user-approved subset is the source of truth so a stale
 *       candidates list from a prior scan can't accidentally over-delete.
 *
 * Caller must be brand owner or an active brand_users member — same auth
 * pattern as shopify-product-media-reorder.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  parseProductImageFilename,
  resolveColorOption,
} from "../_shared/parseProductImageFilename.ts";
import { llmGatewayChat } from "../_shared/llmGateway.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MAX_PRODUCTS = 10000;
const MAX_MEDIA_PER_PRODUCT = 250;
const SCAN_PARALLELISM = 8;
const DELETE_CHUNK = 100;

// Claude model used for the optional refinement pass. Routed through the
// project's existing LLM Gateway (same `LLMGATEWAY_API_KEY` secret used by
// `llmgateway-chat` and the AI content functions). Picked a fast Sonnet —
// the task is short-context categorisation, not heavy reasoning.
const CLAUDE_MODEL = "claude-sonnet-4-5";

/**
 * Inlined from shopify-create-refund/refundLogic.ts so this function has no
 * cross-function imports — keeps the deploy bundle small.
 */
function normalizeShopDomain(shop: string): string {
  let s = shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const stop = s.search(/[/?#]/);
  if (stop !== -1) s = s.slice(0, stop);
  return s;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BRAND_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const LIST_PRODUCT = `query ListProduct($id: ID!, $first: Int!) {
  product(id: $id) {
    id
    title
    options { id name optionValues { name } }
    variants(first: 100) {
      nodes {
        id
        selectedOptions { name value }
      }
    }
    media(first: $first) {
      nodes {
        id
        alt
        ... on MediaImage { image { url } }
      }
    }
  }
}`;

const DELETE_PRODUCT_MEDIA = `mutation DeleteProductMedia($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    mediaUserErrors { field message }
  }
}`;

type MediaNode = {
  id: string;
  alt: string | null;
  image?: { url: string } | null;
};

type ProductFull = {
  id: string;
  title: string;
  options: Array<{ id: string; name: string; optionValues: Array<{ name: string }> }>;
  variants: { nodes: Array<{ id: string; selectedOptions: Array<{ name: string; value: string }> }> };
  media: { nodes: MediaNode[] };
};

export type DedupCandidate = {
  product_id: string;
  product_title: string;
  media_id: string;
  filename: string;
  url: string | null;
  /** Color the filename parser extracted (null if it couldn't find one). */
  detected_color: string | null;
  /** Concise machine-readable reason code for filtering / icons in the UI. */
  reason_code:
    | "color_not_in_variants"
    | "duplicate_filename"
    | "ref_mismatch"
    | "unparseable_filename";
  /** Human-readable reason; gets rewritten by Claude when AI review runs. */
  reason: string;
  /** Anthropic confidence score 0..1 when AI reviewed this candidate. */
  confidence?: number;
};

async function shopifyGql<T>(
  shopHost: string,
  accessToken: string,
  query: string,
  variables: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(
      `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      },
    );
  } catch (e) {
    return {
      ok: false,
      error: `Network error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
  if (!res.ok) return { ok: false, error: `Shopify ${res.status}` };
  const body = (await res.json().catch(() => ({}))) as {
    data?: T;
    errors?: Array<{ message?: string }>;
  };
  if (body.errors?.length) {
    return { ok: false, error: body.errors[0]?.message || "GraphQL error" };
  }
  if (!body.data) return { ok: false, error: "Empty response" };
  return { ok: true, data: body.data };
}

/** Best filename for a media node — alt usually carries the original upload name. */
function filenameFor(node: MediaNode): string {
  if (node.alt) {
    const sep = node.alt.lastIndexOf(" - ");
    if (sep >= 0 && sep < node.alt.length - 3) return node.alt.slice(sep + 3);
    return node.alt;
  }
  const url = node.image?.url ?? "";
  if (!url) return "";
  return url.split("?")[0].split("/").pop() ?? "";
}

function urlFor(node: MediaNode): string | null {
  return node.image?.url ?? null;
}

/**
 * Deterministic scan: flag candidates whose filename color doesn't match any
 * variant color, or that look out of place (different ref, duplicate, garbled
 * filename). The reasons are conservative so the dialog always shows a clear
 * "why" and the merchant can deselect anything that's intentional.
 */
function scanProduct(product: ProductFull, importRefs: Set<string>): DedupCandidate[] {
  const filenames = product.media.nodes.map((n) => filenameFor(n)).filter(Boolean);
  const colorOpt = resolveColorOption(product, filenames);
  const knownColors = colorOpt?.values ?? [];

  // Build the dominant ref tokens ON THIS PRODUCT — usually a single SKU prefix.
  // We use it to flag rogue media that come from a different product.
  const refCounts = new Map<string, number>();
  for (const f of filenames) {
    const parsed = parseProductImageFilename(f, knownColors);
    if (parsed.ref) {
      refCounts.set(parsed.ref, (refCounts.get(parsed.ref) ?? 0) + 1);
    }
  }
  const dominantRefs = new Set<string>();
  for (const [ref, count] of refCounts) {
    if (count >= 2) dominantRefs.add(ref);
  }
  // The import's expected refs override the auto-detected dominants when set.
  const expectedRefs = importRefs.size > 0 ? importRefs : dominantRefs;

  const out: DedupCandidate[] = [];
  const seenByFilename = new Map<string, string>();

  for (const m of product.media.nodes) {
    const fname = filenameFor(m);
    if (!fname) continue;
    const norm = fname.trim().toLowerCase();
    const parsed = parseProductImageFilename(fname, knownColors);

    // Duplicate filename — Shopify keeps both copies after a re-upload that
    // hits the silent _2/_3 rename. The first occurrence is kept; rest flagged.
    const firstWithThisName = seenByFilename.get(norm);
    if (firstWithThisName) {
      out.push({
        product_id: product.id,
        product_title: product.title,
        media_id: m.id,
        filename: fname,
        url: urlFor(m),
        detected_color: parsed.color,
        reason_code: "duplicate_filename",
        reason: `Duplicate of an earlier media on this product (filename "${fname}")`,
      });
      continue;
    }
    seenByFilename.set(norm, m.id);

    // Ref doesn't match this product's dominant or import ref — likely uploaded
    // to the wrong product entirely.
    if (parsed.ref && expectedRefs.size > 0 && !expectedRefs.has(parsed.ref)) {
      out.push({
        product_id: product.id,
        product_title: product.title,
        media_id: m.id,
        filename: fname,
        url: urlFor(m),
        detected_color: parsed.color,
        reason_code: "ref_mismatch",
        reason: `Reference "${parsed.ref}" doesn't match this product's other files`,
      });
      continue;
    }

    // The flagship case: filename has a candidate color but it doesn't map to
    // any of the product's actual variant colors. Skip when the product has no
    // color option at all (the storefront already shows everything in that case).
    if (
      colorOpt &&
      knownColors.length > 0 &&
      parsed.candidateColor &&
      !parsed.color &&
      // Make sure the candidate isn't a layout token like "BACK" / "DETAIL".
      // Heuristic: skip purely-uppercase short tokens that don't contain a digit.
      parsed.candidateColor.length >= 3
    ) {
      // Sanity check: don't double-flag obvious non-color middle tokens. If
      // the candidate isn't even close to a known color we still flag, but
      // mark it lower-priority for AI review.
      out.push({
        product_id: product.id,
        product_title: product.title,
        media_id: m.id,
        filename: fname,
        url: urlFor(m),
        detected_color: null,
        reason_code: "color_not_in_variants",
        reason: `Filename color "${parsed.candidateColor}" isn't one of the product's variants (${knownColors.join(", ")})`,
      });
      continue;
    }

    // Filename has an unrecognized middle token AND we already have a color
    // option — fall-through; don't over-flag. A future case worth adding:
    // "color was in a previous import but isn't now" — needs a per-color
    // expected set passed in. Skipped for the MVP.

    // Filename couldn't be parsed at all (no ref, no position). Rare but
    // surface it so the merchant can decide.
    if (!parsed.ref && !parsed.position && !parsed.candidateColor) {
      out.push({
        product_id: product.id,
        product_title: product.title,
        media_id: m.id,
        filename: fname,
        url: urlFor(m),
        detected_color: null,
        reason_code: "unparseable_filename",
        reason: "Filename doesn't follow the REF-COLOR-POSITION pattern",
      });
    }
  }

  // Spot-check: a candidate flagged as color_not_in_variants but whose filename
  // *also* shares a known color is probably a false positive (e.g. multi-token
  // candidate that contains the variant color). The longest-match logic in the
  // parser already handles this, but be defensive.
  const knownColorTokens = new Set<string>();
  for (const c of knownColors) {
    for (const tok of c.split(/[-_\s]+/)) {
      const t = tok.toLowerCase();
      if (t) knownColorTokens.add(t);
    }
  }
  return out.filter((c) => {
    if (c.reason_code !== "color_not_in_variants") return true;
    const fnLower = c.filename.toLowerCase();
    for (const tok of knownColorTokens) {
      if (fnLower.includes(tok)) return false;
    }
    return true;
  });
}

/**
 * Optional: have Claude eyeball the deterministic candidates via the LLM
 * Gateway and either confirm each one or downgrade it (false positive). The
 * structured JSON contract keeps the round-trip cheap. If anything goes wrong
 * (gateway down, malformed response) we silently fall back to the
 * deterministic list — the feature still works.
 */
async function aiReviewCandidates(
  candidates: DedupCandidate[],
): Promise<DedupCandidate[]> {
  if (candidates.length === 0) return candidates;

  // Cap the prompt size: 200 candidates is more than any reasonable batch and
  // keeps us comfortably inside Claude's context.
  const reviewable = candidates.slice(0, 200);

  const summary = reviewable.map((c, i) => ({
    i,
    product: c.product_title,
    filename: c.filename,
    reason_code: c.reason_code,
    reason: c.reason,
  }));

  const userPrompt = `You're auditing Shopify product images that an automated tool flagged as likely-misattributed (wrong-color variant, duplicate, or wrong product).

For each candidate, decide:
- keep: yes if the candidate should still be deleted, no if it looks like a false positive
- confidence: your confidence 0..1
- reason: a one-sentence merchant-readable explanation (rewrite the original if you can be clearer; English)

Return ONLY a JSON object: {"reviews":[{"i":0,"keep":true,"confidence":0.9,"reason":"..."}, ...]}. No prose, no code fences.

Candidates:
${JSON.stringify(summary)}`;

  let raw: unknown;
  try {
    raw = await llmGatewayChat({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a careful auditor. Output only valid JSON in the exact shape requested. No markdown, no commentary.",
        },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (e) {
    console.warn(
      `[dedup] AI review skipped: ${e instanceof Error ? e.message : String(e)}`,
    );
    return candidates;
  }

  const text = ((raw as Record<string, unknown> | undefined)?.choices as
    | Array<{ message?: { content?: string } }>
    | undefined)?.[0]?.message?.content ?? "";

  let parsed: {
    reviews?: Array<{
      i?: number;
      keep?: boolean;
      confidence?: number;
      reason?: string;
    }>;
  };
  try {
    // Be lenient: models sometimes wrap JSON in markdown despite the instruction.
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn(`[dedup] AI review skipped: couldn't parse model output`);
    return candidates;
  }

  const reviews = Array.isArray(parsed.reviews) ? parsed.reviews : [];
  const decisions = new Map<number, { keep: boolean; confidence: number; reason: string }>();
  for (const r of reviews) {
    if (typeof r.i !== "number") continue;
    decisions.set(r.i, {
      keep: r.keep !== false,
      confidence: typeof r.confidence === "number" ? r.confidence : 0.5,
      reason: typeof r.reason === "string" && r.reason ? r.reason : "",
    });
  }

  const out: DedupCandidate[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (i >= reviewable.length) {
      out.push(candidates[i]);
      continue;
    }
    const d = decisions.get(i);
    if (!d) {
      out.push(candidates[i]);
      continue;
    }
    if (!d.keep) continue;
    out.push({
      ...candidates[i],
      confidence: d.confidence,
      reason: d.reason || candidates[i].reason,
    });
  }
  return out;
}

async function runPool<T>(
  parallelism: number,
  total: number,
  fn: (idx: number) => Promise<T>,
): Promise<T[]> {
  const out: T[] = new Array(total);
  const cursor = { i: 0 };
  await Promise.all(
    Array.from({ length: Math.min(parallelism, total) }, async () => {
      for (;;) {
        const i = cursor.i++;
        if (i >= total) return;
        out[i] = await fn(i);
      }
    }),
  );
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey)
    return json({ error: "Server misconfigured" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return json({ error: "Missing authorization" }, 401);
  const jwt = authHeader.slice(7);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Invalid or expired session" }, 401);

  let body: {
    brand_id?: string;
    import_id?: string;
    dry_run?: boolean;
    media_ids?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  if (!BRAND_UUID_RE.test(brandId)) return json({ error: "Invalid brand_id" }, 400);
  const importId =
    typeof body.import_id === "string" ? body.import_id.trim() : "";
  if (!importId) return json({ error: "import_id required" }, 400);
  const dryRun = body.dry_run !== false;

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: brand } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return json({ error: "Brand not found" }, 404);
  let allowed = (brand as { user_id?: string }).user_id === user.id;
  if (!allowed) {
    const { data: memberRow } = await admin
      .from("brand_users")
      .select("id")
      .eq("brand_id", brandId)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    allowed = Boolean(memberRow);
  }
  if (!allowed) return json({ error: "Not allowed for this brand" }, 403);

  const { data: cred } = await admin
    .from("shopify_credentials")
    .select("access_token, shop_domain")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!cred?.access_token || !(cred as { shop_domain?: string }).shop_domain) {
    return json({ error: "No Shopify credentials saved for this brand" }, 400);
  }
  const shopDomain = normalizeShopDomain(
    (cred as { shop_domain: string }).shop_domain,
  );
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    return json({ error: "Invalid Shopify shop domain" }, 400);
  }
  const accessToken = cred.access_token as string;

  // ── Apply path: trust the user's selected media_ids and delete those. ──────
  if (!dryRun) {
    const rawIds = body.media_ids;
    if (!Array.isArray(rawIds) || rawIds.length === 0) {
      return json({ error: "media_ids required for apply" }, 400);
    }
    const mediaIds = rawIds.filter((v): v is string => typeof v === "string" && v.length > 0);
    if (mediaIds.length === 0) return json({ error: "media_ids empty" }, 400);

    // We need to group ids by their product because productDeleteMedia takes
    // one productId. Look the products up from the import's image rows.
    const { data: rows, error: rowsErr } = await admin
      .from("shopify_import_images")
      .select("shopify_product_id, shopify_media_id")
      .eq("import_id", importId);
    if (rowsErr) return json({ error: rowsErr.message }, 500);

    // Map media_id → product_id from our DB. Anything we don't recognize, we
    // need to ask Shopify which product owns it — but for the typical flow
    // every flagged media is on a product we already track via the import.
    const productByMedia = new Map<string, string>();
    for (const r of rows ?? []) {
      const row = r as { shopify_product_id: string | null; shopify_media_id: string | null };
      if (row.shopify_product_id && row.shopify_media_id) {
        productByMedia.set(row.shopify_media_id, row.shopify_product_id);
      }
    }

    // For unknown media, fall back to a product scan: look up each candidate
    // by walking the products in the import. Slower but bounded.
    const unknown = mediaIds.filter((id) => !productByMedia.has(id));
    if (unknown.length > 0) {
      const { data: prodRows } = await admin
        .from("shopify_import_images")
        .select("shopify_product_id")
        .eq("import_id", importId)
        .not("shopify_product_id", "is", null);
      const productIds = Array.from(
        new Set(
          (prodRows ?? [])
            .map((r) => (r as { shopify_product_id: string | null }).shopify_product_id)
            .filter((v): v is string => !!v),
        ),
      );
      for (const pid of productIds) {
        if (unknown.length === 0) break;
        const list = await shopifyGql<{ product: ProductFull | null }>(
          shopDomain,
          accessToken,
          LIST_PRODUCT,
          { id: pid, first: MAX_MEDIA_PER_PRODUCT },
        );
        if (!list.ok || !list.data.product) continue;
        for (const m of list.data.product.media.nodes) {
          if (productByMedia.has(m.id)) continue;
          if (mediaIds.includes(m.id)) productByMedia.set(m.id, pid);
        }
      }
    }

    const byProduct = new Map<string, string[]>();
    const orphan: string[] = [];
    for (const id of mediaIds) {
      const pid = productByMedia.get(id);
      if (!pid) {
        orphan.push(id);
        continue;
      }
      const arr = byProduct.get(pid) ?? [];
      arr.push(id);
      byProduct.set(pid, arr);
    }

    let deleted = 0;
    const errors: Array<{ product_id: string; error: string }> = [];
    for (const [pid, ids] of byProduct) {
      for (let i = 0; i < ids.length; i += DELETE_CHUNK) {
        const chunk = ids.slice(i, i + DELETE_CHUNK);
        const del = await shopifyGql<{
          productDeleteMedia: {
            deletedMediaIds: string[] | null;
            mediaUserErrors: Array<{ message?: string }>;
          };
        }>(shopDomain, accessToken, DELETE_PRODUCT_MEDIA, {
          productId: pid,
          mediaIds: chunk,
        });
        if (!del.ok) {
          errors.push({ product_id: pid, error: del.error });
          break;
        }
        const errs = del.data.productDeleteMedia?.mediaUserErrors ?? [];
        if (errs.length) {
          errors.push({
            product_id: pid,
            error: errs[0]?.message || "Shopify rejected delete",
          });
          break;
        }
        deleted += del.data.productDeleteMedia?.deletedMediaIds?.length ?? 0;
      }
    }

    return json({
      ok: true,
      dry_run: false,
      deleted,
      orphan_media_ids: orphan,
      errors,
    });
  }

  // ── Dry-run path: scan products, return candidates. ────────────────────────
  const PAGE = 1000;
  const productIdSet = new Set<string>();
  const importRefs = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error: rowsErr } = await admin
      .from("shopify_import_images")
      .select("shopify_product_id, file_name")
      .eq("import_id", importId)
      .not("shopify_product_id", "is", null)
      .range(from, from + PAGE - 1);
    if (rowsErr) return json({ error: rowsErr.message }, 500);
    const batch = rows ?? [];
    for (const r of batch) {
      const v = (r as { shopify_product_id: string | null; file_name: string | null });
      if (typeof v.shopify_product_id === "string" && v.shopify_product_id.length > 0) {
        productIdSet.add(v.shopify_product_id);
      }
      if (typeof v.file_name === "string" && v.file_name.length > 0) {
        const parsed = parseProductImageFilename(v.file_name);
        if (parsed.ref) importRefs.add(parsed.ref);
      }
    }
    if (batch.length < PAGE) break;
  }
  const productIds = Array.from(productIdSet);
  if (productIds.length === 0) {
    return json({
      ok: true,
      dry_run: true,
      processed: 0,
      candidates: [],
      message:
        "No products linked to this import yet — send to Shopify first.",
    });
  }
  if (productIds.length > MAX_PRODUCTS) {
    return json({ error: `Too many products (max ${MAX_PRODUCTS})` }, 400);
  }

  console.log(
    `[shopify-import-deduplicate] import=${importId} products=${productIds.length} scan`,
  );

  const productResults = await runPool(SCAN_PARALLELISM, productIds.length, async (idx) => {
    const pid = productIds[idx];
    const list = await shopifyGql<{ product: ProductFull | null }>(
      shopDomain,
      accessToken,
      LIST_PRODUCT,
      { id: pid, first: MAX_MEDIA_PER_PRODUCT },
    );
    if (!list.ok || !list.data.product) {
      return { candidates: [] as DedupCandidate[], error: list.ok ? "Product not found" : list.error, productId: pid };
    }
    return {
      candidates: scanProduct(list.data.product, importRefs),
      productId: pid,
    };
  });

  let candidates: DedupCandidate[] = [];
  for (const r of productResults) candidates = candidates.concat(r.candidates);

  // Optional AI refinement via the project's LLM Gateway. Same secret
  // (`LLMGATEWAY_API_KEY`) used by `llmgateway-chat`, `ai-content-enhancer`,
  // etc. — when it's set on the project, every dedup scan gets reviewed.
  const gatewayKey = Deno.env.get("LLMGATEWAY_API_KEY");
  let aiUsed = false;
  if (gatewayKey && candidates.length > 0) {
    const before = candidates.length;
    candidates = await aiReviewCandidates(candidates);
    aiUsed = true;
    console.log(
      `[shopify-import-deduplicate] AI review: ${before} → ${candidates.length}`,
    );
  }

  console.log(
    `[shopify-import-deduplicate] done import=${importId} products=${productIds.length} candidates=${candidates.length} ai=${aiUsed}`,
  );

  return json({
    ok: true,
    dry_run: true,
    processed: productIds.length,
    ai_reviewed: aiUsed,
    candidates,
  });
});
