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

/**
 * When false, `fetchShopifyCredentialForBrand` does not query Supabase (env disables reads).
 * Hydration must not treat a null fetch as “no credentials” or it will wipe IDs set by OAuth claim.
 */
export function shouldLoadShopifyCredentialsFromSupabase(): boolean {
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

export async function fetchShopifyCredentialForBrand(
  brandId: string
): Promise<{ access_token: string; id: string; shop_domain: string } | null> {
  if (!shouldLoadShopifyCredentialsFromSupabase()) return null;
  if (!brandId.trim()) return null;

  const { data, error } = await supabase
    .from("shopify_credentials")
    .select("id, access_token, shop_domain")
    .eq("brand_id", brandId.trim())
    .maybeSingle();

  if (error || !data?.access_token || !data.id || !data.shop_domain) return null;
  return {
    access_token: data.access_token,
    id: data.id,
    shop_domain: data.shop_domain,
  };
}

/**
 * Shopify domain + Admin token for client-side API calls (e.g. image import mapping).
 * Prefers Supabase-stored credentials for the brand when enabled, otherwise localStorage.
 */
export async function resolveShopifyAdminForMapping(
  brandId: string | null,
): Promise<{ shop: string; token: string } | null> {
  if (brandId?.trim() && shouldLoadShopifyCredentialsFromSupabase()) {
    const row = await fetchShopifyCredentialForBrand(brandId);
    if (row && hasShopifyAdminCredentials(row.shop_domain, row.access_token)) {
      return { shop: row.shop_domain, token: row.access_token };
    }
  }

  const fromLsShop = localStorage.getItem("shopify_shop")?.trim() ?? "";
  const fromLsToken = localStorage.getItem("shopify_admin_token")?.trim() ?? "";
  if (hasShopifyAdminCredentials(fromLsShop, fromLsToken)) {
    return { shop: fromLsShop, token: fromLsToken };
  }
  return null;
}

export async function upsertShopifyCredential(
  shopDomain: string,
  accessToken: string,
  brandId: string
): Promise<{ error: Error | null; credentialId?: string }> {
  if (!isShopifyCredentialsSupabasePersistenceEnabled()) {
    return { error: null, credentialId: undefined };
  }

  const domain = normalizeShopDomain(shopDomain);
  if (!domain || !accessToken.trim()) {
    return { error: new Error("Shop domain and access token are required") };
  }
  if (!brandId.trim()) {
    return { error: new Error("Select a brand before saving Shopify credentials") };
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
        brand_id: brandId.trim(),
      },
      { onConflict: "user_id,brand_id" }
    )
    .select("id")
    .single();

  return {
    error: error ? new Error(error.message) : null,
    credentialId: data?.id ? String(data.id) : undefined,
  };
}
