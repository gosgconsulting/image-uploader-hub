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

/** Prefer a non-expired access token for Edge Function auth (esp. when JWT verification is on). */
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
  const headers = await functionsAuthHeaders();
  const { data, error } = await supabase.functions.invoke<Record<string, unknown>>(
    "shopify-admin-get",
    { body, ...(Object.keys(headers).length ? { headers } : {}) }
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
