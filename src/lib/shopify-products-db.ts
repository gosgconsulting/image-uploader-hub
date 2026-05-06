import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type ShopifyProductRow = Tables<"shopify_products">;

export async function fetchShopifyProducts(
  brandId: string | null
): Promise<{ data: ShopifyProductRow[]; error: Error | null }> {
  const id = brandId?.trim() ?? "";
  if (!id) return { data: [], error: null };

  const { data, error } = await supabase
    .from("shopify_products")
    .select("*")
    .eq("brand_id", id)
    .order("title", { ascending: true });

  if (error) return { data: [], error: new Error(error.message) };
  return { data: data ?? [], error: null };
}

export type SyncResult =
  | { ok: true; synced: number; removed: number; pages: number; truncated: boolean }
  | { ok: false; error: string };

async function functionsAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  const expMs = (session.expires_at ?? 0) * 1000;
  if (expMs < Date.now() + 120_000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function syncShopifyProducts(args: {
  brandId: string;
  shopDomain: string;
}): Promise<SyncResult> {
  const headers = await functionsAuthHeaders();
  const { data, error } = await supabase.functions.invoke<Record<string, unknown>>(
    "shopify-products-sync",
    {
      body: { brandId: args.brandId, shopDomain: args.shopDomain },
      ...(Object.keys(headers).length ? { headers } : {}),
    }
  );
  if (error) return { ok: false, error: error.message };
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid response" };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === true) {
    return {
      ok: true,
      synced: Number(o.synced) || 0,
      removed: Number(o.removed) || 0,
      pages: Number(o.pages) || 0,
      truncated: Boolean(o.truncated),
    };
  }
  const errMsg = typeof o.error === "string" ? o.error : "Sync failed";
  return { ok: false, error: errMsg };
}
