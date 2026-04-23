import type { Dispatch, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  LS_SHOPIFY_CONNECTION_ID,
  clearOAuthTargetBrandId,
  clearPendingClaimStorage,
  readOAuthTargetBrandId,
  readPendingClaimBrandId,
  writePendingClaimToDurableStorage,
  writePendingClaimToSessionStorage,
} from "@/lib/shopifySessionKeys";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REFUND_OAUTH_DEBUG = "[refund-shopify-oauth]";

export function refundOAuthDebugLog(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ source: REFUND_OAUTH_DEBUG, event, ...data }));
}

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

/** Returned so the Refund UI can show progress / “sign in to finish” instead of only toasts. */
export type ShopifyInstallClaimFlowOutcome =
  | "deferred_sign_in"
  | "linked"
  | "failed";

export async function completeShopifyInstallClaimFlow(opts: {
  claimNonce: string;
  normalized: string;
  toast: ToastFn;
  setShopifyShop: Dispatch<SetStateAction<string>>;
  setShopifyConnectionId: Dispatch<SetStateAction<string>>;
  /** Dashboard brand UUID for linking the install (falls back to durable OAuth keys). */
  claimBrandId?: string | null;
}): Promise<ShopifyInstallClaimFlowOutcome> {
  const {
    claimNonce,
    normalized,
    toast,
    setShopifyShop,
    setShopifyConnectionId,
    claimBrandId,
  } = opts;

  const brandForClaim =
    claimBrandId?.trim() ||
    readOAuthTargetBrandId().trim() ||
    readPendingClaimBrandId().trim() ||
    undefined;
  refundOAuthDebugLog("claim_flow_start", {
    claim_nonce: claimNonce || null,
    shop: normalized || null,
    shopify_admin_url: normalized ? `https://${normalized}` : null,
    current_url: typeof window !== "undefined" ? window.location.href : null,
  });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    refundOAuthDebugLog("claim_flow_deferred_sign_in", {
      claim_nonce: claimNonce || null,
      shop: normalized || null,
      shopify_admin_url: normalized ? `https://${normalized}` : null,
    });
    writePendingClaimToDurableStorage(claimNonce, normalized, brandForClaim);
    writePendingClaimToSessionStorage(claimNonce, normalized, brandForClaim);
    toast({
      title: "Almost done",
      description:
        "Sign in on this site with the same browser. Your shop will link automatically for refunds.",
    });
    return "deferred_sign_in";
  }

  const claimResult = await claimShopifyInstall({
    claimNonce: claimNonce || undefined,
    shop: normalized || undefined,
    brandId: brandForClaim,
  });

  if (claimResult.ok) {
    clearPendingClaimStorage();
    clearOAuthTargetBrandId();
    if (claimResult.shop_domain) {
      localStorage.setItem("shopify_shop", claimResult.shop_domain);
      setShopifyShop(claimResult.shop_domain);
    }
    const cid = claimResult.credential_id?.trim() ?? "";
    if (cid && UUID_RE.test(cid)) {
      localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, cid);
      setShopifyConnectionId(cid);
    }
    refundOAuthDebugLog("claim_flow_ok", {
      shop: claimResult.shop_domain ?? null,
      shopify_admin_url: claimResult.shop_domain
        ? `https://${claimResult.shop_domain}`
        : null,
      credential_id: cid || null,
    });
    toast({
      title: "Shopify linked",
      description:
        "Install finished. This shop is tied to your account for server-side refunds.",
    });
    return "linked";
  } else {
    refundOAuthDebugLog("claim_flow_failed", {
      error: "error" in claimResult ? claimResult.error : "Unknown error",
      claim_nonce: claimNonce || null,
      shop: normalized || null,
    });
    toast({
      title: "Finish linking",
      description: "error" in claimResult ? claimResult.error : "Unknown error",
      variant: "destructive",
    });
    return "failed";
  }
}
