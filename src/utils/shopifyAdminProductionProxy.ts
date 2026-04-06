import { supabase } from "@/integrations/supabase/client";

type ShopifyAdminGetOk = {
  shopifyStatus: number;
  body: Record<string, unknown>;
};

function parseShopifyAdminGetPayload(
  data: unknown
): ShopifyAdminGetOk | { error: string } {
  if (!data || typeof data !== "object") {
    return { error: "Invalid response from server" };
  }
  const o = data as Record<string, unknown>;
  if (typeof o.error === "string" && typeof o.shopifyStatus !== "number") {
    return { error: o.error };
  }
  if (
    typeof o.shopifyStatus === "number" &&
    o.body !== undefined &&
    typeof o.body === "object" &&
    o.body !== null
  ) {
    return { shopifyStatus: o.shopifyStatus, body: o.body as Record<string, unknown> };
  }
  return { error: "Invalid response from server" };
}

/**
 * Production: Shopify Admin API has no browser CORS; call via Edge Function.
 * Dev continues to use the same-origin Vite proxy (`/shopify-proxy/...`) in callers.
 */
export async function adminGetViaProductionProxy(body: {
  shopDomain: string;
  kind: "shop" | "order";
  orderNumericId?: string;
  adminAccessToken?: string;
}): Promise<{ ok: true } & ShopifyAdminGetOk | { ok: false; error: string }> {
  const { data, error } = await supabase.functions.invoke<Record<string, unknown>>(
    "shopify-admin-get",
    { body }
  );
  if (error) {
    return { ok: false, error: error.message };
  }
  const parsed = parseShopifyAdminGetPayload(data);
  if ("error" in parsed) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, ...parsed };
}
