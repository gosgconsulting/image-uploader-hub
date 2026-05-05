/**
 * Reorder a Shopify product's media so the gallery matches the trailing-number
 * convention in the filename (alt) — e.g. `...-1.JPG` first, `...-2.JPG` next, etc.
 * Files without a trailing `-<digits>.<ext>` go to the end. Position 1 becomes
 * the product's featured image by Shopify convention.
 *
 * POST { brand_id, import_id, dry_run? }
 *   - dry_run=true: returns the proposed order per product without mutating Shopify.
 *     Used by the preview dialog so users can review before applying.
 *   - dry_run=false (default): also performs the productReorderMedia mutation.
 *
 * Caller must be brand owner or active brand_users member.
 *
 * Response:
 *   { ok, dry_run, processed, results: [{ product_id, title?, moved, error?,
 *       current?: [{id, alt, url, position}], proposed?: [{id, alt, url, position}] }] }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";

const SHOPIFY_API_VERSION = "2026-04";
// Effectively unbounded for typical imports — the real limits are Shopify's
// GraphQL rate (50 points/s) and the 60s edge function wall clock.
const MAX_PRODUCTS = 10000;
const MAX_MEDIA_PER_PRODUCT = 250;
const PARALLELISM_DRY_RUN = 8;
const PARALLELISM_APPLY = 6;

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

/**
 * Extract the trailing image index from a filename or alt text. Matches the
 * pattern `-<digits>.<ext>` at the end of the string. Returns 999 (sentinel,
 * sorts last) when no trailing number is found.
 *
 * Examples:
 *   "CHC26361-CREME-3.JPG"            -> 3
 *   "Top BRISELIA Blanc - CHC26127-BLANC-2.JPG" -> 2
 *   "CHA26376-BLEU-JEAN-.JPG"         -> 999
 *   "20250610_MATTEO_FRNCH_01274.JPG" -> 999
 */
function trailingIndex(s: string): number {
  if (!s) return 999;
  const m = s.match(/-(\d+)\.[^.]+$/);
  if (!m) return 999;
  const n = Number.parseInt(m[1], 10);
  return Number.isFinite(n) ? n : 999;
}

const LIST_PRODUCT_MEDIA = `query ListProductMedia($id: ID!, $first: Int!) {
  product(id: $id) {
    id
    title
    media(first: $first) {
      nodes {
        id
        alt
        ... on MediaImage { image { url } }
      }
    }
  }
}`;

const REORDER_PRODUCT_MEDIA = `mutation ReorderProductMedia($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job { id }
    mediaUserErrors { field message }
  }
}`;

type MediaNode = {
  id: string;
  alt: string | null;
  image?: { url: string } | null;
};

type MediaSummary = {
  id: string;
  alt: string | null;
  url: string | null;
  position: number;
};

