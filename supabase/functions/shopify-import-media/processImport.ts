import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import {
  groupSortedByProductId,
  type ProductImageRow,
} from "./groupAndSortProducts.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MEDIA_BATCH = 20;
// Tiny gap between Shopify mutations to stay polite to the rate limiter.
const INTER_BATCH_DELAY_MS = 250;

const ADD_PRODUCT_MEDIA = `mutation AddProductImages($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media {
      id
      alt
      status
    }
    mediaUserErrors {
      field
      message
    }
  }
}`;

// For dedup: pull every existing media on a product, including its processing
// status. Shopify's productCreateMedia is async — after a successful mutation
// the media goes through PROCESSING → READY (or FAILED if the source URL was
// unreachable, the file was too large, etc.). A draft product whose media
// shows "Le traitement du support multimédia a échoué" has FAILED items, but
// our previous dedup treated those as a hit and skipped re-uploading them on
// the next send. We now skip non-READY items so the next push actually
// re-tries the upload.
const LIST_PRODUCT_MEDIA_DETAIL = `query ListProductMediaDetail($id: ID!, $cursor: String) {
  product(id: $id) {
    id
    media(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        alt
        status
        mediaErrors { code details message }
        ... on MediaImage { image { url } }
      }
    }
  }
}`;

/** Tail of `productCreateMedia` — used to verify status and surface processing errors. */
const QUERY_MEDIA_BY_IDS = `query NodesById($ids: [ID!]!) {
  nodes(ids: $ids) {
    id
    ... on Media {
      status
      mediaErrors { code details message }
    }
  }
}`;

/**
 * Normalize a filename for case-insensitive matching: lowercase, trimmed, and
 * percent-decoded (Shopify CDN URLs encode non-ASCII characters).
 */
function normalizeFilename(name: string): string {
  let n = name.trim();
  try {
    n = decodeURIComponent(n);
  } catch {
    /* leave as-is if it isn't valid percent-encoding */
  }
  return n.toLowerCase();
}

/**
 * Reduce an existing-media descriptor down to a normalized filename key suitable
 * for matching against an incoming upload. Tries the alt text first (we set alt
 * to "<productName> - <filename>" on upload), falls back to the storage URL's
 * basename. Returns null when nothing usable is present.
 */
function existingMediaKey(node: {
  alt: string | null;
  image?: { url: string } | null;
}): string | null {
  // Prefer alt's trailing filename segment if it has an extension; that's what
  // we control on upload and round-trips cleanly.
  if (node.alt) {
    const parts = node.alt.split(" - ");
    const last = parts[parts.length - 1].trim();
    if (/\.[A-Za-z0-9]+$/.test(last)) return normalizeFilename(last);
  }
  if (node.image?.url) {
    const filename = node.image.url.split("/").pop()?.split("?")[0];
    if (filename) return normalizeFilename(filename);
  }
  return null;
}

/**
 * Fetch the current set of existing media on a product as a `filename → media_id`
 * map. Used by both append and replace (= restart) modes to skip duplicates so
 * re-uploading the same drop doesn't double the gallery — the auto-reorder pass
 * runs afterwards regardless. Recording the matching `media_id` back onto the
 * skipped row lets the rollback flow target the right Shopify media later.
 */
