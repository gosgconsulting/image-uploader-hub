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

// Replace-mode helpers: list every media id on a product, then delete them. Pagination
// is bounded by Shopify's 250-per-page; we drain the cursor before issuing one batched
// delete. We intentionally do NOT delete in chunks during pagination — collecting all ids
// first means a partial network failure leaves the product mostly intact instead of
// half-deleted.
const LIST_PRODUCT_MEDIA_PAGE = `query ListProductMedia($id: ID!, $cursor: String) {
  product(id: $id) {
    id
    media(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id }
    }
  }
}`;

const DELETE_PRODUCT_MEDIA = `mutation DeleteProductMedia($productId: ID!, $mediaIds: [ID!]!) {
  productDeleteMedia(productId: $productId, mediaIds: $mediaIds) {
    deletedMediaIds
    mediaUserErrors { field message }
  }
}`;

// For append-mode dedup: pull every existing media on a product with enough info
// (alt + image URL) that we can recognize an incoming filename as already there.
const LIST_PRODUCT_MEDIA_DETAIL = `query ListProductMediaDetail($id: ID!, $cursor: String) {
  product(id: $id) {
    id
    media(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        alt
        ... on MediaImage { image { url } }
      }
    }
  }
}`;

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
    if (/\.[A-Za-z0-9]+$/.test(last)) return last.toLowerCase();
  }
  if (node.image?.url) {
    const filename = node.image.url.split("/").pop()?.split("?")[0];
    if (filename) return filename.toLowerCase();
  }
  return null;
}

/**
 * Fetch the current set of filename keys already on a product. Used by
 * append-mode to skip duplicates so re-uploading the same drop doesn't double
 * the gallery; the user still gets a reorder pass over the result.
 */
async function fetchExistingFilenameKeys(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<{ ok: true; keys: Set<string> } | { ok: false; error: string }> {
  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  const keys = new Set<string>();
  let cursor: string | null = null;
  for (;;) {
    let raw: {
      errors?: Array<{ message?: string }>;
      data?: {
        product?: {
          media?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            nodes?: Array<{ id?: string; alt?: string | null; image?: { url?: string } | null }>;
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
      if (key) keys.add(key);
    }
    if (!page?.pageInfo?.hasNextPage || !page.pageInfo.endCursor) break;
    cursor = page.pageInfo.endCursor;
  }
  return { ok: true, keys };
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

async function deleteAllExistingMedia(
  shopHost: string,
  accessToken: string,
  productId: string,
): Promise<{ ok: true; deletedCount: number } | { ok: false; error: string }> {
  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": accessToken,
    Accept: "application/json",
    "Content-Type": "application/json",
  } as const;

  const allMediaIds: string[] = [];
  let cursor: string | null = null;

  // Paginate through every existing media on the product.
  for (;;) {
    let raw: {
      errors?: unknown;
      data?: {
        product?: {
          media?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            nodes?: Array<{ id?: string }>;
          };
        };
      };
    };
    try {
      const r = await fetch(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: LIST_PRODUCT_MEDIA_PAGE,
          variables: { id: productId, cursor },
        }),
      });
      raw = await r.json();
      if (!r.ok) {
        return { ok: false, error: `Shopify HTTP ${r.status}` };
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Network error listing media",
      };
    }

    if (Array.isArray(raw.errors) && raw.errors.length > 0) {
      return { ok: false, error: `GraphQL: ${JSON.stringify(raw.errors)}` };
    }

    const nodes = raw.data?.product?.media?.nodes ?? [];
    for (const n of nodes) if (typeof n.id === "string") allMediaIds.push(n.id);

    const next = raw.data?.product?.media?.pageInfo;
    if (!next?.hasNextPage || !next.endCursor) break;
    cursor = next.endCursor;
  }

  if (allMediaIds.length === 0) return { ok: true, deletedCount: 0 };

  // Shopify accepts up to 100 media ids per delete; chunk to be safe.
  const DELETE_CHUNK = 100;
  let deletedCount = 0;
  for (let i = 0; i < allMediaIds.length; i += DELETE_CHUNK) {
    const chunk = allMediaIds.slice(i, i + DELETE_CHUNK);
    let raw: {
      errors?: unknown;
      data?: {
        productDeleteMedia?: {
          deletedMediaIds?: string[];
          mediaUserErrors?: Array<{ field?: string[] | null; message?: string }>;
        };
      };
    };
    try {
      const r = await fetch(gqlUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          query: DELETE_PRODUCT_MEDIA,
          variables: { productId, mediaIds: chunk },
        }),
      });
      raw = await r.json();
      if (!r.ok) {
        return { ok: false, error: `Shopify delete HTTP ${r.status}` };
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Network error deleting media",
      };
    }

    if (Array.isArray(raw.errors) && raw.errors.length > 0) {
      return { ok: false, error: `GraphQL: ${JSON.stringify(raw.errors)}` };
    }
    const userErrors = raw.data?.productDeleteMedia?.mediaUserErrors ?? [];
    if (userErrors.length > 0) {
      return {
        ok: false,
        error: userErrors[0]?.message ?? JSON.stringify(userErrors),
      };
    }
    deletedCount += raw.data?.productDeleteMedia?.deletedMediaIds?.length ?? 0;
  }

  return { ok: true, deletedCount };
}

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
): Promise<{ pendingCount: number; skippedAlreadyDoneCount: number }> {
  const { data: existing } = await admin
    .from("shopify_import_images")
    .select("id, status")
    .eq("import_id", importId)
    .in("id", productRows.map((p) => p.id));

  const existingById = new Map<string, { status: string }>();
  for (const row of existing ?? []) {
    existingById.set(row.id as string, {
      status: (row as { status: string }).status,
    });
  }

  let pendingCount = 0;
  let skippedAlreadyDoneCount = 0;

  await Promise.all(
    productRows.map(async (p) => {
      const cur = existingById.get(p.id);
      if (cur?.status === "succeeded") {
        skippedAlreadyDoneCount += 1;
        return;
      }
      pendingCount += 1;
      await admin
        .from("shopify_import_images")
        .update({
          status: "pending",
          shopify_product_id: p.productid,
          shopify_product_name: p.productname ?? null,
          error_message: null,
          started_at: null,
          completed_at: null,
        })
        .eq("id", p.id);
    }),
  );

  return { pendingCount, skippedAlreadyDoneCount };
}

