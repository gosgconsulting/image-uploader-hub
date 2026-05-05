import {
  loadReferenceProductCacheRows,
  REFERENCE_PRODUCT_CACHE_TTL_MS,
  upsertReferenceProductCacheRows,
} from "@/lib/shopifyReferenceProductCache";
import { fetchProductByReferenceParent } from "@/utils/shopifyProductVariantBySku";

export interface ImportImageRow {
  id: string;
  file_name: string;
  file_url: string;
}

/** Same shape as `WebhookProduct` from SendApprovalDialog (kept here to avoid circular imports). */
export interface ImageMapProductRow {
  id: string;
  file_name: string;
  file_url: string;
  productid: string;
  productname: string;
  referenceparent?: string;
  referenceParent?: string;
}

/** Same shape as `FailedMapping`. */
export interface ImageMapFailedRow {
  id: string;
  file_name: string;
  file_url: string;
  referenceParent: string;
  error: string;
}

export interface ImageMapGroupedProduct {
  shopify_product_name: string;
  referenceParent: string;
  productid: string;
  images: { file_name: string; file_url: string }[];
}

type FetchRefResult = Awaited<ReturnType<typeof fetchProductByReferenceParent>>;

function stripExtension(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? fileName;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return base.trim();
  return base.slice(0, dot).trim();
}

/**
 * First token of the filename stem when split on hyphens or whitespace
 * (e.g. `REF-color-1.jpg` → `REF`, `REF front.jpg` → `REF`).
 */
function referenceParentFromFileName(fileName: string): string {
  const stem = stripExtension(fileName);
  if (!stem) return "";
  const first = stem.split(/[\s-]+/)[0]?.trim() ?? "";
  return first;
}

const SHOPIFY_FETCH_CONCURRENCY = 8;

async function fetchRefsFromShopifyInParallel(
  shop: string,
  adminAccessToken: string,
  refs: string[],
): Promise<Map<string, FetchRefResult>> {
  const out = new Map<string, FetchRefResult>();
  for (let i = 0; i < refs.length; i += SHOPIFY_FETCH_CONCURRENCY) {
    const chunk = refs.slice(i, i + SHOPIFY_FETCH_CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (ref) => {
        const fr = await fetchProductByReferenceParent(
          shop,
          adminAccessToken,
          ref,
        );
        return { ref, fr };
      }),
    );
    for (const { ref, fr } of results) {
      out.set(ref, fr);
    }
  }
  return out;
}

export async function mapImportImagesToShopifyProducts(
  shop: string,
  adminAccessToken: string,
  images: ImportImageRow[],
  brandId: string | null,
): Promise<{
  filtered: ImageMapProductRow[];
  grouped: ImageMapGroupedProduct[];
  failed: ImageMapFailedRow[];
}> {
  const filtered: ImageMapProductRow[] = [];
  const failed: ImageMapFailedRow[] = [];

  const refsInOrder: string[] = [];
  const refSet = new Set<string>();
  for (const img of images) {
    const ref = referenceParentFromFileName(img.file_name);
    if (!ref) continue;
    if (!refSet.has(ref)) {
      refSet.add(ref);
      refsInOrder.push(ref);
    }
  }

  const memoryCache = new Map<string, FetchRefResult>();
  const now = Date.now();

  if (brandId?.trim()) {
    try {
      const rows = await loadReferenceProductCacheRows(brandId, refsInOrder);
      const rowByRef = new Map(rows.map((r) => [r.reference_parent, r]));

      for (const ref of refsInOrder) {
        const row = rowByRef.get(ref);
        if (!row) continue;
        const age = now - new Date(row.verified_at).getTime();
        if (age > REFERENCE_PRODUCT_CACHE_TTL_MS) continue;

        if (row.product_id) {
          memoryCache.set(ref, {
            ok: true,
            shopifyStatus: 200,
            hit: {
              productId: row.product_id,
              title: row.product_title ?? "",
            },
          });
        } else {
          memoryCache.set(ref, { ok: true, shopifyStatus: 200, hit: null });
        }
      }
    } catch {
      // If cache read fails, continue with Shopify only (same as no brand).
    }
  }

  const needFetch = refsInOrder.filter((ref) => !memoryCache.has(ref));

  if (needFetch.length > 0) {
    const fetched = await fetchRefsFromShopifyInParallel(
      shop,
      adminAccessToken,
      needFetch,
    );
    for (const [ref, fr] of fetched) {
      memoryCache.set(ref, fr);
    }

    if (brandId?.trim()) {
      const toWrite = needFetch
        .map((ref) => {
          const fr = fetched.get(ref);
          if (!fr?.ok) return null;
          return {
            reference_parent: ref,
            product_id: fr.hit?.productId ?? null,
            product_title: fr.hit?.title ?? null,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      try {
        await upsertReferenceProductCacheRows(brandId.trim(), toWrite);
      } catch {
        // Mapping result is still valid; cache is a performance optimization.
      }
    }
  }

  for (const img of images) {
    const ref = referenceParentFromFileName(img.file_name);

    if (!ref) {
      failed.push({
        id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
        referenceParent: "",
        error:
          "Could not derive reference parent from filename (empty name or stem).",
      });
      continue;
    }

    const fr = memoryCache.get(ref);
    if (!fr) {
      failed.push({
        id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
        referenceParent: ref,
        error: "Internal error: missing resolution for reference parent.",
      });
      continue;
    }

    if (fr.ok === false) {
      failed.push({
        id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
        referenceParent: ref,
        error: fr.error,
      });
      continue;
    }

    if (!fr.hit) {
      failed.push({
        id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
        referenceParent: ref,
        error:
          "No product found on Shopify for metafields.custom.referenceparent matching this filename prefix.",
      });
      continue;
    }

    filtered.push({
      id: img.id,
      file_name: img.file_name,
      file_url: img.file_url,
      productid: fr.hit.productId,
      productname: fr.hit.title,
      referenceparent: ref,
      referenceParent: ref,
    });
  }

  const groupedMap = new Map<string, ImageMapProductRow[]>();
  for (const item of filtered) {
    const key = item.productid;
    if (!groupedMap.has(key)) groupedMap.set(key, []);
    groupedMap.get(key)!.push(item);
  }

  const grouped: ImageMapGroupedProduct[] = Array.from(
    groupedMap.values(),
  ).map((group) => ({
    shopify_product_name: group[0].productname,
    referenceParent:
      group[0].referenceparent ?? group[0].referenceParent ?? "",
    productid: group[0].productid,
    images: group.map((p) => ({
      file_name: p.file_name,
      file_url: p.file_url,
    })),
  }));

  return { filtered, grouped, failed };
}
