import { oauthDebugLog } from "./oauthDebugLog.ts";

export type SpaRedirectMeta = {
  phase: string;
  shop?: string | null;
  oauthState?: string | null;
  claimNonce?: string | null;
};

/**
 * OAuth completion is handled on the SPA (dashboard `ShopifyConnectionProvider` +
 * `useShopifyOAuthReturnParams`). If `SHOPIFY_OAUTH_RETURN_URL` is only the site origin
 * (pathname `/`), query params would land on `/` and are lost before settings load.
 */
export function oauthReturnTargetUrl(returnUrlRaw: string): URL {
  const u = new URL(returnUrlRaw.trim());
  const path = u.pathname.replace(/\/+$/, "") || "/";
  if (path === "/") {
    u.pathname = "/shopify-settings";
    u.hash = "";
  } else {
    u.pathname = path;
  }
  return u;
}

export function spaRedirect(
  returnUrl: string,
  params: Record<string, string>,
  meta?: SpaRedirectMeta
): Response {
  const u = oauthReturnTargetUrl(returnUrl);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  const redirectUrl = u.toString();
  const shop = meta?.shop ?? params.shop ?? null;
  oauthDebugLog("spa_redirect", {
    phase: meta?.phase ?? "unknown",
    redirect_url: redirectUrl,
    shopify_admin_url: shop ? `https://${shop}` : null,
    shop,
    oauth_state: meta?.oauthState ?? null,
    claim_nonce: params.shopify_claim ?? meta?.claimNonce ?? null,
  });
  return Response.redirect(redirectUrl, 302);
}

export function spaOAuthErrorRedirect(
  returnUrl: string,
  reason: string,
  meta: SpaRedirectMeta
): Response {
  return spaRedirect(returnUrl, { shopify_oauth: "error", reason }, meta);
}
