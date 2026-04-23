import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decodeJwt } from "https://esm.sh/jose@5.9.6";
import { resolveShopifyAppCredentialsFromEnv } from "./resolveShopifyAppCredentials.ts";

export type ShopifyPartnerCredentials = {
  clientId: string;
  clientSecret: string;
};

export type OauthStateForCredentials = {
  partner_app_id: string | null;
};

export async function resolvePartnerAppById(
  admin: SupabaseClient,
  partnerAppId: string | null | undefined
): Promise<ShopifyPartnerCredentials | null> {
  const id = typeof partnerAppId === "string" ? partnerAppId.trim() : "";
  if (!id) return null;
  const { data, error } = await admin
    .from("brand_shopify_partner_apps")
    .select("shopify_client_id, shopify_client_secret")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const clientId = String((data as { shopify_client_id?: string }).shopify_client_id ?? "").trim();
  const clientSecret = String(
    (data as { shopify_client_secret?: string }).shopify_client_secret ?? ""
  ).trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function resolvePartnerAppByBrandId(
  admin: SupabaseClient,
  brandId: string
): Promise<(ShopifyPartnerCredentials & { id: string }) | null> {
  const bid = brandId.trim();
  if (!bid) return null;
  const { data, error } = await admin
    .from("brand_shopify_partner_apps")
    .select("id, shopify_client_id, shopify_client_secret")
    .eq("brand_id", bid)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { id?: string; shopify_client_id?: string; shopify_client_secret?: string };
  const clientId = String(row.shopify_client_id ?? "").trim();
  const clientSecret = String(row.shopify_client_secret ?? "").trim();
  const id = String(row.id ?? "").trim();
  if (!clientId || !clientSecret || !id) return null;
  return { id, clientId, clientSecret };
}

export async function resolveCredentialsForOAuthState(
  admin: SupabaseClient,
  row: OauthStateForCredentials
): Promise<ShopifyPartnerCredentials> {
  const fromDb = await resolvePartnerAppById(admin, row.partner_app_id);
  if (fromDb) return fromDb;
  return resolveShopifyAppCredentialsFromEnv();
}

function decodeJwtAudience(bearer: string): string | null {
  try {
    const claims = decodeJwt(bearer.trim()) as { aud?: unknown };
    const aud = claims.aud;
    if (typeof aud === "string" && aud.trim()) return aud.trim();
    if (Array.isArray(aud) && aud.length > 0 && typeof aud[0] === "string") {
      return String(aud[0]).trim();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Embedded session JWT `aud` is the Shopify app's client id; match install row for this shop.
 */
export async function resolveCredentialsForShopifySessionJwt(
  admin: SupabaseClient,
  normalizedShop: string,
  bearer: string
): Promise<ShopifyPartnerCredentials> {
  const aud = decodeJwtAudience(bearer);
  if (!aud) return resolveShopifyAppCredentialsFromEnv();

  const { data: apps, error: appsErr } = await admin
    .from("brand_shopify_partner_apps")
    .select("id, shopify_client_id, shopify_client_secret")
    .eq("shopify_client_id", aud);

  if (appsErr || !apps?.length) {
    return resolveShopifyAppCredentialsFromEnv();
  }

  const shop = normalizedShop.trim().toLowerCase();
  for (const raw of apps) {
    const app = raw as {
      id?: string;
      shopify_client_id?: string;
      shopify_client_secret?: string;
    };
    const id = String(app.id ?? "").trim();
    if (!id) continue;
    const { data: tok } = await admin
      .from("shopify_install_tokens")
      .select("shop_domain")
      .eq("shop_domain", shop)
      .eq("partner_app_id", id)
      .maybeSingle();
    if (tok?.shop_domain) {
      const clientId = String(app.shopify_client_id ?? "").trim();
      const clientSecret = String(app.shopify_client_secret ?? "").trim();
      if (clientId && clientSecret) return { clientId, clientSecret };
    }
  }

  return resolveShopifyAppCredentialsFromEnv();
}
