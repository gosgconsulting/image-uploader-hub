import { supabase } from "@/integrations/supabase/client";

export type ShopifyImageRef = { id?: string; url: string; alt: string | null };

export type ShopifyProductMedia = {
  title: string | null;
  featured_image: { url: string; alt: string | null } | null;
  gallery: ShopifyImageRef[];
};

export type ShopifyProductMediaMap = Record<string, ShopifyProductMedia>;

export async function fetchShopifyProductMedia(
  brandId: string,
  productIds: string[],
): Promise<{ ok: true; products: ShopifyProductMediaMap } | { ok: false; error: string }> {
  const unique = Array.from(new Set(productIds.map((s) => s.trim()).filter(Boolean)));
  if (unique.length === 0) return { ok: true, products: {} };

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    products?: ShopifyProductMediaMap;
  }>("shopify-product-media", {
    body: { brand_id: brandId, product_ids: unique },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok || !data.products) return { ok: false, error: data?.error ?? "Request failed" };
  return { ok: true, products: data.products };
}
