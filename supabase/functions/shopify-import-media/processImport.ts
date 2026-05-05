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
): Promise<{ pendingCount: number; skippedAlreadyDoneCount: number }> {
  const { data: existing } = await admin
    .from("import_images")
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
        .from("import_images")
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
): Promise<{ succeeded: number; failed: number }> {
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
  const orderedWithIds = ordered
    .map((r) => ({ ...r, id: idByUrl.get(r.file_url) ?? "" }))
    .filter((r) => r.id);

  let succeeded = 0;
  let failed = 0;

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
      .from("import_images")
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
        .from("import_images")
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
            .from("import_images")
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

  return { succeeded, failed };
}

/**
 * Compute and persist the import-level final status from per-image counts.
 */
async function finalizeImport(
  admin: SupabaseClient,
  importId: string,
): Promise<"completed" | "failed" | "partial"> {
  const { data: rows } = await admin
    .from("import_images")
    .select("status")
    .eq("import_id", importId);

  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalPending = 0;
  for (const row of rows ?? []) {
    const s = (row as { status: string }).status;
    if (s === "succeeded") totalSucceeded += 1;
    else if (s === "failed") totalFailed += 1;
    else if (s === "pending" || s === "uploading") totalPending += 1;
  }

  let finalStatus: "completed" | "failed" | "partial" = "completed";
  if (totalSucceeded === 0 && totalFailed > 0) finalStatus = "failed";
  else if (totalFailed > 0 || totalPending > 0) finalStatus = "partial";
  else finalStatus = "completed";

  await admin
    .from("imports")
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
  remainingProducts: number;
}> {
  const { admin, importId, shopDomain, accessToken } = opts;

  // Mark imports.status processing the moment the worker actually starts working — the
  // sync handler only sets `queued`. Idempotent: noop on later invocations.
  await admin
    .from("imports")
    .update({ status: "processing" })
    .eq("id", importId)
    .in("status", ["queued", "processing"]);

  // Pull all pending/uploading rows for this import. We pick the FIRST product (by GID
  // string sort) and process every image in it; the next call gets the next product.
  const { data: rows } = await admin
    .from("import_images")
    .select(
      "id, file_name, file_url, shopify_product_id, shopify_product_name, status",
    )
    .eq("import_id", importId)
    .in("status", ["pending", "uploading"])
    .not("shopify_product_id", "is", null)
    .order("created_at", { ascending: true });

  const allPending = (rows ?? []) as ImportImageRow[];

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

  const { succeeded, failed } = await processOneProduct(
    admin,
    shopDomain,
    accessToken,
    firstGid,
    forThisProduct,
  );

  return {
    done: distinctProducts.size <= 1,
    productGid: firstGid,
    succeeded,
    failed,
    remainingProducts: Math.max(0, distinctProducts.size - 1),
  };
}

export { finalizeImport };
