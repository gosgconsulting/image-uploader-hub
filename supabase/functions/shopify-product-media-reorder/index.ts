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
import {
  parseProductImageFilename,
  resolveColorOption,
} from "../_shared/parseProductImageFilename.ts";

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
    "authorization, x-client-info, apikey, content-type, x-internal-auth",
};

/**
 * When this header equals the service-role key, skip user-JWT auth and brand-membership
 * checks. Used by `shopify-import-media` to auto-reorder right after an import finishes.
 * Reuses the same pattern as that function's continuation kick-off.
 */
const INTERNAL_HEADER = "x-internal-auth";

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

/** Best filename for a media node: alt usually carries the original upload name. */
function filenameFor(node: MediaNode): string {
  // Alt is typically `${productName} - ${filename.ext}` from processImport. Take the part
  // after the last " - " if present; else fall back to the URL's last segment.
  if (node.alt) {
    const sep = node.alt.lastIndexOf(" - ");
    if (sep >= 0 && sep < node.alt.length - 3) return node.alt.slice(sep + 3);
    return node.alt;
  }
  const url = node.image?.url ?? "";
  if (!url) return "";
  const last = url.split("?")[0].split("/").pop() ?? "";
  // Shopify CDN sometimes appends size suffixes; the basename still has the right tokens.
  return last;
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
        image { id }
        media(first: 100) {
          nodes { id }
        }
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

const REORDER_PRODUCT_MEDIA = `mutation ReorderProductMedia($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job { id }
    mediaUserErrors { field message }
  }
}`;

const VARIANTS_BULK_UPDATE = `mutation VariantsSetMedia($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id mediaCount }
    userErrors { field message }
  }
}`;

// Per-variant media gallery: append the right-color media, detach the wrong-color
// ones. Themes that filter the storefront gallery by `variant.media[]` will then
// show only the selected color's images (e.g. picking "Bordeaux" no longer shows
// the cream or purple shots).
const VARIANT_APPEND_MEDIA = `mutation VariantAppendMedia($productId: ID!, $variantMedia: [ProductVariantAppendMediaInput!]!) {
  productVariantAppendMedia(productId: $productId, variantMedia: $variantMedia) {
    productVariants { id }
    userErrors { field message }
  }
}`;

const VARIANT_DETACH_MEDIA = `mutation VariantDetachMedia($productId: ID!, $variantMedia: [ProductVariantDetachMediaInput!]!) {
  productVariantDetachMedia(productId: $productId, variantMedia: $variantMedia) {
    productVariants { id }
    userErrors { field message }
  }
}`;

// Deletes media items from the product entirely. Used to remove duplicate
// uploads that were left behind by retries — Shopify auto-renames the second
// upload of the same filename (`foo.jpg` → `foo_2.jpg`) and we want both the
// original and the copy gone from the gallery.
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

type VariantNode = {
  id: string;
  selectedOptions: Array<{ name: string; value: string }>;
  image: { id: string } | null;
  /** Media currently associated with this variant (drives the storefront gallery filter). */
  media: { nodes: Array<{ id: string }> };
};

type ProductFull = {
  id: string;
  title: string;
  options: Array<{ id: string; name: string; optionValues: Array<{ name: string }> }>;
  variants: { nodes: VariantNode[] };
  media: { nodes: MediaNode[] };
};

type MediaSummary = {
  id: string;
  alt: string | null;
  url: string | null;
  position: number;
  /** Resolved color value for this media (matched against the product's color option), if any. */
  color: string | null;
};

export type ReorderResult = {
  product_id: string;
  title?: string | null;
  moved: number;
  /** The Shopify option that was treated as the color (Color/Couleur), null if none. */
  color_option?: string | null;
  /** "named" when the option was Color/Couleur/etc; "auto" when picked by match score. */
  color_option_source?: "named" | "auto" | null;
  /** Color values in the variant order — exposed so the UI can show the grouping. */
  color_values?: string[] | null;
  /** How many variant.image associations the apply pass made (or would make in dry-run). */
  variants_updated?: number;
  variant_updates_planned?: number;
  /**
   * How many media-variant associations were appended (so each color variant's
   * gallery only shows its own color's images on the storefront).
   */
  variant_media_appended?: number;
  variant_media_appends_planned?: number;
  /**
   * How many wrong-color media-variant associations were detached (cleared so
   * picking "Bordeaux" no longer shows cream/purple images on themes that
   * filter by variant.media).
   */
  variant_media_detached?: number;
  variant_media_detaches_planned?: number;
  /**
   * How many duplicate media items were deleted from the product entirely
   * (same filename appeared more than once — e.g. left behind by retries).
   */
  media_deleted?: number;
  media_deletions_planned?: number;
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

/** Concatenate a new error onto an existing error string with " · " as separator. */
function appendErr(existing: string | undefined, next: string): string {
  if (!existing) return next;
  return `${existing} · ${next}`;
}

function summarize(
  node: MediaNode,
  position: number,
  color: string | null,
): MediaSummary {
  return {
    id: node.id,
    alt: node.alt,
    url: node.image?.url ?? null,
    position,
    color,
  };
}

/**
 * Determine the product's color-like option. Tries explicit naming
 * (Color/Couleur/Coloris/etc.), then auto-detects by scoring each option's values
 * against the actual filenames on the product's media. Returns null if neither path
 * produces a usable color option.
 */
function detectColorOption(product: ProductFull): {
  optionName: string;
  values: string[];
  source: "named" | "auto";
} | null {
  const filenames = product.media.nodes.map((n) => filenameFor(n)).filter(Boolean);
  return resolveColorOption(product, filenames);
}

/**
 * Variant-aware order: group media by detected color (matched against the product's
 * actual color option values), order groups by the variant order, then sort within each
 * group by the trailing position number from the filename.
 *
 * Media that don't match any color (e.g. "ROBE-BACK.jpg") fall into a "no color" bucket
 * placed AFTER the colored groups so the per-variant featured images remain at the front.
 *
 * If the product has no color option, behaves like the original product-level reorder
 * (single bucket sorted by trailing index).
 */
function computeProposedOrder(
  product: ProductFull,
  colorOpt: { optionName: string; values: string[] } | null,
): {
  sorted: MediaNode[];
  colorByMediaId: Map<string, string | null>;
  movedCount: number;
} {
  const nodes = product.media.nodes;
  const knownColors = colorOpt?.values ?? [];

  // Pass 1: parse each media's filename → {color, position}.
  const decorated = nodes.map((n, originalIdx) => {
    const fname = filenameFor(n);
    const parsed = parseProductImageFilename(fname, knownColors);
    // Fall back to legacy regex if parser couldn't find a position.
    const position =
      parsed.position !== 999 ? parsed.position : trailingIndex(fname);
    return { node: n, originalIdx, color: parsed.color, position };
  });

  // Pass 2: bucket by color in the variant order; unknown colors go to the end bucket.
  const colorOrder = new Map<string, number>();
  knownColors.forEach((c, i) => colorOrder.set(c, i));

  const sortedIdx = [...decorated].sort((a, b) => {
    const aBucket = a.color !== null ? (colorOrder.get(a.color) ?? 999) : 1000;
    const bBucket = b.color !== null ? (colorOrder.get(b.color) ?? 999) : 1000;
    if (aBucket !== bBucket) return aBucket - bBucket;
    if (a.position !== b.position) return a.position - b.position;
    return a.originalIdx - b.originalIdx;
  });

  let movedCount = 0;
  const colorByMediaId = new Map<string, string | null>();
  for (let i = 0; i < sortedIdx.length; i++) {
    if (sortedIdx[i].originalIdx !== i) movedCount++;
    colorByMediaId.set(sortedIdx[i].node.id, sortedIdx[i].color);
  }
  return {
    sorted: sortedIdx.map((s) => s.node),
    colorByMediaId,
    movedCount,
  };
}

/**
 * For each variant, pick the new "featured" media id: the first sorted media whose
 * detected color matches that variant's color value. Returns inputs for
 * `productVariantsBulkUpdate`. Skips variants where (a) the product has no color option,
 * (b) we can't find any matching media, or (c) the variant already points at that media.
 */
function buildVariantMediaUpdates(
  product: ProductFull,
  colorOpt: { optionName: string; values: string[] } | null,
  sortedMedia: MediaNode[],
  colorByMediaId: Map<string, string | null>,
): Array<{ id: string; mediaId: string }> {
  if (!colorOpt) return [];
  const firstByColor = new Map<string, string>();
  for (const m of sortedMedia) {
    const c = colorByMediaId.get(m.id);
    if (!c) continue;
    if (!firstByColor.has(c)) firstByColor.set(c, m.id);
  }
  const updates: Array<{ id: string; mediaId: string }> = [];
  for (const v of product.variants.nodes) {
    const sel = v.selectedOptions.find((o) => o.name === colorOpt.optionName);
    if (!sel) continue;
    const target = firstByColor.get(sel.value);
    if (!target) continue;
    if (v.image?.id === target) continue; // already pinned
    updates.push({ id: v.id, mediaId: target });
  }
  return updates;
}

type VariantMediaAssociations = {
  appends: Array<{ variantId: string; mediaIds: string[] }>;
  detaches: Array<{ variantId: string; mediaIds: string[] }>;
  /** Counts pre-totaled for convenient reporting. */
  appendCount: number;
  detachCount: number;
};

/**
 * For each color variant, compute the diff between its current media gallery
 * and the desired one (= every media item that matched its color).
 *
 * Storefront themes typically read `variant.media[]` and, when populated,
 * filter the product gallery to those images — so picking "Bordeaux" only
 * shows the bordeaux shots. Without this association the theme falls back
 * to the product's full media list, leaking other colors into the gallery.
 *
 * Skips variants whose color we couldn't match (e.g. options that aren't
 * Color/Couleur, or sizes-only products) — for those the storefront should
 * still show all media.
 */
function buildVariantMediaAssociations(
  product: ProductFull,
  colorOpt: { optionName: string; values: string[] } | null,
  colorByMediaId: Map<string, string | null>,
): VariantMediaAssociations {
  const empty: VariantMediaAssociations = {
    appends: [],
    detaches: [],
    appendCount: 0,
    detachCount: 0,
  };
  if (!colorOpt) return empty;

  // Group product media ids by color so we can look them up per variant.
  const idsByColor = new Map<string, Set<string>>();
  for (const [mediaId, color] of colorByMediaId) {
    if (!color) continue;
    let set = idsByColor.get(color);
    if (!set) {
      set = new Set();
      idsByColor.set(color, set);
    }
    set.add(mediaId);
  }

  const appends: Array<{ variantId: string; mediaIds: string[] }> = [];
  const detaches: Array<{ variantId: string; mediaIds: string[] }> = [];
  let appendCount = 0;
  let detachCount = 0;

  for (const v of product.variants.nodes) {
    const sel = v.selectedOptions.find((o) => o.name === colorOpt.optionName);
    if (!sel) continue;
    // Default to an empty desired set so variants whose color produced no
    // media still have their stale wrong-color associations cleared. The
    // earlier `continue` here meant a leftover Bordeaux→Creme-image link
    // would survive a restart even though the rename should have undone it.
    const desired = idsByColor.get(sel.value) ?? new Set<string>();
    const current = new Set((v.media?.nodes ?? []).map((n) => n.id));

    const toAppend: string[] = [];
    for (const id of desired) {
      if (!current.has(id)) toAppend.push(id);
    }
    const toDetach: string[] = [];
    for (const id of current) {
      if (!desired.has(id)) toDetach.push(id);
    }

    if (toAppend.length > 0) {
      appends.push({ variantId: v.id, mediaIds: toAppend });
      appendCount += toAppend.length;
    }
    if (toDetach.length > 0) {
      detaches.push({ variantId: v.id, mediaIds: toDetach });
      detachCount += toDetach.length;
    }
  }

  return { appends, detaches, appendCount, detachCount };
}

/**
 * Identify media on the product that should be deleted outright.
 *
 * Today we only target true filename duplicates — multiple media items on
 * the same product whose normalized basename is identical (e.g. Shopify
 * silently appended `_2`, `_3` suffixes after a re-import). The lowest-
 * positioned copy is kept, the rest are deleted, so the per-variant gallery
 * stops showing the same shot 3× in a row.
 *
 * We deliberately don't delete media that simply doesn't match any variant
 * color — those can be intentional generic shots (lookbook, packshot, swatch)
 * that the merchant placed on the product on purpose.
 */
function findMediaToDelete(
  product: ProductFull,
): { mediaIdsToDelete: string[]; reasons: Map<string, string> } {
  const seen = new Map<string, string>(); // normalized name → first media id
  const toDelete: string[] = [];
  const reasons = new Map<string, string>();
  for (const m of product.media.nodes) {
    const fname = filenameFor(m);
    if (!fname) continue;
    const key = fname.trim().toLowerCase();
    if (!key) continue;
    const first = seen.get(key);
    if (first === undefined) {
      seen.set(key, m.id);
    } else {
      toDelete.push(m.id);
      reasons.set(m.id, `Duplicate of ${first} (filename "${fname}")`);
    }
  }
  return { mediaIdsToDelete: toDelete, reasons };
}

async function fetchProduct(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<{ ok: true; product: ProductFull } | { ok: false; error: string }> {
  const list = await shopifyGql<{ product: ProductFull | null }>(
    shopHost,
    accessToken,
    LIST_PRODUCT,
    { id: productId, first: MAX_MEDIA_PER_PRODUCT },
  );
  if (!list.ok) return { ok: false, error: list.error };
  if (!list.data.product) return { ok: false, error: "Product not found" };
  return { ok: true, product: list.data.product };
}

async function previewProduct(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<ReorderResult> {
  const fetched = await fetchProduct(shopHost, accessToken, productId);
  if (!fetched.ok) return { product_id: productId, moved: 0, error: fetched.error };
  const product = fetched.product;
  const nodes = product.media?.nodes ?? [];
  const colorOpt = detectColorOption(product);
  if (!colorOpt && product.options.length > 0) {
    // Useful when debugging "why didn't variants get pinned": logs the option names we
    // saw and the candidate colors we extracted from filenames.
    const candidateSamples = nodes
      .slice(0, 3)
      .map((n) => filenameFor(n))
      .filter(Boolean);
    console.log(
      `[reorder] no color option matched product=${productId} options=${JSON.stringify(
        product.options.map((o) => ({ name: o.name, values: o.optionValues.map((v) => v.name) })),
      )} sample_filenames=${JSON.stringify(candidateSamples)}`,
    );
  }
  const { sorted, colorByMediaId, movedCount } = computeProposedOrder(product, colorOpt);

  const current = nodes.map((n, i) => summarize(n, i + 1, colorByMediaId.get(n.id) ?? null));
  const proposed = sorted.map((n, i) => summarize(n, i + 1, colorByMediaId.get(n.id) ?? null));
  const variantUpdates = buildVariantMediaUpdates(product, colorOpt, sorted, colorByMediaId);
  const associations = buildVariantMediaAssociations(product, colorOpt, colorByMediaId);
  const { mediaIdsToDelete } = findMediaToDelete(product);

  return {
    product_id: productId,
    title: product.title,
    moved: movedCount,
    color_option: colorOpt?.optionName ?? null,
    color_values: colorOpt?.values ?? null,
    color_option_source: colorOpt?.source ?? null,
    variant_updates_planned: variantUpdates.length,
    variant_media_appends_planned: associations.appendCount,
    variant_media_detaches_planned: associations.detachCount,
    media_deletions_planned: mediaIdsToDelete.length,
    current,
    proposed,
  };
}

async function applyProduct(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<ReorderResult> {
  let fetched = await fetchProduct(shopHost, accessToken, productId);
  if (!fetched.ok) return { product_id: productId, moved: 0, error: fetched.error };
  let product = fetched.product;
  const nodes = product.media?.nodes ?? [];
  if (nodes.length < 2) {
    return { product_id: productId, title: product.title, moved: 0 };
  }

  // ── Stage 0: clean up duplicate media before any other work ────────────────
  // Doing this first means the reorder/association stages operate on the post-
  // dedup media list, so positions and variant.media[] reflect the final state.
  let mediaDeleted = 0;
  let mediaDeletionsPlanned = 0;
  let deleteError: string | undefined;
  {
    const { mediaIdsToDelete, reasons } = findMediaToDelete(product);
    mediaDeletionsPlanned = mediaIdsToDelete.length;
    if (mediaIdsToDelete.length > 0) {
      console.log(
        `[reorder] product=${productId} deleting ${mediaIdsToDelete.length} duplicate media: ${[...reasons.entries()].slice(0, 5).map(([id, why]) => `${id}=${why}`).join("; ")}`,
      );
      // Shopify accepts up to 100 ids per delete call; chunk to be safe.
      const CHUNK = 100;
      let totalDeleted = 0;
      for (let i = 0; i < mediaIdsToDelete.length; i += CHUNK) {
        const chunk = mediaIdsToDelete.slice(i, i + CHUNK);
        const del = await shopifyGql<{
          productDeleteMedia: {
            deletedMediaIds: string[] | null;
            mediaUserErrors: Array<{ message?: string }>;
          };
        }>(shopHost, accessToken, DELETE_PRODUCT_MEDIA, {
          productId,
          mediaIds: chunk,
        });
        if (!del.ok) {
          deleteError = `media delete: ${del.error}`;
          break;
        }
        const errs = del.data.productDeleteMedia?.mediaUserErrors ?? [];
        if (errs.length) {
          deleteError = `media delete: ${errs[0]?.message || "Shopify rejected delete"}`;
          break;
        }
        totalDeleted += del.data.productDeleteMedia?.deletedMediaIds?.length ?? 0;
      }
      mediaDeleted = totalDeleted;

      // Re-fetch so the rest of the pipeline sees the post-dedup product.
      if (mediaDeleted > 0) {
        const refetched = await fetchProduct(shopHost, accessToken, productId);
        if (refetched.ok) {
          fetched = refetched;
          product = refetched.product;
        }
      }
    }
  }

  const colorOpt = detectColorOption(product);
  const { sorted, colorByMediaId, movedCount } = computeProposedOrder(product, colorOpt);
  const variantUpdates = buildVariantMediaUpdates(product, colorOpt, sorted, colorByMediaId);
  const associations = buildVariantMediaAssociations(product, colorOpt, colorByMediaId);

  // Reorder product-level media first so productVariantsBulkUpdate can pin existing
  // media as the variant image.
  if (movedCount > 0) {
    const moves = sorted.map((n, i) => ({ id: n.id, newPosition: String(i + 1) }));
    const reorder = await shopifyGql<{
      productReorderMedia: {
        job: { id: string } | null;
        mediaUserErrors: Array<{ message?: string }>;
      };
    }>(shopHost, accessToken, REORDER_PRODUCT_MEDIA, { id: productId, moves });
    if (!reorder.ok) {
      return {
        product_id: productId,
        title: product.title,
        moved: 0,
        error: reorder.error,
      };
    }
    const errs = reorder.data.productReorderMedia?.mediaUserErrors ?? [];
    if (errs.length) {
      return {
        product_id: productId,
        title: product.title,
        moved: 0,
        error: errs[0]?.message || "Shopify rejected reorder",
      };
    }
  }

  // Variant featured-image association: the storefront swaps to this image when its
  // color is selected. Errors here don't roll back the reorder — we report them.
  let variantsUpdated = 0;
  let variantError: string | undefined;
  if (variantUpdates.length > 0) {
    const upd = await shopifyGql<{
      productVariantsBulkUpdate: {
        productVariants: Array<{ id: string }>;
        userErrors: Array<{ message?: string }>;
      };
    }>(shopHost, accessToken, VARIANTS_BULK_UPDATE, {
      productId,
      variants: variantUpdates,
    });
    if (!upd.ok) {
      variantError = `variant update: ${upd.error}`;
    } else {
      const errs = upd.data.productVariantsBulkUpdate?.userErrors ?? [];
      if (errs.length) {
        variantError = `variant update: ${errs[0]?.message || "Shopify rejected variant update"}`;
      } else {
        variantsUpdated = upd.data.productVariantsBulkUpdate?.productVariants?.length ?? 0;
      }
    }
  }

  // Per-variant gallery association. Detach wrong-color media first so the
  // append's order is what the storefront actually displays. Errors here
  // don't roll back upstream work — they're reported in the result.
  let variantMediaDetached = 0;
  let variantMediaAppended = 0;
  if (associations.detaches.length > 0) {
    const det = await shopifyGql<{
      productVariantDetachMedia: {
        productVariants: Array<{ id: string }>;
        userErrors: Array<{ message?: string }>;
      };
    }>(shopHost, accessToken, VARIANT_DETACH_MEDIA, {
      productId,
      variantMedia: associations.detaches,
    });
    if (!det.ok) {
      variantError = appendErr(variantError, `variant detach: ${det.error}`);
    } else {
      const errs = det.data.productVariantDetachMedia?.userErrors ?? [];
      if (errs.length) {
        variantError = appendErr(
          variantError,
          `variant detach: ${errs[0]?.message || "Shopify rejected detach"}`,
        );
      } else {
        variantMediaDetached = associations.detachCount;
      }
    }
  }
  if (associations.appends.length > 0) {
    const app = await shopifyGql<{
      productVariantAppendMedia: {
        productVariants: Array<{ id: string }>;
        userErrors: Array<{ message?: string }>;
      };
    }>(shopHost, accessToken, VARIANT_APPEND_MEDIA, {
      productId,
      variantMedia: associations.appends,
    });
    if (!app.ok) {
      variantError = appendErr(variantError, `variant append: ${app.error}`);
    } else {
      const errs = app.data.productVariantAppendMedia?.userErrors ?? [];
      if (errs.length) {
        variantError = appendErr(
          variantError,
          `variant append: ${errs[0]?.message || "Shopify rejected append"}`,
        );
      } else {
        variantMediaAppended = associations.appendCount;
      }
    }
  }

  return {
    product_id: productId,
    title: product.title,
    moved: movedCount,
    color_option: colorOpt?.optionName ?? null,
    color_values: colorOpt?.values ?? null,
    color_option_source: colorOpt?.source ?? null,
    variants_updated: variantsUpdated,
    variant_updates_planned: variantUpdates.length,
    variant_media_appended: variantMediaAppended,
    variant_media_appends_planned: associations.appendCount,
    variant_media_detached: variantMediaDetached,
    variant_media_detaches_planned: associations.detachCount,
    media_deleted: mediaDeleted,
    media_deletions_planned: mediaDeletionsPlanned,
    error: deleteError && variantError
      ? appendErr(deleteError, variantError)
      : (deleteError ?? variantError),
  };
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

  // Internal callers (other edge functions) present the service-role key in a custom
  // header and skip user-JWT + membership checks. The kickoff that authorized the
  // upstream call already verified the brand owner / brand_user.
  const internalAuth = req.headers.get(INTERNAL_HEADER);
  const isInternal = internalAuth !== null && internalAuth === serviceKey;

  let userId: string | null = null;
  if (!isInternal) {
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
    userId = user.id;
  }

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

  if (!isInternal) {
    const { data: brand } = await admin
      .from("brands")
      .select("id, user_id")
      .eq("id", brandId)
      .maybeSingle();
    if (!brand) return json({ error: "Brand not found" }, 404);
    let allowed = (brand as { user_id?: string }).user_id === userId;
    if (!allowed) {
      const { data: memberRow } = await admin
        .from("brand_users")
        .select("id")
        .eq("brand_id", brandId)
        .eq("auth_user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      allowed = Boolean(memberRow);
    }
    if (!allowed) return json({ error: "Not allowed for this brand" }, 403);
  }

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

  // Paginate so a >1000-image import isn't truncated by the PostgREST cap —
  // otherwise products whose rows fall past the cap wouldn't get reordered.
  const PAGE = 1000;
  const productIdSet = new Set<string>();
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error: rowsErr } = await admin
      .from("shopify_import_images")
      .select("shopify_product_id")
      .eq("import_id", importId)
      .not("shopify_product_id", "is", null)
      .range(from, from + PAGE - 1);
    if (rowsErr) return json({ error: rowsErr.message }, 500);
    const batch = rows ?? [];
    for (const r of batch) {
      const v = (r as { shopify_product_id: string | null }).shopify_product_id;
      if (typeof v === "string" && v.length > 0) productIdSet.add(v);
    }
    if (batch.length < PAGE) break;
  }
  const productIds = Array.from(productIdSet);
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
  const totalVariantsPinned = results.reduce(
    (acc, r) => acc + (r.variants_updated ?? 0),
    0,
  );
  const totalVariantMediaAppended = results.reduce(
    (acc, r) => acc + (r.variant_media_appended ?? 0),
    0,
  );
  const totalVariantMediaDetached = results.reduce(
    (acc, r) => acc + (r.variant_media_detached ?? 0),
    0,
  );
  const totalMediaDeleted = results.reduce(
    (acc, r) => acc + (r.media_deleted ?? 0),
    0,
  );
  const failed = results.filter((r) => r.error).length;
  console.log(
    `[shopify-product-media-reorder] done import=${importId} dry_run=${dryRun} moved=${totalMoved} variants_pinned=${totalVariantsPinned} variant_media_appended=${totalVariantMediaAppended} variant_media_detached=${totalVariantMediaDetached} media_deleted=${totalMediaDeleted} failed=${failed}`,
  );

  // Persist reorder summary on the import row so the UI can show the checklist
  // phase. Skipped on dry runs (those are previews, not state changes). Wrapped
  // in try/catch so this doesn't break the response if the migration that adds
  // these columns hasn't been applied yet.
  if (!dryRun) {
    try {
      const finalStatus = failed === productIds.length && productIds.length > 0
        ? "failed"
        : "completed";
      const summary = {
        processed: productIds.length,
        moved: totalMoved,
        variants_pinned: totalVariantsPinned,
        variant_media_appended: totalVariantMediaAppended,
        variant_media_detached: totalVariantMediaDetached,
        media_deleted: totalMediaDeleted,
        failed,
        errors: results
          .filter((r) => r.error)
          .map((r) => ({ product_id: r.product_id, error: r.error }))
          .slice(0, 20),
      };
      await admin
        .from("shopify_imports")
        .update({
          reorder_status: finalStatus,
          reorder_summary: summary,
          reorder_completed_at: new Date().toISOString(),
        })
        .eq("id", importId);
    } catch (e) {
      console.warn(
        `[shopify-product-media-reorder] could not persist reorder summary: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  return json({
    ok: true,
    dry_run: dryRun,
    processed: productIds.length,
    results,
  });
});