async function fetchExistingFilenameMap(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<
  | {
      ok: true;
      /** Filename → media_id for READY media (i.e. real, processed images). */
      map: Map<string, string>;
      /** Filename → media_id for FAILED media. The dedup pass deletes these before re-uploading the same filename so we don't pile up zombie copies. */
      failedMap: Map<string, string>;
    }
  | { ok: false; error: string }
> {
  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  const map = new Map<string, string>();
  const failedMap = new Map<string, string>();
  let cursor: string | null = null;
  for (;;) {
    let raw: {
      errors?: Array<{ message?: string }>;
      data?: {
        product?: {
          media?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            nodes?: Array<{
              id?: string;
              alt?: string | null;
              status?: string | null;
              image?: { url?: string } | null;
            }>;
          };
        };
      };
    };
    try {
      const r = await fetch(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: LIST_PRODUCT_MEDIA_DETAIL,
          variables: { id: productId, cursor },
        }),
      });
      raw = await r.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, error: msg };
    }
    if (raw.errors?.length) {
      return { ok: false, error: raw.errors[0]?.message || "GraphQL error" };
    }
    const page = raw.data?.product?.media;
    for (const n of page?.nodes ?? []) {
      const key = existingMediaKey({
        alt: n.alt ?? null,
        image: n.image?.url ? { url: n.image.url } : null,
      });
      if (!key || !n.id) continue;
      // READY  → real image, dedup-skip on filename match.
      // FAILED → broken stub the merchant sees as red banner; track separately
      //          so the dedup pass can delete it before re-uploading.
      // PROCESSING / UPLOADED / unknown → still in flight; ignore (next pass
      //          will re-evaluate when status settles).
      if (n.status === "FAILED") {
        if (!failedMap.has(key)) failedMap.set(key, n.id);
      } else if (!n.status || n.status === "READY") {
        if (!map.has(key)) map.set(key, n.id);
      }
    }
    if (!page?.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
    cursor = page.pageInfo.endCursor;
  }
  return { ok: true, map, failedMap };
}

/**
 * Verify that media we just created actually finished processing on Shopify's
 * side. `productCreateMedia` returns immediately with an id even though the
 * file is still being downloaded from `originalSource` — and a few seconds
 * later it can flip to FAILED (broken URL, oversized, format Shopify can't
 * process). The mutation never tells us, so without this poll our DB happily
 * records `succeeded` for media that the merchant sees as a red error banner.
 *
 * Returns the post-processing status for each id, or `null` when Shopify
 * never returned the id (deleted between request and verify).
 */
async function verifyMediaStatus(
  shopHost: string,
  accessToken: string,
  mediaIds: string[],
): Promise<
  Map<string, { status: "READY" | "PROCESSING" | "FAILED" | "UPLOADED" | "UNKNOWN"; error?: string }>
> {
  const out = new Map<
    string,
    { status: "READY" | "PROCESSING" | "FAILED" | "UPLOADED" | "UNKNOWN"; error?: string }
  >();
  if (mediaIds.length === 0) return out;

  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  // Poll up to 4 times: Shopify usually finishes a JPEG in <2s; bigger sources
  // can take longer. We give up at ~15s and let the next send re-verify if
  // anything is still PROCESSING.
  const DELAYS_MS = [2000, 3000, 4000, 6000];
  let pending = [...mediaIds];

  for (let attempt = 0; attempt < DELAYS_MS.length && pending.length > 0; attempt += 1) {
    await new Promise((r) => setTimeout(r, DELAYS_MS[attempt]));

    let raw: {
      errors?: Array<{ message?: string }>;
      data?: {
        nodes?: Array<{
          id?: string;
          status?: string;
          mediaErrors?: Array<{ code?: string; details?: string; message?: string }>;
        } | null>;
      };
    };
    try {
      const r = await fetch(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: QUERY_MEDIA_BY_IDS, variables: { ids: pending } }),
      });
      raw = await r.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      console.warn(
        `[shopify-import-media] verify attempt ${attempt + 1} fetch failed: ${msg}`,
      );
      continue;
    }
    if (raw.errors?.length) {
      console.warn(
        `[shopify-import-media] verify attempt ${attempt + 1} graphql error: ${raw.errors[0]?.message}`,
      );
      continue;
    }

    const nextPending: string[] = [];
    const nodes = raw.data?.nodes ?? [];
    const byId = new Map<string, (typeof nodes)[number]>();
    for (const n of nodes) {
      if (n?.id) byId.set(n.id, n);
    }

    for (const id of pending) {
      const n = byId.get(id);
      if (!n) {
        out.set(id, { status: "UNKNOWN", error: "Node not found on Shopify" });
        continue;
      }
      const status = (n.status ?? "UNKNOWN") as
        | "READY"
        | "PROCESSING"
        | "FAILED"
        | "UPLOADED"
        | "UNKNOWN";
      if (status === "READY") {
        out.set(id, { status });
      } else if (status === "FAILED") {
        const errMsg =
          n.mediaErrors?.[0]?.message ||
          n.mediaErrors?.[0]?.details ||
          n.mediaErrors?.[0]?.code ||
          "Shopify rejected the media";
        out.set(id, { status, error: errMsg });
      } else {
        // PROCESSING / UPLOADED / UNKNOWN — keep polling.
        nextPending.push(id);
      }
    }
    pending = nextPending;
  }

  // Anything still pending after all polls is recorded as PROCESSING so the
  // next dedup pass (which skips non-READY) re-uploads it if it stays stuck.
  for (const id of pending) {
    out.set(id, { status: "PROCESSING" });
  }
  return out;
}

