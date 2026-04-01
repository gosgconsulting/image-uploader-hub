import { supabase } from "@/integrations/supabase/client";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";

export async function fetchShopifyCredential(
  shopDomain: string
): Promise<{ access_token: string } | null> {
  const domain = normalizeShopDomain(shopDomain);
  if (!domain) return null;

  const { data, error } = await supabase
    .from("shopify_credentials")
    .select("access_token")
    .eq("shop_domain", domain)
    .maybeSingle();

  if (error || !data?.access_token) return null;
  return { access_token: data.access_token };
}

export async function upsertShopifyCredential(
  shopDomain: string,
  accessToken: string
): Promise<{ error: Error | null }> {
  const domain = normalizeShopDomain(shopDomain);
  if (!domain || !accessToken.trim()) {
    return { error: new Error("Shop domain and access token are required") };
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user) {
    return { error: new Error("You must be signed in to save Shopify credentials") };
  }

  const { error } = await supabase.from("shopify_credentials").upsert(
    {
      user_id: session.user.id,
      shop_domain: domain,
      access_token: accessToken.trim(),
    },
    { onConflict: "user_id,shop_domain" }
  );

  return { error: error ? new Error(error.message) : null };
}
