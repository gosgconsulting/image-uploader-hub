import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";

const BRAND_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMPORT_UUID_RE = BRAND_UUID_RE;

async function userCanAccessBrand(
  admin: SupabaseClient,
  userId: string,
  brandId: string
): Promise<boolean> {
  const { data: brand, error } = await admin
    .from("brands")
    .select("user_id")
    .eq("id", brandId)
    .maybeSingle();

  if (error || !brand) return false;
  if ((brand as { user_id?: string }).user_id === userId) return true;

  const { data: memberRow } = await admin
    .from("brand_members")
    .select("id")
    .eq("brand_id", brandId)
    .eq("member_user_id", userId)
    .maybeSingle();

  return Boolean(memberRow);
}

export type ResolvedShopifyCred =
  | { ok: true; accessToken: string; shopDomain: string }
  | { ok: false; error: string };

export async function resolveCredentialAndVerifyImport(opts: {
  admin: SupabaseClient;
  userId: string;
  brandId: string;
  importId: string;
}): Promise<ResolvedShopifyCred> {
  const { admin, userId, brandId, importId } = opts;

  if (!BRAND_UUID_RE.test(brandId)) return { ok: false, error: "Invalid brand_id" };
  if (!IMPORT_UUID_RE.test(importId)) return { ok: false, error: "Invalid import_id" };

  if (!(await userCanAccessBrand(admin, userId, brandId))) {
    return { ok: false, error: "Not allowed for this brand" };
  }

  const { data: imp, error: impErr } = await admin
    .from("imports")
    .select("id, brand_id")
    .eq("id", importId)
    .maybeSingle();

  if (impErr || !imp) {
    return { ok: false, error: "Import not found" };
  }
  if ((imp as { brand_id?: string }).brand_id !== brandId) {
    return { ok: false, error: "Import does not belong to this brand" };
  }

  const { data: cred, error: credErr } = await admin
    .from("shopify_credentials")
    .select("access_token, shop_domain")
    .eq("brand_id", brandId)
    .maybeSingle();

  if (credErr || !cred?.access_token || !(cred as { shop_domain?: string }).shop_domain) {
    return {
      ok: false,
      error:
        "No Shopify credentials saved for this brand. Connect Shopify in Settings (save credentials / OAuth).",
    };
  }

  const shopDomain = normalizeShopDomain((cred as { shop_domain: string }).shop_domain);
  if (!shopDomain.endsWith(".myshopify.com")) {
    return { ok: false, error: "Invalid Shopify shop domain on saved credentials" };
  }

  return {
    ok: true,
    accessToken: cred.access_token as string,
    shopDomain,
  };
}
