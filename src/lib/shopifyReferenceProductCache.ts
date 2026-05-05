import { supabase } from "@/integrations/supabase/client";

/** How long cached hits / negative lookups stay valid before re-querying Shopify. */
export const REFERENCE_PRODUCT_CACHE_TTL_MS =
  7 * 24 * 60 * 60 * 1000;

const SELECT_CHUNK = 100;
const UPSERT_CHUNK = 100;

export type ReferenceProductCacheRow = {
  reference_parent: string;
  product_id: string | null;
  product_title: string | null;
  verified_at: string;
};

export async function loadReferenceProductCacheRows(
  brandId: string,
  referenceParents: string[],
): Promise<ReferenceProductCacheRow[]> {
  const unique = [...new Set(referenceParents.map((r) => r.trim()).filter(Boolean))];
  if (unique.length === 0) return [];

  const out: ReferenceProductCacheRow[] = [];
  for (let i = 0; i < unique.length; i += SELECT_CHUNK) {
    const chunk = unique.slice(i, i + SELECT_CHUNK);
    const { data, error } = await supabase
      .from("shopify_reference_product_cache")
      .select("reference_parent, product_id, product_title, verified_at")
      .eq("brand_id", brandId.trim())
      .in("reference_parent", chunk);

    if (error) throw error;
    for (const row of data ?? []) {
      out.push(row as ReferenceProductCacheRow);
    }
  }
  return out;
}

export async function upsertReferenceProductCacheRows(
  brandId: string,
  rows: Array<{
    reference_parent: string;
    product_id: string | null;
    product_title: string | null;
  }>,
): Promise<void> {
  if (rows.length === 0) return;

  const bid = brandId.trim();
  const now = new Date().toISOString();
  const payload = rows.map((r) => ({
    brand_id: bid,
    reference_parent: r.reference_parent,
    product_id: r.product_id,
    product_title: r.product_title,
    verified_at: now,
  }));

  for (let i = 0; i < payload.length; i += UPSERT_CHUNK) {
    const { error } = await supabase
      .from("shopify_reference_product_cache")
      .upsert(payload.slice(i, i + UPSERT_CHUNK), {
        onConflict: "brand_id,reference_parent",
      });
    if (error) throw error;
  }
}
