import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyShopifyOAuthHmac } from "./hmacVerify.ts";
import { randomStateToken } from "./oauthCrypto.ts";
import { oauthDebugLog } from "./oauthDebugLog.ts";

/**
 * Shopify loads the app URL after install with ?shop=&timestamp=&hmac=
 * (https://shopify.dev/docs/apps/auth/oauth/getting-started#step-2-verify-the-installation-request).
 *
 * Always 302 to Shopify authorize. This project targets a standalone Refund app (not embedded in
 * Admin); configure the Partner app for a non-embedded install so this redirect runs in a full
 * window—Shopify often blocks framing `/admin/oauth/authorize`.
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
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  const scopes =
    Deno.env.get("SHOPIFY_OAUTH_SCOPES") ||
    "read_orders,write_orders";

  if (!supabaseUrl || !serviceKey || !clientId || !clientSecret) {
    return new Response("OAuth server misconfigured", { status: 500 });
  }

  const okHmac = await verifyShopifyOAuthHmac(sp, clientSecret);
  if (!okHmac) {
    return new Response("Invalid HMAC", { status: 403 });
  }

  const host = shopRaw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  if (!host.endsWith(".myshopify.com")) {
    return new Response("Invalid shop", { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const state = randomStateToken();
  const pendingClaimNonce = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("shopify_oauth_states").insert({
    state,
    user_id: null,
    shop_domain: host,
    expires_at: expiresAt,
    pending_claim_nonce: pendingClaimNonce,
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
  });

  return Response.redirect(authorizeUrl, 302);
}
