import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { randomStateToken } from "./oauthCrypto.ts";
import { corsHeaders } from "./cors.ts";
import { oauthDebugLog } from "./oauthDebugLog.ts";

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeShopHost(raw: string): string | null {
  const host = raw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase().trim();
  if (!host.endsWith(".myshopify.com")) return null;
  return host;
}

/**
 * Starts OAuth from the SPA: creates `shopify_oauth_states` and returns the Shopify authorize URL.
 * Optional Bearer JWT ties the state to a user so the callback can upsert `shopify_credentials` directly.
 */
export async function handleBeginManualOAuth(
  req: Request,
  parsed: Record<string, unknown>
): Promise<Response> {
  const shopRaw = typeof parsed.shop === "string" ? parsed.shop.trim() : "";
  const host = shopRaw ? normalizeShopHost(shopRaw) : null;
  if (!host) {
    return json({ error: "Invalid shop domain (*.myshopify.com required)." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET");
  const scopes =
    Deno.env.get("SHOPIFY_OAUTH_SCOPES") ||
    "read_orders,write_orders";

  if (!supabaseUrl || !serviceKey || !clientId || !clientSecret) {
    return json({ error: "OAuth server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const jwt = authHeader.slice(7);
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(jwt);
    if (!error && user) userId = user.id;
  }

  const brandRaw = typeof parsed.brand_id === "string" ? parsed.brand_id.trim() : "";
  let brandId: string | null = null;
  if (userId) {
    if (!brandRaw) {
      return json(
        { error: "Select a brand in the dashboard, then start Shopify OAuth again." },
        400
      );
    }
    const { data: owned, error: brandErr } = await admin
      .from("brands")
      .select("id")
      .eq("id", brandRaw)
      .eq("user_id", userId)
      .maybeSingle();
    if (brandErr || !owned?.id) {
      return json({ error: "Invalid or unknown brand for this account." }, 400);
    }
    brandId = String(owned.id);
  }

  const state = randomStateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("shopify_oauth_states").insert({
    state,
    user_id: userId,
    shop_domain: host,
    expires_at: expiresAt,
    brand_id: brandId,
  });

  if (insErr) {
    return json({ error: "Could not start OAuth" }, 500);
  }

  const redirectUriBase = `${supabaseUrl}/functions/v1/shopify-oauth`;
  const redirectUri = encodeURIComponent(redirectUriBase);
  const authorizeUrl =
    `https://${host}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}`;

  oauthDebugLog("begin_manual_oauth", {
    shopify_admin_url: `https://${host}`,
    oauth_state: state,
    has_user_id: userId !== null,
    redirect_url: authorizeUrl,
  });

  return json({ authorize_url: authorizeUrl });
}
