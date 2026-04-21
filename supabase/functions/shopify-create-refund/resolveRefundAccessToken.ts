import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decodeJwt } from "https://esm.sh/jose@5.9.6";
import { verifyShopifySessionToken } from "./verifyShopifySessionToken.ts";

export type ResolvedAccess =
  | { ok: true; accessToken: string; credentialId: string | null }
  | { ok: false; status: number; error: string };

/** Shopify session JWTs include `dest` (admin URL); Supabase user JWTs do not. */
function payloadLooksLikeShopifySessionToken(bearer: string): boolean {
  try {
    const claims = decodeJwt(bearer.trim()) as { dest?: unknown };
    const dest = typeof claims.dest === "string" ? claims.dest : "";
    return dest.includes(".myshopify.com");
  } catch {
    return false;
  }
}

/**
 * Supabase user JWT → `shopify_credentials` (try first: Supabase access tokens are often HS256 too).
 * Else valid Shopify session JWT → `shopify_install_tokens`.
 */
export async function resolveRefundAccessToken(
  admin: SupabaseClient,
  bearer: string,
  normalizedShop: string
): Promise<ResolvedAccess> {
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET")?.trim() ?? "";

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(bearer);

  if (!userErr && user) {
    const { data: cred, error: credErr } = await admin
      .from("shopify_credentials")
      .select("id, access_token")
      .eq("user_id", user.id)
      .eq("shop_domain", normalizedShop)
      .maybeSingle();

    if (credErr || !cred?.access_token || !cred.id) {
      return {
        ok: false,
        status: 400,
        error: "No Shopify credentials for this shop. Save them in the app while signed in.",
      };
    }

    return {
      ok: true,
      accessToken: cred.access_token as string,
      credentialId: cred.id as string,
    };
  }

  const looksShopify = payloadLooksLikeShopifySessionToken(bearer);
  if (looksShopify && (!clientId || !clientSecret)) {
    return {
      ok: false,
      status: 500,
      error:
        "Server misconfigured: set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET on the shopify-create-refund function so embedded session tokens can be verified.",
    };
  }

  if (looksShopify && clientId && clientSecret) {
    const session = await verifyShopifySessionToken(bearer, clientId, clientSecret);
    if (!session.ok) {
      return { ok: false, status: 401, error: session.error };
    }
    if (session.shopDomain !== normalizedShop) {
      return {
        ok: false,
        status: 403,
        error: "Session token shop does not match shopDomain in request",
      };
    }
    const { data: install, error: instErr } = await admin
      .from("shopify_install_tokens")
      .select("access_token")
      .eq("shop_domain", normalizedShop)
      .maybeSingle();

    if (instErr || !install?.access_token) {
      return {
        ok: false,
        status: 400,
        error:
          "No install token for this shop. Open the app from Shopify Admin once to complete OAuth.",
      };
    }
    return {
      ok: true,
      accessToken: install.access_token as string,
      credentialId: null,
    };
  }

  return {
    ok: false,
    status: 401,
    error:
      "Invalid or expired session. Sign out and sign in again, or reload the page so your Supabase session refreshes.",
  };
}