/**
 * Replace-mode wipe: delete every product media whose normalized filename is
 * NOT in the import's expected set. This gives "Restart from scratch" true
 * end-state-equals-imported-set semantics, so stale photos from prior runs
 * (including wrong-color images that linger and leak into the wrong variant
 * gallery on themes that fall back to product.media when variant.media is
 * empty) get cleaned up before we re-upload.
 *
 * Errors are returned, never thrown — the caller logs and continues so a
 * single product's wipe failure doesn't abort the whole import.
 */
const DELETE_PRODUCT_MEDIA = `mutation DeleteProductMedia($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    mediaUserErrors { field message }
  }
}`;

async function wipeNonImportedProductMedia(
  shopHost: string,
  accessToken: string,
  productId: string,
  expectedFilenames: Set<string>,
): Promise<{ deleted: number; error?: string }> {
  const existing = await fetchExistingFilenameMap(
    shopHost,
    accessToken,
    productId,
  );
  if (!existing.ok) return { deleted: 0, error: existing.error };

  const toDelete: string[] = [];
  for (const [fname, mediaId] of existing.map) {
    if (!expectedFilenames.has(fname)) toDelete.push(mediaId);
  }
  // Replace mode also flushes every FAILED media stub. They're broken and the
  // dedup pass will recreate the ones whose filenames are in the import.
  for (const [, mediaId] of existing.failedMap) {
    toDelete.push(mediaId);
  }
  if (toDelete.length === 0) return { deleted: 0 };

  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  const CHUNK = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const mediaIds = toDelete.slice(i, i + CHUNK);
    let raw: {
      errors?: Array<{ message?: string }>;
      data?: {
        productDeleteMedia?: {
          deletedMediaIds?: string[] | null;
          mediaUserErrors?: Array<{ message?: string }>;
        };
      };
    };
    try {
      const r = await fetch(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: DELETE_PRODUCT_MEDIA,
          variables: { productId, mediaIds },
        }),
      });
      raw = await r.json();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { deleted, error: msg };
    }
    if (raw.errors?.length) {
      return { deleted, error: raw.errors[0]?.message || "GraphQL error" };
    }
    const userErrors = raw.data?.productDeleteMedia?.mediaUserErrors ?? [];
    if (userErrors.length) {
      return {
        deleted,
        error: userErrors[0]?.message || "Shopify rejected delete",
      };
    }
    deleted += raw.data?.productDeleteMedia?.deletedMediaIds?.length ?? 0;
  }
  return { deleted };
}

interface BatchInput {
  mediaContentType: "IMAGE";
  originalSource: string;
  alt: string;
}

interface ImportImageRow {
  id: string;
  file_name: string;
  file_url: string;
  shopify_product_id: string | null;
  shopify_product_name: string | null;
  status: string;
}

