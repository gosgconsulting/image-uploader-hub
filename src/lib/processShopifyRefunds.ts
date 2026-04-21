import { supabase } from "@/integrations/supabase/client";
import { fetchEmbeddedShopifySessionToken } from "@/lib/shopifyEmbeddedSessionToken";

/** Session token for embedded Shopify Admin, otherwise Supabase JWT — same as bulk refund flow. */
export async function resolveRefundAuthBearer(
  embeddedHost: string | null | undefined
): Promise<string | undefined> {
  const host = embeddedHost?.trim() ?? "";
  if (host) {
    const shopifySession = await fetchEmbeddedShopifySessionToken(host);
    if (shopifySession) return shopifySession;
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return undefined;
  // Avoid sending an expired access_token to edge functions (getUser fails → generic 401).
  const expMs =
    typeof session.expires_at === "number" ? session.expires_at * 1000 : 0;
  const stale = expMs > 0 && expMs < Date.now() + 90_000;
  if (stale) {
    const { data } = await supabase.auth.refreshSession();
    return data.session?.access_token ?? session.access_token;
  }
  return session.access_token;
}

export type ProcessRefundItemResult = {
  id: string;
  ok: boolean;
  skipped?: boolean;
  shopifyRefundId?: string;
  error?: string;
};

export type ProcessRefundsResponse = {
  results: ProcessRefundItemResult[];
};

export async function invokeProcessShopifyRefunds(
  shopDomain: string,
  refundIds: string[],
  options?: { authorizationBearer?: string }
): Promise<{ data: ProcessRefundsResponse | null; error: Error | null }> {
  const trimmed = shopDomain.trim();
  if (!trimmed) {
    return { data: null, error: new Error("Shop domain is required") };
  }
  if (refundIds.length === 0) {
    return { data: null, error: new Error("No refunds selected") };
  }

  const bearer = options?.authorizationBearer?.trim();
  const { data, error } = await supabase.functions.invoke<ProcessRefundsResponse>(
    "shopify-create-refund",
    {
      body: { shopDomain: trimmed, refundIds },
      ...(bearer
        ? { headers: { Authorization: `Bearer ${bearer}` } }
        : {}),
    }
  );

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data || !Array.isArray(data.results)) {
    return { data: null, error: new Error("Invalid response from refund function") };
  }
  return { data, error: null };
}
