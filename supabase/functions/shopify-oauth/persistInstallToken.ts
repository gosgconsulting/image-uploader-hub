import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/** Persists offline Admin token for session-token–authenticated Edge calls (embedded apps). */
export async function persistShopifyInstallToken(
  admin: SupabaseClient,
  shopHost: string,
  accessToken: string
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await admin.from("shopify_install_tokens").upsert(
    { shop_domain: shopHost, access_token: accessToken },
    { onConflict: "shop_domain" }
  );
  if (error) return { ok: false };
  return { ok: true };
}