type GqlResponse = {
  errors?: unknown;
  data?: {
    productCreateMedia?: {
      media?: Array<{ id?: string }>;
      mediaUserErrors?: Array<{ field?: string[] | null; message?: string }>;
    };
  };
};

async function postShopifyBatch(
  shopHost: string,
  accessToken: string,
  productId: string,
  inputs: BatchInput[],
): Promise<{ ok: true; mediaIds: Array<string | null> } | { ok: false; error: string }> {
  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  let raw: GqlResponse;
  try {
    const shopRes = await fetch(gqlUrl, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: ADD_PRODUCT_MEDIA,
        variables: { productId, media: inputs },
      }),
    });
    raw = (await shopRes.json()) as GqlResponse;
    if (!shopRes.ok) {
      const msg =
        typeof raw.errors !== "undefined"
          ? JSON.stringify(raw.errors)
          : `Shopify HTTP ${shopRes.status}`;
      return { ok: false, error: msg };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: `Shopify request failed: ${msg}` };
  }

  if (Array.isArray(raw.errors) && raw.errors.length > 0) {
    return { ok: false, error: `GraphQL: ${JSON.stringify(raw.errors)}` };
  }

  const userErrors = raw.data?.productCreateMedia?.mediaUserErrors ?? [];
  if (userErrors.length > 0) {
    const first = userErrors[0]?.message ?? JSON.stringify(userErrors);
    return { ok: false, error: first };
  }

  const media = raw.data?.productCreateMedia?.media ?? [];
  const mediaIds: Array<string | null> = inputs.map((_, i) => media[i]?.id ?? null);
  return { ok: true, mediaIds };
}

/**
 * Stage 1 (sync): record per-image product mapping and clear prior error state so the
 * background pass can pick the rows up. Anything already `succeeded` is left alone for
 * idempotency on retries.
 */
export async function prepareImportImages(
  admin: SupabaseClient,
  importId: string,
  productRows: Array<ProductImageRow & { id: string }>,
  options?: { restart?: boolean },
): Promise<{ pendingCount: number; skippedAlreadyDoneCount: number }> {
  const restart = options?.restart === true;

  // Restart mode: re-process every row regardless of prior status. Skip-vs-upload
  // is then decided per-image by the dedup pass against the live Shopify state,
  // so already-uploaded images are detected as "already on product" rather than
  // being assumed-done from a stale local status.
  let succeededIds: Set<string>;
  if (restart) {
    succeededIds = new Set();
  } else {
    succeededIds = new Set<string>();
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: rows } = await admin
        .from("shopify_import_images")
        .select("id")
        .eq("import_id", importId)
        .eq("status", "succeeded")
        .range(from, from + PAGE - 1);
      const batch = (rows ?? []) as Array<{ id: string }>;
      for (const r of batch) succeededIds.add(r.id);
      if (batch.length < PAGE) break;
    }
  }

  let pendingCount = 0;
  let skippedAlreadyDoneCount = 0;

  await Promise.all(
    productRows.map(async (p) => {
      if (succeededIds.has(p.id)) {
        skippedAlreadyDoneCount += 1;
        return;
      }
      pendingCount += 1;
      // On restart, also clear shopify_media_id — the dedup pass will re-link
      // the row to the matching live media, or upload + record a fresh id.
      const update: Record<string, unknown> = {
        status: "pending",
        shopify_product_id: p.productid,
        shopify_product_name: p.productname ?? null,
        error_message: null,
        started_at: null,
        completed_at: null,
      };
      if (restart) update.shopify_media_id = null;
      await admin.from("shopify_import_images").update(update).eq("id", p.id);
    }),
  );

  return { pendingCount, skippedAlreadyDoneCount };
}

