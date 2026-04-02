import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyShopifyOAuthHmac } from "./hmacVerify.ts";
import { randomStateToken } from "./oauthCrypto.ts";

/**
 * Supabase rewrites GET responses with Content-Type text/html to text/plain, so HTML
 * from Edge Functions is shown as source. Embedded OAuth escape uses a static page on
 * the app origin instead (public/shopify-oauth-embed.html).
 * @see https://supabase.com/docs/guides/functions/http-methods
 */
function embedEscapeRedirect(
  authorizeUrl: string,
  shopHost: string,
  pendingClaimNonce: string
): Response {
  const returnUrlRaw = Deno.env.get("SHOPIFY_OAUTH_RETURN_URL");
  if (!returnUrlRaw?.trim()) {
    return new Response(
      "SHOPIFY_OAUTH_RETURN_URL must be set for embedded Shopify apps (used to locate the HTML escape page on your app host)",
      { status: 500 }
    );
  }

  let origin: string;
  try {
    origin = new URL(returnUrlRaw.trim()).origin;
  } catch {
    return new Response("Invalid SHOPIFY_OAUTH_RETURN_URL", { status: 500 });
  }

  const customPage = Deno.env.get("SHOPIFY_OAUTH_EMBED_PAGE")?.trim();
  const embedPage = customPage || `${origin}/shopify-oauth-embed.html`;
  const joiner = embedPage.includes("?") ? "&" : "?";
  const qs = new URLSearchParams();
  qs.set("authorize", authorizeUrl);
  qs.set("shop", shopHost);
  qs.set("shopify_claim", pendingClaimNonce);
  const target = `${embedPage}${joiner}${qs.toString()}`;
  return Response.redirect(target, 302);
}

/**
 * Shopify loads the app URL after install with ?shop=&timestamp=&hmac=
 * (https://shopify.dev/docs/apps/auth/oauth/getting-started#step-2-verify-the-installation-request).
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

  const embedded = sp.get("embedded");
  const breakOutOfIframe =
    embedded === "1" || embedded?.toLowerCase() === "true";

  if (breakOutOfIframe) {
    return embedEscapeRedirect(authorizeUrl, host, pendingClaimNonce);
  }

  return Response.redirect(authorizeUrl, 302);
}
