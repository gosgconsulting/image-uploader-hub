import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyShopifyOAuthHmac } from "./hmacVerify.ts";
import { persistShopifyInstallToken } from "./persistInstallToken.ts";
import { oauthDebugLog } from "./oauthDebugLog.ts";
import { spaOAuthErrorRedirect, spaRedirect } from "./callbackSpaRedirect.ts";

export async function handleCallback(req: Request): Promise<Response> {
  const returnUrl = Deno.env.get("SHOPIFY_OAUTH_RETURN_URL");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");

  if (!returnUrl || !supabaseUrl || !serviceKey || !clientId || !clientSecret) {
    return new Response("OAuth server misconfigured", { status: 500 });
  }

  const url = new URL(req.url);
  const sp = url.searchParams;

  oauthDebugLog("callback_request", {
    configured_shopify_oauth_return_url: returnUrl,
    request_shop: sp.get("shop"),
    has_oauth_state: sp.has("state"),
    has_code: sp.has("code"),
    oauth_error_param: sp.get("error"),
  });

  const oauthError = sp.get("error");
  if (oauthError) {
    const desc = sp.get("error_description") || oauthError;
    return spaOAuthErrorRedirect(returnUrl, desc.slice(0, 500), {
      phase: "shopify_authorize_error",
      shop: sp.get("shop"),
      oauthState: sp.get("state"),
    });
  }

  const okHmac = await verifyShopifyOAuthHmac(sp, clientSecret);
  if (!okHmac) {
    return spaOAuthErrorRedirect(returnUrl, "Invalid HMAC", {
      phase: "callback_hmac_invalid",
      shop: sp.get("shop"),
      oauthState: sp.get("state"),
    });
  }

  const code = sp.get("code");
  const state = sp.get("state");
  const shopParam = sp.get("shop");
  if (!code || !state || !shopParam) {
    return spaOAuthErrorRedirect(returnUrl, "Missing OAuth parameters", {
      phase: "callback_missing_params",
      shop: shopParam,
      oauthState: state,
    });
  }

  const shopHost = shopParam.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  if (!shopHost.endsWith(".myshopify.com")) {
    return spaOAuthErrorRedirect(returnUrl, "Invalid shop", {
      phase: "callback_invalid_shop_host",
      shop: shopHost,
      oauthState: state,
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: row, error: rowErr } = await admin
    .from("shopify_oauth_states")
    .select("user_id, shop_domain, expires_at, consumed_at, pending_claim_nonce")
    .eq("state", state)
    .maybeSingle();

  if (rowErr || !row) {
    return spaOAuthErrorRedirect(returnUrl, "Invalid or unknown state", {
      phase: "callback_state_not_found",
      shop: shopHost,
      oauthState: state,
    });
  }

  if (row.consumed_at) {
    return spaOAuthErrorRedirect(returnUrl, "OAuth state already used", {
      phase: "callback_state_consumed",
      shop: shopHost,
      oauthState: state,
    });
  }

  const expires = new Date(String(row.expires_at)).getTime();
  if (!Number.isFinite(expires) || Date.now() > expires) {
    return spaOAuthErrorRedirect(returnUrl, "OAuth link expired; try again", {
      phase: "callback_state_expired",
      shop: shopHost,
      oauthState: state,
    });
  }

  const expectedShop = String(row.shop_domain).toLowerCase();
  if (shopHost !== expectedShop) {
    return spaOAuthErrorRedirect(returnUrl, "Shop does not match authorization", {
      phase: "callback_shop_mismatch",
      shop: shopHost,
      oauthState: state,
      claimNonce: row.pending_claim_nonce as string | null | undefined,
    });
  }

  const tokenRes = await fetch(`https://${shopHost}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenJson.access_token) {
    const msg =
      tokenJson.error_description ||
      tokenJson.error ||
      `Token exchange failed (${tokenRes.status})`;
    oauthDebugLog("callback_token_exchange_failed", {
      shopify_admin_url: `https://${shopHost}`,
      oauth_state: state,
      status: tokenRes.status,
    });
    return spaOAuthErrorRedirect(returnUrl, msg.slice(0, 500), {
      phase: "callback_token_exchange_failed",
      shop: shopHost,
      oauthState: state,
    });
  }

  oauthDebugLog("callback_after_token_exchange", {
    shopify_admin_url: `https://${shopHost}`,
    oauth_state: state,
    flow: (row.user_id as string | null) ? "signed_in_user" : "pending_claim_install",
    install_pending_claim_nonce: row.pending_claim_nonce as string | null | undefined,
  });

  const userId = row.user_id as string | null;
  await admin.from("shopify_oauth_states").update({ consumed_at: new Date().toISOString() }).eq(
    "state",
    state
  );

  const installSaved = await persistShopifyInstallToken(
    admin,
    shopHost,
    tokenJson.access_token
  );
  if (!installSaved.ok) {
    return spaOAuthErrorRedirect(returnUrl, "Could not persist install token", {
      phase: "callback_persist_install_token_failed",
      shop: shopHost,
      oauthState: state,
    });
  }

  if (userId) {
    const { data: credRow, error: upErr } = await admin
      .from("shopify_credentials")
      .upsert(
        {
          user_id: userId,
          shop_domain: shopHost,
          access_token: tokenJson.access_token,
        },
        { onConflict: "user_id,shop_domain" }
      )
      .select("id")
      .single();

    if (upErr) {
      return spaOAuthErrorRedirect(returnUrl, "Could not save credentials", {
        phase: "callback_save_credentials_failed",
        shop: shopHost,
        oauthState: state,
      });
    }

    const signedInParams: Record<string, string> = {
      shopify_oauth: "success",
      shop: shopHost,
    };
    if (credRow?.id) {
      signedInParams.shopify_connection_id = String(credRow.id);
    }
    return spaRedirect(returnUrl, signedInParams, {
      phase: "callback_success_signed_in",
      shop: shopHost,
      oauthState: state,
    });
  } else {
    const pendingExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const fromState = row.pending_claim_nonce as string | null | undefined;
    const claimNonce =
      typeof fromState === "string" && fromState.trim().length > 0
        ? fromState.trim()
        : crypto.randomUUID();
    const { error: pendErr } = await admin.from("shopify_oauth_pending").upsert(
      {
        shop_domain: shopHost,
        access_token: tokenJson.access_token,
        expires_at: pendingExpires,
        claim_nonce: claimNonce,
      },
      { onConflict: "shop_domain" }
    );

    if (pendErr) {
      return spaOAuthErrorRedirect(returnUrl, "Could not store install token", {
        phase: "callback_pending_upsert_failed",
        shop: shopHost,
        oauthState: state,
        claimNonce,
      });
    }

    oauthDebugLog("callback_pending_claim_ready", {
      shopify_admin_url: `https://${shopHost}`,
      oauth_state: state,
      claim_nonce: claimNonce,
    });

    return spaRedirect(
      returnUrl,
      {
        shopify_oauth: "success",
        shop: shopHost,
        shopify_claim: claimNonce,
      },
      {
        phase: "callback_success_pending_claim",
        shop: shopHost,
        oauthState: state,
        claimNonce,
      }
    );
  }
}