/**
 * Process all images for a single Shopify product (in 20-image Shopify batches). Updates
 * each `import_images` row's status as it goes. Returns the per-image outcome counts.
 *
 * Append mode: never deletes existing Shopify media; the dedup pass just skips
 * filenames already on the product.
 *
 * Replace mode ("Restart from scratch"): wipes every product media whose
 * filename isn't in this import before the dedup pass runs, so any stale media
 * from a prior run is cleared and the post-import auto-reorder rebuilds clean
 * variant galleries. Upstream, `prepareImportImages` already reset every row to
 * `pending` for replace.
 */
async function processOneProduct(
  admin: SupabaseClient,
  shopDomain: string,
  accessToken: string,
  productGid: string,
  rows: ImportImageRow[],
  uploadMode: "append" | "replace",
): Promise<{ succeeded: number; failed: number; skipped: number }> {
  // Sort by filename order using the same heuristic the original synchronous flow used
  // (e.g. `REF-1-front.jpg` before `REF-2-front.jpg`). Using the existing helper avoids
  // duplicating the sort logic.
  const sortInputs = rows.map((r) => ({
    file_name: r.file_name,
    file_url: r.file_url,
    productid: productGid,
    productname: r.shopify_product_name ?? "",
    original_file_name: r.file_name,
  })) as ProductImageRow[];
  const ordered = (
    groupSortedByProductId(sortInputs).get(productGid) ?? []
  ) as ProductImageRow[];

  // Reattach our DB row id by file_url (file_url is unique within an import in practice).
  const idByUrl = new Map<string, string>();
  for (const r of rows) idByUrl.set(r.file_url, r.id);
  let orderedWithIds = ordered
    .map((r) => ({ ...r, id: idByUrl.get(r.file_url) ?? "" }))
    .filter((r) => r.id);

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  // Replace mode: wipe non-imported media before the dedup pass so old/wrong
  // images can't survive. Idempotent — same import set ⇒ same delete decisions.
  if (uploadMode === "replace" && orderedWithIds.length > 0) {
    const expected = new Set<string>();
    for (const r of orderedWithIds) {
      const fname = normalizeFilename(r.original_file_name || r.file_name || "");
      if (fname) expected.add(fname);
    }
    if (expected.size > 0) {
      const wipe = await wipeNonImportedProductMedia(
        shopDomain,
        accessToken,
        productGid,
        expected,
      );
      if (wipe.error) {
        console.warn(
          `[shopify-import-media] product=${productGid} wipe error: ${wipe.error}`,
        );
      } else if (wipe.deleted > 0) {
        console.log(
          `[shopify-import-media] product=${productGid} wiped ${wipe.deleted} non-imported media`,
        );
      }
    }
  }

  // Dedup pass: skip filenames already on the product. The auto-reorder pass that
  // runs after import completion still resequences the gallery, so re-running an
  // import lands correctly without duplicating media. We also record the matched
  // media_id back onto the skipped row so rollback can target it later.
  if (orderedWithIds.length > 0) {
    const existing = await fetchExistingFilenameMap(
      shopDomain,
      accessToken,
      productGid,
    );
    if (existing.ok) {
      // 1. Find FAILED stubs whose filename matches anything in this batch and
      //    delete them. Otherwise the new upload would land alongside the
      //    broken one and the merchant would see two `IMG.jpg` entries with
      //    the same name on the product.
      if (existing.failedMap.size > 0) {
        const failedIdsToDelete: string[] = [];
        for (const r of orderedWithIds) {
          const fname = normalizeFilename(
            r.original_file_name || r.file_name || "",
          );
          const failedId = fname ? existing.failedMap.get(fname) : undefined;
          if (failedId) failedIdsToDelete.push(failedId);
        }
        if (failedIdsToDelete.length > 0) {
          // Reuse the existing wipe mutation pattern (productDeleteMedia,
          // chunked at 100). The tiny inline call here keeps the dedup pass
          // self-contained.
          const gqlUrl = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
          const headers = {
            "X-Shopify-Access-Token": accessToken,
            Accept: "application/json",
            "Content-Type": "application/json",
          } as const;
          const CHUNK = 100;
          for (let i = 0; i < failedIdsToDelete.length; i += CHUNK) {
            const ids = failedIdsToDelete.slice(i, i + CHUNK);
            try {
              await fetch(gqlUrl, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  query: DELETE_PRODUCT_MEDIA,
                  variables: { productId: productGid, mediaIds: ids },
                }),
              });
            } catch (e) {
              console.warn(
                `[shopify-import-media] product=${productGid} could not clean up FAILED stub: ${e instanceof Error ? e.message : String(e)}`,
              );
            }
          }
          console.log(
            `[shopify-import-media] product=${productGid} cleaned up ${failedIdsToDelete.length} FAILED media stub(s) before re-upload`,
          );
        }
      }

      // 2. Skip-link rows that already match a READY (real) media on the product.
      if (existing.map.size > 0) {
        const toSkip: Array<(typeof orderedWithIds)[number] & { mediaId: string }> = [];
        const toUpload: typeof orderedWithIds = [];
        for (const r of orderedWithIds) {
          const fname = normalizeFilename(
            r.original_file_name || r.file_name || "",
          );
          const matchId = fname ? existing.map.get(fname) : undefined;
          if (matchId) toSkip.push({ ...r, mediaId: matchId });
          else toUpload.push(r);
        }
        if (toSkip.length > 0) {
          const completedAt = new Date().toISOString();
          await Promise.all(
            toSkip.map((r) =>
              admin
                .from("shopify_import_images")
                .update({
                  status: "skipped",
                  shopify_media_id: r.mediaId,
                  error_message: "Already on product (filename matched)",
                  completed_at: completedAt,
                  started_at: completedAt,
                })
                .eq("id", r.id),
            ),
          );
          skipped = toSkip.length;
          console.log(
            `[shopify-import-media] product=${productGid} dedup skipped=${skipped} (already on product)`,
          );
        }
        orderedWithIds = toUpload;
      }
    }
    // If the existence check failed (network blip, auth issue) we deliberately fall
    // through and try to upload everything. Worst case: a duplicate row, which the
    // user can clean up via the rollback flow — better than skipping silently.
  }

  for (let i = 0; i < orderedWithIds.length; i += MEDIA_BATCH) {
    const chunk = orderedWithIds.slice(i, i + MEDIA_BATCH);
    const productName =
      chunk.find((r) => (r.productname ?? "").trim() !== "")?.productname ??
      chunk[0]?.file_name ??
      "Product";

    const inputs: BatchInput[] = chunk.map((item) => {
      const fname = item.original_file_name || item.file_name || "image";
      return {
        mediaContentType: "IMAGE",
        originalSource: item.file_url,
        alt: `${productName} - ${fname}`,
      };
    });

    await admin
      .from("shopify_import_images")
      .update({
        status: "uploading",
        started_at: new Date().toISOString(),
      })
      .in(
        "id",
        chunk.map((c) => c.id),
      );

    // Retry on transient errors (THROTTLED rate-limit, network blips, 5xx).
    // Shopify's leaky bucket replenishes at ~50 cost/sec — 1.5s backoff is
    // enough for a single batch to clear without blowing the function timeout.
    const TRANSIENT_RE = /throttl|rate.limit|timeout|temporarily|network|5\d\d\b/i;
    const MAX_ATTEMPTS = 4;
    let batchResult = await postShopifyBatch(shopDomain, accessToken, productGid, inputs);
    for (
      let attempt = 1;
      !batchResult.ok && attempt < MAX_ATTEMPTS && TRANSIENT_RE.test(batchResult.error);
      attempt += 1
    ) {
      const delayMs = 1500 * attempt;
      console.warn(
        `[shopify-import-media] product=${productGid} transient error (attempt ${attempt}/${MAX_ATTEMPTS - 1}), backing off ${delayMs}ms: ${batchResult.error.slice(0, 200)}`,
      );
      await new Promise((r) => setTimeout(r, delayMs));
      batchResult = await postShopifyBatch(shopDomain, accessToken, productGid, inputs);
    }
    const completedAt = new Date().toISOString();

    if (!batchResult.ok) {
      const errMsg = batchResult.error.slice(0, 1000);
      await admin
        .from("shopify_import_images")
        .update({
          status: "failed",
          error_message: errMsg,
          completed_at: completedAt,
        })
        .in(
          "id",
          chunk.map((c) => c.id),
        );
      failed += chunk.length;
    } else {
      // Optimistic write: record media ids + succeeded so the row reflects
      // Shopify's accept. Then verify the actual processing status — if
      // Shopify FAILS the media after the fact (broken source URL, oversized,
      // bad format, etc.) we flip the row to `failed` with the real error.
      await Promise.all(
        chunk.map((item, idx) =>
          admin
            .from("shopify_import_images")
            .update({
              status: "succeeded",
              shopify_media_id: batchResult.mediaIds[idx] ?? null,
              error_message: null,
              completed_at: completedAt,
            })
            .eq("id", item.id),
        ),
      );
      succeeded += chunk.length;

      const mediaIdToRow = new Map<string, (typeof chunk)[number]>();
      for (let idx = 0; idx < chunk.length; idx += 1) {
        const mid = batchResult.mediaIds[idx];
        if (mid) mediaIdToRow.set(mid, chunk[idx]);
      }
      if (mediaIdToRow.size > 0) {
        const verifyMap = await verifyMediaStatus(
          shopDomain,
          accessToken,
          [...mediaIdToRow.keys()],
        );
        const failedUpdates: Array<{ id: string; error: string }> = [];
        for (const [mediaId, info] of verifyMap) {
          if (info.status !== "FAILED") continue;
          const row = mediaIdToRow.get(mediaId);
          if (!row) continue;
          failedUpdates.push({
            id: row.id,
            error: info.error || "Shopify processing failed",
          });
        }
        if (failedUpdates.length > 0) {
          const failedAt = new Date().toISOString();
          await Promise.all(
            failedUpdates.map((u) =>
              admin
                .from("shopify_import_images")
                .update({
                  status: "failed",
                  error_message: `Shopify processing failed: ${u.error}`.slice(0, 1000),
                  completed_at: failedAt,
                })
                .eq("id", u.id),
            ),
          );
          succeeded -= failedUpdates.length;
          failed += failedUpdates.length;
          console.warn(
            `[shopify-import-media] product=${productGid} ${failedUpdates.length} media reported FAILED after upload: ${failedUpdates.map((u) => u.error).slice(0, 3).join(" | ")}`,
          );
        }
      }
    }

    if (i + MEDIA_BATCH < orderedWithIds.length && INTER_BATCH_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
    }
  }

  return { succeeded, failed, skipped };
}

