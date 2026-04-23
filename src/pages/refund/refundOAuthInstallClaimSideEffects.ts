import type { Dispatch, SetStateAction } from "react";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import { completeShopifyInstallClaimFlow } from "./completeShopifyInstallClaimFlow";
import { clearRefundOAuthProcLock } from "./refundOAuthProcLock";
import { readPendingClaimShop } from "@/lib/shopifySessionKeys";

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

/** Shared by OAuth-return and bare `?shop=&shopify_claim=` handlers. */
export async function runRefundOAuthInstallClaimSideEffects(opts: {
  lockKey: string;
  claimNonce: string;
  normalized: string;
  toast: ToastFn;
  setShopifyShop: Dispatch<SetStateAction<string>>;
  setShopifyConnectionId: Dispatch<SetStateAction<string>>;
  setShopifyClaimBusy: Dispatch<SetStateAction<boolean>>;
  setShopifyLinkSignInHintShop: Dispatch<SetStateAction<string | null>>;
  afterClaim: () => void;
  hydrateShopifySession: () => Promise<void>;
  claimBrandId?: string | null;
}): Promise<void> {
  const {
    lockKey,
    claimNonce,
    normalized,
    toast,
    setShopifyShop,
    setShopifyConnectionId,
    setShopifyClaimBusy,
    setShopifyLinkSignInHintShop,
    afterClaim,
    hydrateShopifySession,
    claimBrandId,
  } = opts;

  setShopifyClaimBusy(true);
  try {
    const outcome = await completeShopifyInstallClaimFlow({
      claimNonce,
      normalized,
      toast,
      setShopifyShop,
      setShopifyConnectionId,
      claimBrandId,
    });
    if (outcome === "deferred_sign_in") {
      const hint =
        normalized.trim() || readPendingClaimShop().trim() || "your store";
      setShopifyLinkSignInHintShop(hint);
    }
    if (outcome === "linked") {
      setShopifyLinkSignInHintShop(null);
    }
  } finally {
    setShopifyClaimBusy(false);
    clearRefundOAuthProcLock(lockKey);
    afterClaim();
    void hydrateShopifySession();
  }
}
