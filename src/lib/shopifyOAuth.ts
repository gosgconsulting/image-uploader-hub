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
  | { ok: true; shop_domain?: string; credential_id?: string }
  | { ok: false; error: string };

export type ClaimShopifyInstallInput = {
  /** *.myshopify.com host; optional if claimNonce is set */
  shop?: string;
  /** UUID from ?shopify_claim= on the OAuth return URL (preferred) */
  claimNonce?: string;
  /** Dashboard brand to attach the install to (recommended; server falls back to first brand). */
  brandId?: string;
};

/**
 * Moves a token from shopify_oauth_pending (after Admin install OAuth) into shopify_credentials for the current user.
 */
export async function claimShopifyInstall(
  input: string | ClaimShopifyInstallInput
): Promise<ClaimShopifyInstallResult> {
  const opts: ClaimShopifyInstallInput =
    typeof input === "string" ? { shop: input } : { ...input };

  const claimNonce = opts.claimNonce?.trim() || undefined;
  const domain = opts.shop ? normalizeShopDomain(opts.shop.trim()) : "";

  if (!claimNonce && !domain) {
    return { ok: false, error: "Missing shop or claim token from OAuth redirect." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Sign in to link this shop." };
  }

  const brandId = opts.brandId?.trim();
  const body: { shop?: string; claimNonce?: string; brand_id?: string } = {};
  if (claimNonce) body.claimNonce = claimNonce;
  if (domain) body.shop = domain;
  if (brandId) body.brand_id = brandId;

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    shop_domain?: string;
    credential_id?: string;
    error?: string;
  }>("shopify-oauth", {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data?.ok) {
    return {
      ok: true,
      shop_domain: data.shop_domain,
      credential_id: data.credential_id,
    };
  }
  return {
    ok: false,
    error: data?.error || "Could not link shop.",
  };
}

export type BeginShopifyManualOAuthResult =
  | { ok: true; authorizeUrl: string }
  | { ok: false; error: string };

/**
 * Creates OAuth state on the server and returns the Shopify authorize URL.
 * Passes the current Supabase session (if any) so the callback can attach the token to the user.
 */
export async function beginShopifyManualOAuth(
  shop: string,
  brandId?: string
): Promise<BeginShopifyManualOAuthResult> {
  const domain = normalizeShopDomain(shop.trim());
  if (!domain.endsWith(".myshopify.com")) {
    return { ok: false, error: "Enter a valid *.myshopify.com shop domain." };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.user && !brandId?.trim()) {
    return {
      ok: false,
      error: "Select a brand in the dashboard before starting Shopify OAuth.",
    };
  }

  const headers: Record<string, string> = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const body: { action: string; shop: string; brand_id?: string } = {
    action: "begin_oauth",
    shop: domain,
  };
  if (brandId?.trim()) body.brand_id = brandId.trim();

  const { data, error } = await supabase.functions.invoke<{
    authorize_url?: string;
    error?: string;
  }>("shopify-oauth", {
    body,
    headers,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  const url = data?.authorize_url?.trim();
  if (!url) {
    return { ok: false, error: data?.error || "Could not start Shopify OAuth." };
  }
  return { ok: true, authorizeUrl: url };
}
