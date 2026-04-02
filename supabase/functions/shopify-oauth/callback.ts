import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyShopifyOAuthHmac } from "./hmacVerify.ts";

function redirect(returnUrl: string, params: Record<string, string>): Response {
  const u = new URL(returnUrl);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  return Response.redirect(u.toString(), 302);
}

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

  const oauthError = sp.get("error");
  if (oauthError) {
    const desc = sp.get("error_description") || oauthError;
    return redirect(returnUrl, { shopify_oauth: "error", reason: desc.slice(0, 500) });
  }

  const okHmac = await verifyShopifyOAuthHmac(sp, clientSecret);
  if (!okHmac) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "Invalid HMAC",
    });
  }

  const code = sp.get("code");
  const state = sp.get("state");
  const shopParam = sp.get("shop");
  if (!code || !state || !shopParam) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "Missing OAuth parameters",
    });
  }

  const shopHost = shopParam.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  if (!shopHost.endsWith(".myshopify.com")) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "Invalid shop",
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: row, error: rowErr } = await admin
    .from("shopify_oauth_states")
    .select("user_id, shop_domain, expires_at, consumed_at")
    .eq("state", state)
    .maybeSingle();

  if (rowErr || !row) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "Invalid or unknown state",
    });
  }

  if (row.consumed_at) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "OAuth state already used",
    });
  }

  const expires = new Date(String(row.expires_at)).getTime();
  if (!Number.isFinite(expires) || Date.now() > expires) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "OAuth link expired; try again",
    });
  }

  const expectedShop = String(row.shop_domain).toLowerCase();
  if (shopHost !== expectedShop) {
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: "Shop does not match authorization",
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
    return redirect(returnUrl, {
      shopify_oauth: "error",
      reason: msg.slice(0, 500),
    });
  }

  const userId = row.user_id as string | null;
  await admin.from("shopify_oauth_states").update({ consumed_at: new Date().toISOString() }).eq(
    "state",
    state
  );

  if (userId) {
    const { error: upErr } = await admin.from("shopify_credentials").upsert(
      {
        user_id: userId,
        shop_domain: shopHost,
        access_token: tokenJson.access_token,
      },
      { onConflict: "user_id,shop_domain" }
    );

    if (upErr) {
      return redirect(returnUrl, {
        shopify_oauth: "error",
        reason: "Could not save credentials",
      });
    }
  } else {
    const pendingExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const claimNonce = crypto.randomUUID();
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
      return redirect(returnUrl, {
        shopify_oauth: "error",
        reason: "Could not store install token",
      });
    }

    return redirect(returnUrl, {
      shopify_oauth: "success",
      shop: shopHost,
      shopify_claim: claimNonce,
    });
  }

  return redirect(returnUrl, {
    shopify_oauth: "success",
    shop: shopHost,
  });
}
