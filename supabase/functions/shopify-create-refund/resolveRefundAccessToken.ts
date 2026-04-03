import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { verifyShopifySessionToken } from "./verifyShopifySessionToken.ts";

export type ResolvedAccess =
  | { ok: true; accessToken: string; credentialId: string | null }
  | { ok: false; status: number; error: string };

function jwtHeaderAlg(bearer: string): string | null {
  try {
    const first = bearer.trim().split(".")[0];
    const json = JSON.parse(atob(first.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.alg === "string" ? json.alg : null;
  } catch {
    return null;
  }
}

/**
 * HS256 bearer → Shopify session token → `shopify_install_tokens`.
 * Otherwise → Supabase JWT → `shopify_credentials` for that user.
 */
export async function resolveRefundAccessToken(
  admin: SupabaseClient,
  bearer: string,
  normalizedShop: string
): Promise<ResolvedAccess> {
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID")?.trim() ?? "";
  const clientSecret = Deno.env.get("SHOPIFY_CLIENT_SECRET")?.trim() ?? "";

  if (jwtHeaderAlg(bearer) === "HS256" && clientId && clientSecret) {
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

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(bearer);

  if (userErr || !user) {
    return { ok: false, status: 401, error: "Invalid or expired session" };
  }

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
