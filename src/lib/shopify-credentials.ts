import { supabase } from "@/integrations/supabase/client";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { isShopifyOAuthEnabled } from "@/lib/shopifyOAuth";

/** Opt-in: default false when unset (missing Vite env key). */
export function parseSaveShopifyCredentialsEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const lower = String(raw).toLowerCase().trim();
  return ["true", "1", "yes", "on"].includes(lower);
}

/**
 * When true (`VITE_SAVE_SHOPIFY_CREDENTIALS`), the app reads/writes `shopify_credentials`.
 * Default: off (tokens stay in the browser only unless explicitly enabled).
 */
export function isShopifyCredentialsSupabasePersistenceEnabled(): boolean {
  return parseSaveShopifyCredentialsEnv(import.meta.env.VITE_SAVE_SHOPIFY_CREDENTIALS);
}

/** Read tokens written by OAuth claim or manual save (RLS: own rows only). */
function shouldLoadShopifyCredentialsFromSupabase(): boolean {
  return (
    isShopifyCredentialsSupabasePersistenceEnabled() || isShopifyOAuthEnabled()
  );
}

/**
 * True when we have a *.myshopify.com hostname and a non-empty Admin token (from Supabase hydrate or localStorage).
 * Does not verify the token with Shopify — only that credentials are present for this session.
 */
export function hasShopifyAdminCredentials(shop: string, adminAccessToken: string): boolean {
  const domain = normalizeShopDomain(shop.trim());
  if (!domain.endsWith(".myshopify.com")) return false;
  return Boolean(adminAccessToken?.trim());
}

export async function fetchShopifyCredential(
  shopDomain: string
): Promise<{ access_token: string; id: string } | null> {
  if (!shouldLoadShopifyCredentialsFromSupabase()) return null;

  const domain = normalizeShopDomain(shopDomain);
  if (!domain) return null;

  const { data, error } = await supabase
    .from("shopify_credentials")
    .select("id, access_token")
    .eq("shop_domain", domain)
    .maybeSingle();

  if (error || !data?.access_token || !data.id) return null;
  return { access_token: data.access_token, id: data.id };
}

export async function upsertShopifyCredential(
  shopDomain: string,
  accessToken: string
): Promise<{ error: Error | null; credentialId?: string }> {
  if (!isShopifyCredentialsSupabasePersistenceEnabled()) {
    return { error: null, credentialId: undefined };
  }

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

  const { data, error } = await supabase
    .from("shopify_credentials")
    .upsert(
      {
        user_id: session.user.id,
        shop_domain: domain,
        access_token: accessToken.trim(),
      },
      { onConflict: "user_id,shop_domain" }
    )
    .select("id")
    .single();

  return {
    error: error ? new Error(error.message) : null,
    credentialId: data?.id ? String(data.id) : undefined,
  };
}
