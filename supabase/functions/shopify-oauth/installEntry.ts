import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveShopifyAppCredentialsFromEnv } from "../_shared/resolveShopifyAppCredentials.ts";
import { resolvePartnerAppByBrandId } from "../_shared/resolveShopifyPartnerAppDb.ts";
import { verifyShopifyOAuthHmac } from "./hmacVerify.ts";
import { randomStateToken } from "./oauthCrypto.ts";
import { oauthDebugLog } from "./oauthDebugLog.ts";

const BRAND_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Shopify loads the app URL after install with ?shop=&timestamp=&hmac=
 * (https://shopify.dev/docs/apps/auth/oauth/getting-started#step-2-verify-the-installation-request).
 *
 * Optional `?tenant=<brands.id>` selects Partner app credentials from `brand_shopify_partner_apps`.
 * Always 302 to Shopify authorize.
 */
export async function handleInstallEntry(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const shopRaw = sp.get("shop");
  const hmac = sp.get("hmac");
  const timestamp = sp.get("timestamp");
  if (!shopRaw || !hmac || !timestamp) {
    return new Response("Missing shop, hmac, or timestamp", { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response("OAuth server misconfigured", { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const tenant = sp.get("tenant")?.trim() ?? "";
  let partnerAppId: string | null = null;
  let brandIdForState: string | null = null;
  let { clientId, clientSecret } = resolveShopifyAppCredentialsFromEnv();

  if (tenant) {
    if (!BRAND_UUID_RE.test(tenant)) {
      return new Response("Invalid tenant query parameter (expected brand UUID).", { status: 400 });
    }
    const appRow = await resolvePartnerAppByBrandId(admin, tenant);
    if (!appRow) {
      return new Response(
        "No Partner app credentials for this tenant. Save Client ID and Secret in Shopify settings first.",
        { status: 400 }
      );
    }
    partnerAppId = appRow.id;
    brandIdForState = tenant;
    clientId = appRow.clientId;
    clientSecret = appRow.clientSecret;
  }

  if (!clientId || !clientSecret) {
    return new Response("OAuth server misconfigured", { status: 500 });
  }

  const scopes =
    Deno.env.get("SHOPIFY_OAUTH_SCOPES") ||
    "read_orders,write_orders";

  const okHmac = await verifyShopifyOAuthHmac(sp, clientSecret);
  if (!okHmac) {
    return new Response("Invalid HMAC", { status: 403 });
  }

  const host = shopRaw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  if (!host.endsWith(".myshopify.com")) {
    return new Response("Invalid shop", { status: 400 });
  }

  const state = randomStateToken();
  const pendingClaimNonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("shopify_oauth_states").insert({
    state,
    user_id: null,
    shop_domain: host,
    expires_at: expiresAt,
    pending_claim_nonce: pendingClaimNonce,
    brand_id: brandIdForState,
    partner_app_id: partnerAppId,
  });

  if (insErr) {
    return new Response("Could not start OAuth", { status: 500 });
  }

  const redirectUriBase = `${supabaseUrl}/functions/v1/shopify-oauth`;
  const redirectUri = encodeURIComponent(redirectUriBase);
  const authorizeUrl =
    `https://${host}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}`;

  oauthDebugLog("install_entry_redirect_shopify_authorize", {
    shopify_admin_url: `https://${host}`,
    oauth_state: state,
    claim_nonce: pendingClaimNonce,
    redirect_url: authorizeUrl,
    tenant_mode: Boolean(tenant),
  });

  return Response.redirect(authorizeUrl, 302);
}
