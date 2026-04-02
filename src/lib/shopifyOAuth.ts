import { supabase } from "@/integrations/supabase/client";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";

export function parseShopifyOAuthEnabledEnv(raw: string | undefined): boolean {
  if (raw === undefined || raw === "") return false;
  const lower = String(raw).toLowerCase().trim();
  return ["true", "1", "yes", "on"].includes(lower);
}

export function isShopifyOAuthEnabled(): boolean {
  return parseShopifyOAuthEnabledEnv(import.meta.env.VITE_SHOPIFY_OAUTH_ENABLED);
}

export type StartShopifyOAuthResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Starts Shopify OAuth (browser redirect). Requires signed-in Supabase user.
 */
export async function startShopifyOAuth(shop: string): Promise<StartShopifyOAuthResult> {
  const domain = normalizeShopDomain(shop.trim());
  if (!domain) {
    return { ok: false, error: "Enter a valid *.myshopify.com shop domain." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Sign in to connect Shopify." };
  }

  const { data, error } = await supabase.functions.invoke<{
    redirectUrl?: string;
    error?: string;
  }>("shopify-oauth", {
    body: { shop: domain },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data?.redirectUrl) {
    return {
      ok: false,
      error: data?.error || "Could not start Shopify OAuth.",
    };
  }

  window.location.assign(data.redirectUrl);
  return { ok: true };
}