/**
 * Compute and persist the import-level final status from per-image counts.
 */
async function finalizeImport(
  admin: SupabaseClient,
  importId: string,
): Promise<"completed" | "failed" | "partial"> {
  // PostgREST caps un-ranged SELECTs at the project's db-max-rows (1000 by default),
  // so we paginate; otherwise an import with >1000 rows could appear to have no
  // pending rows when it actually does, and finalize too early.
  const PAGE = 1000;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalPending = 0;
  let totalSkipped = 0;
  for (let from = 0; ; from += PAGE) {
    const { data: rows } = await admin
      .from("shopify_import_images")
      .select("status")
      .eq("import_id", importId)
      .range(from, from + PAGE - 1);
    const batch = rows ?? [];
    for (const row of batch) {
      const s = (row as { status: string }).status;
      if (s === "succeeded") totalSucceeded += 1;
      else if (s === "failed") totalFailed += 1;
      else if (s === "pending" || s === "uploading") totalPending += 1;
      else if (s === "skipped") totalSkipped += 1;
    }
    if (batch.length < PAGE) break;
  }

  // Treat skipped as part of "successfully handled" — it isn't an error and doesn't
  // need a retry. An import where every row was skipped (re-running an old drop)
  // should still resolve as `completed`.
  let finalStatus: "completed" | "failed" | "partial" = "completed";
  const totalOk = totalSucceeded + totalSkipped;
  if (totalOk === 0 && totalFailed > 0) finalStatus = "failed";
  else if (totalFailed > 0 || totalPending > 0) finalStatus = "partial";
  else finalStatus = "completed";

  await admin
    .from("shopify_imports")
    .update({ status: finalStatus })
    .eq("id", importId);

  return finalStatus;
}

