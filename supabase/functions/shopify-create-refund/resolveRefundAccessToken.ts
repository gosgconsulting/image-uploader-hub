import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { decodeJwt } from "https://esm.sh/jose@5.9.6";
import { resolveCredentialsForShopifySessionJwt } from "../_shared/resolveShopifyPartnerAppDb.ts";
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
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(bearer);

  if (!userErr && user) {
    const { data: ownCred, error: ownErr } = await admin
      .from("shopify_credentials")
      .select("id, access_token")
      .eq("user_id", user.id)
      .eq("shop_domain", normalizedShop)
      .maybeSingle();

    if (!ownErr && ownCred?.access_token && ownCred.id) {
      return {
        ok: true,
        accessToken: ownCred.access_token as string,
        credentialId: ownCred.id as string,
      };
    }

    // Sparti uses brand_users.auth_user_id instead of a dedicated brand_members table.
    const { data: memberRows, error: memErr } = await admin
      .from("brand_users")
      .select("brand_id")
      .eq("auth_user_id", user.id)
      .eq("is_active", true);

    const brandIds = (memberRows ?? [])
      .map((r) => (r as { brand_id?: string }).brand_id)
      .filter((id): id is string => Boolean(id?.trim()));

    if (!memErr && brandIds.length > 0) {
      const { data: sharedCred, error: sharedErr } = await admin
        .from("shopify_credentials")
        .select("id, access_token")
        .eq("shop_domain", normalizedShop)
        .in("brand_id", brandIds)
        .limit(1)
        .maybeSingle();

      if (!sharedErr && sharedCred?.access_token && sharedCred.id) {
        return {
          ok: true,
          accessToken: sharedCred.access_token as string,
          credentialId: sharedCred.id as string,
        };
      }
    }

    return {
      ok: false,
      status: 400,
      error: "No Shopify credentials for this shop. Save them in the app while signed in.",
    };
  }

  const looksShopify = payloadLooksLikeShopifySessionToken(bearer);
  if (looksShopify) {
    const { clientId, clientSecret } = await resolveCredentialsForShopifySessionJwt(
      admin,
      normalizedShop,
      bearer
    );
    if (!clientId || !clientSecret) {
      return {
        ok: false,
        status: 500,
        error:
          "Server misconfigured: set SHOPIFY_CLIENT_* / SHOPIFY_CUSTOM_APP_* on shopify-create-refund, or save per-brand Partner app credentials for embedded session tokens.",
      };
    }

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