/**
 * Process all images for a single Shopify product (in 20-image Shopify batches). Updates
 * each `import_images` row's status as it goes. Returns the per-image outcome counts.
 */
async function processOneProduct(
  admin: SupabaseClient,
  shopDomain: string,
  accessToken: string,
  productGid: string,
  rows: ImportImageRow[],
  uploadMode: "append" | "replace",
): Promise<{ succeeded: number; failed: number; skipped: number }> {
  // Replace mode: nuke every existing media on the product BEFORE we start uploading
  // new ones. We do this once per product (the caller drives one product per
  // continuation), so even on the very first batch the product is already empty.
  if (uploadMode === "replace") {
    const del = await deleteAllExistingMedia(shopDomain, accessToken, productGid);
    if (!del.ok) {
      // Mark every image we were going to upload as failed for this product so the
      // overall import status reflects the problem and the user can retry.
      const errMsg = `Replace failed: ${del.error}`.slice(0, 1000);
      const completedAt = new Date().toISOString();
      await admin
        .from("shopify_import_images")
        .update({
          status: "failed",
          error_message: errMsg,
          completed_at: completedAt,
        })
        .in("id", rows.map((r) => r.id));
      return { succeeded: 0, failed: rows.length, skipped: 0 };
    }
  }

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

  // Append mode: skip filenames that already exist on the product. The auto-reorder
  // pass that runs after import completion will still resequence the gallery, so a
  // re-upload of the same drop ends up correctly ordered without duplicating media.
  if (uploadMode === "append" && orderedWithIds.length > 0) {
    const existing = await fetchExistingFilenameKeys(
      shopDomain,
      accessToken,
      productGid,
    );
    if (existing.ok && existing.keys.size > 0) {
      const toSkip: typeof orderedWithIds = [];
      const toUpload: typeof orderedWithIds = [];
      for (const r of orderedWithIds) {
        const fname = (r.original_file_name || r.file_name || "").toLowerCase();
        if (fname && existing.keys.has(fname)) toSkip.push(r);
        else toUpload.push(r);
      }
      if (toSkip.length > 0) {
        const completedAt = new Date().toISOString();
        await admin
          .from("shopify_import_images")
          .update({
            status: "skipped",
            error_message: null,
            completed_at: completedAt,
            started_at: completedAt,
          })
          .in("id", toSkip.map((r) => r.id));
        skipped = toSkip.length;
      }
      orderedWithIds = toUpload;
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

    const batchResult = await postShopifyBatch(shopDomain, accessToken, productGid, inputs);
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
