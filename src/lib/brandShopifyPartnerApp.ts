import { supabase } from "@/integrations/supabase/client";

export type PartnerAppPublicResult =
  | { ok: true; configured: boolean; shopifyClientId?: string; partnerAppId?: string }
  | { ok: false; error: string };

function parsePublicRpc(data: unknown): PartnerAppPublicResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Invalid response" };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === false) {
    return { ok: false, error: typeof o.error === "string" ? o.error : "Request failed" };
  }
  return {
    ok: true,
    configured: Boolean(o.configured),
    shopifyClientId: typeof o.shopify_client_id === "string" ? o.shopify_client_id : undefined,
    partnerAppId: typeof o.partner_app_id === "string" ? o.partner_app_id : undefined,
  };
}

function parseUpsertRpc(data: unknown): { ok: true } | { ok: false; error: string } {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, error: "Invalid response" };
  }
  const o = data as Record<string, unknown>;
  if (o.ok === false) {
    return { ok: false, error: typeof o.error === "string" ? o.error : "Request failed" };
  }
  return { ok: true };
}

export async function fetchBrandPartnerAppPublic(brandId: string): Promise<PartnerAppPublicResult> {
  const bid = brandId.trim();
  if (!bid) return { ok: false, error: "Missing brand" };
  const { data, error } = await supabase.rpc("get_brand_shopify_partner_app_public", {
    p_brand_id: bid,
  });
  if (error) return { ok: false, error: error.message };
  return parsePublicRpc(data);
}

export async function upsertBrandPartnerApp(
  brandId: string,
  clientId: string,
  clientSecret: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bid = brandId.trim();
  if (!bid) return { ok: false, error: "Missing brand" };
  const { data, error } = await supabase.rpc("upsert_brand_shopify_partner_app", {
    p_brand_id: bid,
    p_client_id: clientId.trim(),
    p_client_secret: clientSecret.trim(),
  });
  if (error) return { ok: false, error: error.message };
  return parseUpsertRpc(data);
}

export async function deleteBrandPartnerApp(
  brandId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bid = brandId.trim();
  if (!bid) return { ok: false, error: "Missing brand" };
  const { data, error } = await supabase.rpc("delete_brand_shopify_partner_app", {
    p_brand_id: bid,
  });
  if (error) return { ok: false, error: error.message };
  return parseUpsertRpc(data);
}

export function shopifyOAuthInstallUrlForTenant(brandId: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") ?? "";
  const bid = brandId.trim();
  if (!base || !bid) return "";
  return `${base}/functions/v1/shopify-oauth?tenant=${encodeURIComponent(bid)}`;
}