export type ReorderResult = {
  product_id: string;
  title?: string | null;
  moved: number;
  error?: string;
  current?: MediaSummary[];
  proposed?: MediaSummary[];
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

function summarize(node: MediaNode, position: number): MediaSummary {
  return {
    id: node.id,
    alt: node.alt,
    url: node.image?.url ?? null,
    position,
  };
}

function computeProposedOrder(nodes: MediaNode[]): {
  sorted: MediaNode[];
  movedCount: number;
} {
  const indexed = nodes.map((n, originalIdx) => {
    const altIdx = trailingIndex(n.alt ?? "");
    const urlIdx =
      altIdx === 999 && n.image?.url
        ? trailingIndex(n.image.url.split("/").pop() ?? "")
        : altIdx;
    return { node: n, originalIdx, key: urlIdx };
  });
  const sortedIdx = [...indexed].sort((a, b) => {
    if (a.key !== b.key) return a.key - b.key;
    return a.originalIdx - b.originalIdx;
  });
  let movedCount = 0;
  for (let i = 0; i < sortedIdx.length; i++) {
    if (sortedIdx[i].originalIdx !== i) movedCount++;
  }
  return { sorted: sortedIdx.map((s) => s.node), movedCount };
}

async function previewProduct(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<ReorderResult> {
  const list = await shopifyGql<{
    product:
      | { id: string; title: string; media: { nodes: MediaNode[] } }
      | null;
  }>(shopHost, accessToken, LIST_PRODUCT_MEDIA, {
    id: productId,
    first: MAX_MEDIA_PER_PRODUCT,
  });
  if (!list.ok) return { product_id: productId, moved: 0, error: list.error };
  const product = list.data.product;
  if (!product) return { product_id: productId, moved: 0, error: "Product not found" };
  const nodes = product.media?.nodes ?? [];
  const current = nodes.map((n, i) => summarize(n, i + 1));
  const { sorted, movedCount } = computeProposedOrder(nodes);
  const proposed = sorted.map((n, i) => summarize(n, i + 1));
  return {
    product_id: productId,
    title: product.title,
    moved: movedCount,
    current,
    proposed,
  };
}

async function applyProduct(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<ReorderResult> {
  const list = await shopifyGql<{
    product:
      | { id: string; title: string; media: { nodes: MediaNode[] } }
      | null;
  }>(shopHost, accessToken, LIST_PRODUCT_MEDIA, {
    id: productId,
    first: MAX_MEDIA_PER_PRODUCT,
  });
  if (!list.ok) return { product_id: productId, moved: 0, error: list.error };
  const product = list.data.product;
  if (!product) return { product_id: productId, moved: 0, error: "Product not found" };
  const nodes = product.media?.nodes ?? [];
  if (nodes.length < 2)
    return { product_id: productId, title: product.title, moved: 0 };

  const { sorted, movedCount } = computeProposedOrder(nodes);
  if (movedCount === 0)
    return { product_id: productId, title: product.title, moved: 0 };

  const moves = sorted.map((n, i) => ({ id: n.id, newPosition: String(i + 1) }));
  const reorder = await shopifyGql<{
    productReorderMedia: {
      job: { id: string } | null;
      mediaUserErrors: Array<{ message?: string }>;
    };
  }>(shopHost, accessToken, REORDER_PRODUCT_MEDIA, { id: productId, moves });
  if (!reorder.ok)
    return {
      product_id: productId,
      title: product.title,
      moved: 0,
      error: reorder.error,
    };
  const errs = reorder.data.productReorderMedia?.mediaUserErrors ?? [];
  if (errs.length) {
    return {
      product_id: productId,
      title: product.title,
      moved: 0,
      error: errs[0]?.message || "Shopify rejected reorder",
    };
  }
  return { product_id: productId, title: product.title, moved: movedCount };
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer "))
    return json({ error: "Missing authorization" }, 401);
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey)
    return json({ error: "Server misconfigured" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Invalid or expired session" }, 401);

  let body: { brand_id?: string; import_id?: string; dry_run?: boolean };
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
  const dryRun = body.dry_run === true;

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

  const { data: rows, error: rowsErr } = await admin
    .from("shopify_import_images")
    .select("shopify_product_id")
    .eq("import_id", importId)
    .not("shopify_product_id", "is", null);
  if (rowsErr) return json({ error: rowsErr.message }, 500);

  const productIds = Array.from(
    new Set(
      (rows ?? [])
        .map((r) => (r as { shopify_product_id: string | null }).shopify_product_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );
  if (productIds.length === 0) {
    return json({
      ok: true,
      dry_run: dryRun,
      processed: 0,
      results: [],
      message:
        "No products linked to this import yet — send the import to Shopify first.",
    });
  }
  if (productIds.length > MAX_PRODUCTS) {
    return json({ error: `Too many products (max ${MAX_PRODUCTS})` }, 400);
  }

  console.log(
    `[shopify-product-media-reorder] import=${importId} products=${productIds.length} dry_run=${dryRun}`,
  );

  const accessToken = cred.access_token as string;
  const results = await runPool(
    dryRun ? PARALLELISM_DRY_RUN : PARALLELISM_APPLY,
    productIds.length,
    (idx) =>
      dryRun
        ? previewProduct(shopDomain, accessToken, productIds[idx])
        : applyProduct(shopDomain, accessToken, productIds[idx]),
  );

  const totalMoved = results.reduce((acc, r) => acc + r.moved, 0);
  const failed = results.filter((r) => r.error).length;
  console.log(
    `[shopify-product-media-reorder] done import=${importId} dry_run=${dryRun} moved=${totalMoved} failed=${failed}`,
  );

  return json({
    ok: true,
    dry_run: dryRun,
    processed: productIds.length,
    results,
  });
});