/**
 * Process the next product that still has pending/uploading images for this import.
 * Returns a flag indicating whether more work remains (so the caller can chain a
 * follow-up self-invocation to keep going).
 *
 * Why one product per invocation: Shopify's `productCreateMedia` is slow when the source
 * URL has to be fetched server-side; total wall-clock for a 500-image import easily
 * exceeds the edge function lifetime. By breaking the work at product boundaries and
 * having each invocation re-invoke the next, no single function instance has to outlive
 * the runtime's wall-clock budget.
 */
export async function processNextProduct(opts: {
  admin: SupabaseClient;
  importId: string;
  shopDomain: string;
  accessToken: string;
}): Promise<{
  done: boolean;
  productGid: string | null;
  succeeded: number;
  failed: number;
  skipped: number;
  remainingProducts: number;
}> {
  const { admin, importId, shopDomain, accessToken } = opts;

  // Read the per-import upload_mode (set on the sync stage). Defaults to 'append' for
  // imports created before this column existed.
  const { data: impRow } = await admin
    .from("shopify_imports")
    .select("upload_mode")
    .eq("id", importId)
    .maybeSingle();
  const uploadMode: "append" | "replace" =
    (impRow as { upload_mode?: string } | null)?.upload_mode === "replace"
      ? "replace"
      : "append";

  // Mark imports.status processing the moment the worker actually starts working — the
  // sync handler only sets `queued`. Idempotent: noop on later invocations.
  await admin
    .from("shopify_imports")
    .update({ status: "processing" })
    .eq("id", importId)
    .in("status", ["queued", "processing"]);

  // Pull all pending/uploading rows for this import. We pick the FIRST product (by GID
  // string sort) and process every image in it; the next call gets the next product.
  // Paginate so a >1000-row import isn't silently truncated by the PostgREST cap —
  // otherwise products whose rows fall past the cap would never be picked up.
  const PAGE = 1000;
  const allPending: ImportImageRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows } = await admin
      .from("shopify_import_images")
      .select(
        "id, file_name, file_url, shopify_product_id, shopify_product_name, status",
      )
      .eq("import_id", importId)
      .in("status", ["pending", "uploading"])
      .not("shopify_product_id", "is", null)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    const batch = (rows ?? []) as ImportImageRow[];
    allPending.push(...batch);
    if (batch.length < PAGE) break;
  }

  if (allPending.length === 0) {
    return {
      done: true,
      productGid: null,
      succeeded: 0,
      failed: 0,
      remainingProducts: 0,
    };
  }

  // Pick a single product to process this turn.
  const firstGid = allPending[0]!.shopify_product_id!;
  const forThisProduct = allPending.filter(
    (r) => r.shopify_product_id === firstGid,
  );

  const distinctProducts = new Set<string>();
  for (const r of allPending) {
    if (r.shopify_product_id) distinctProducts.add(r.shopify_product_id);
  }

  const { succeeded, failed, skipped } = await processOneProduct(
    admin,
    shopDomain,
    accessToken,
    firstGid,
    forThisProduct,
    uploadMode,
  );

  return {
    done: distinctProducts.size <= 1,
    productGid: firstGid,
    succeeded,
    failed,
    skipped,
    remainingProducts: Math.max(0, distinctProducts.size - 1),
  };
}

export { finalizeImport };
