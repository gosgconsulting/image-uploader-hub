import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

/** Persists offline Admin token for session-token–authenticated Edge calls (embedded apps). */
export async function persistShopifyInstallToken(
  admin: SupabaseClient,
  shopHost: string,
  accessToken: string,
  partnerAppId?: string | null
): Promise<{ ok: true } | { ok: false }> {
  const pid = typeof partnerAppId === "string" ? partnerAppId.trim() : "";
  const row: {
    shop_domain: string;
    access_token: string;
    partner_app_id: string | null;
  } = {
    shop_domain: shopHost,
    access_token: accessToken,
    partner_app_id: pid || null,
  };
  const { error } = await admin.from("shopify_install_tokens").upsert(row, {
    onConflict: "shop_domain",
  });
  if (error) return { ok: false };
  return { ok: true };
}
