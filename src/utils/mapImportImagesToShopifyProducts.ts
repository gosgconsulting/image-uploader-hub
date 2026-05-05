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

export async function mapImportImagesToShopifyProducts(
  shop: string,
  adminAccessToken: string,
  images: ImportImageRow[],
): Promise<{
  filtered: ImageMapProductRow[];
  grouped: ImageMapGroupedProduct[];
  failed: ImageMapFailedRow[];
}> {
  const filtered: ImageMapProductRow[] = [];
  const failed: ImageMapFailedRow[] = [];

  const cache = new Map<
    string,
    Awaited<ReturnType<typeof fetchProductByReferenceParent>>
  >();

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

    let fr = cache.get(ref);
    if (fr === undefined) {
      fr = await fetchProductByReferenceParent(shop, adminAccessToken, ref);
      cache.set(ref, fr);
    }

    if (!fr.ok) {
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
