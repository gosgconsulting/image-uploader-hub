import type { Dispatch, SetStateAction } from "react";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  LS_SHOPIFY_CONNECTION_ID,
  clearPendingClaimStorage,
  writePendingClaimToDurableStorage,
  writePendingClaimToSessionStorage,
} from "./shopifyRefundSessionKeys";

export { writePendingClaimToDurableStorage };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const REFUND_OAUTH_DEBUG = "[refund-shopify-oauth]";

export function refundOAuthDebugLog(event: string, data: Record<string, unknown>): void {
  console.log(JSON.stringify({ source: REFUND_OAUTH_DEBUG, event, ...data }));
}

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

export async function completeShopifyInstallClaimFlow(opts: {
  claimNonce: string;
  normalized: string;
  toast: ToastFn;
  setShopifyShop: Dispatch<SetStateAction<string>>;
  setShopifyConnectionId: Dispatch<SetStateAction<string>>;
}): Promise<void> {
  const { claimNonce, normalized, toast, setShopifyShop, setShopifyConnectionId } = opts;
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
    writePendingClaimToDurableStorage(claimNonce, normalized);
    writePendingClaimToSessionStorage(claimNonce, normalized);
    toast({
      title: "Almost done",
      description:
        "Sign in on this site with the same browser. Your shop will link automatically for refunds.",
    });
    return;
  }

  const claimResult = await claimShopifyInstall({
    claimNonce: claimNonce || undefined,
    shop: normalized || undefined,
  });

  if (claimResult.ok) {
    clearPendingClaimStorage();
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
  }
}
