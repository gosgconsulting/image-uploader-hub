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

export type ClaimShopifyInstallResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Moves a token from shopify_oauth_pending (after Admin install OAuth) into shopify_credentials for the current user.
 */
export async function claimShopifyInstall(shop: string): Promise<ClaimShopifyInstallResult> {
  const domain = normalizeShopDomain(shop.trim());
  if (!domain) {
    return { ok: false, error: "Invalid shop domain." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Sign in to link this shop." };
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
  }>("shopify-oauth", {
    body: { shop: domain },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data?.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    error: data?.error || "Could not link shop.",
  };
}
