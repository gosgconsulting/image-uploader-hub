import { useEffect, useLayoutEffect, type Dispatch, type SetStateAction } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  LS_SHOPIFY_CONNECTION_ID,
  SHOPIFY_OAUTH_RETURN_PARAM_KEYS,
  mergeShopifyOAuthParamsFromLocation,
  writePendingClaimToDurableStorage,
} from "./shopifyRefundSessionKeys";
import { refundOAuthDebugLog } from "./completeShopifyInstallClaimFlow";
import { runRefundOAuthInstallClaimSideEffects } from "./refundOAuthInstallClaimSideEffects";
import { isRefundOAuthProcLockBusy, setRefundOAuthProcLock } from "./refundOAuthProcLock";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

/**
 * Handles `?shopify_oauth=...` after Shopify redirects to Refund, and bare
 * `?shop=…&shopify_claim=…` (e.g. bookmarks or OAuth return without `shopify_oauth=`).
 */
export function useRefundShopifyOAuthReturnParams(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  toast: ToastFn,
  hydrateShopifySession: () => Promise<void>,
  setShopifyShop: Dispatch<SetStateAction<string>>,
  setShopifyConnectionId: Dispatch<SetStateAction<string>>,
  setShopifyClaimBusy: Dispatch<SetStateAction<boolean>>,
  setShopifyLinkSignInHintShop: Dispatch<SetStateAction<string | null>>
) {
  useLayoutEffect(() => {
    const live =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (!live) return;
    const next = new URLSearchParams(searchParams);
    let changed = false;
    for (const k of SHOPIFY_OAUTH_RETURN_PARAM_KEYS) {
      if (!next.has(k) && live.has(k)) {
        next.set(k, live.get(k)!);
        changed = true;
      }
    }
    if (changed) {
      refundOAuthDebugLog("router_synced_oauth_params_from_location", {
        current_url: window.location.href,
        merged_search: next.toString(),
      });
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const merged = mergeShopifyOAuthParamsFromLocation(searchParams);
    const o = merged.get("shopify_oauth");
    if (!o) return;

    const reason = merged.get("reason") ?? "";
    const shop = merged.get("shop") ?? "";
    const claimNonce = merged.get("shopify_claim") ?? "";
    refundOAuthDebugLog("oauth_query_detected", {
      shopify_oauth: o,
      current_url: typeof window !== "undefined" ? window.location.href : null,
      redirect_url_effective: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}${window.location.search}` : null,
      shop,
      shopify_admin_url: shop ? `https://${shop}` : null,
      claim_nonce: claimNonce || null,
      reason: o === "error" ? reason : undefined,
    });
    const connectionIdRaw = merged.get("shopify_connection_id")?.trim() ?? "";
    const normalized = shop ? normalizeShopDomain(shop) : "";

    const clearOAuthParams = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("shopify_oauth");
        next.delete("shop");
        next.delete("reason");
        next.delete("shopify_claim");
        next.delete("shopify_connection_id");
        return next;
      }, { replace: true });
    };

    if (o === "error") {
      toast({
        title: "Shopify connection failed",
        description: reason || "Unknown error",
        variant: "destructive",
      });
      clearOAuthParams();
      void hydrateShopifySession();
      return;
    }

    if (o !== "success") {
      clearOAuthParams();
      return;
    }

    if (!normalized && !claimNonce) {
      toast({
        title: "Shopify install completed",
        description: "Missing link data in the URL. Open the app from Shopify Admin again.",
      });
      clearOAuthParams();
      void hydrateShopifySession();
      return;
    }

    const lockKey = claimNonce
      ? `oauth_proc_nonce:${claimNonce}`
      : `oauth_proc_shop:${normalized}`;
    if (isRefundOAuthProcLockBusy(lockKey)) {
      refundOAuthDebugLog("oauth_query_skipped_in_flight_lock", { lock_key: lockKey });
      clearOAuthParams();
      return;
    }
    setRefundOAuthProcLock(lockKey);

    if (claimNonce && UUID_RE.test(claimNonce)) {
      writePendingClaimToDurableStorage(claimNonce, normalized);
    }

    if (normalized) {
      setShopifyShop(normalized);
      localStorage.setItem("shopify_shop", normalized);
    }
    if (connectionIdRaw && UUID_RE.test(connectionIdRaw)) {
      localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, connectionIdRaw);
      setShopifyConnectionId(connectionIdRaw);
    }

    void runRefundOAuthInstallClaimSideEffects({
      lockKey,
      claimNonce,
      normalized,
      toast,
      setShopifyShop,
      setShopifyConnectionId,
      setShopifyClaimBusy,
      setShopifyLinkSignInHintShop,
      afterClaim: clearOAuthParams,
      hydrateShopifySession,
    });
  }, [
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId,
    setShopifyClaimBusy,
    setShopifyLinkSignInHintShop,
  ]);

  useEffect(() => {
    const merged = mergeShopifyOAuthParamsFromLocation(searchParams);
    if (merged.get("shopify_oauth")) return;

    const claimNonce = merged.get("shopify_claim")?.trim() ?? "";
    const shop = merged.get("shop")?.trim() ?? "";
    if (!claimNonce || !shop || !UUID_RE.test(claimNonce)) return;

    const normalized = normalizeShopDomain(shop);
    if (!normalized.endsWith(".myshopify.com")) return;

    refundOAuthDebugLog("bare_claim_query_detected", {
      current_url: typeof window !== "undefined" ? window.location.href : null,
      shop: normalized,
      shopify_admin_url: `https://${normalized}`,
      claim_nonce: claimNonce,
    });

    const clearBareParams = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("shop");
        next.delete("shopify_claim");
        return next;
      }, { replace: true });
    };

    const lockKey = `oauth_proc_nonce:${claimNonce}`;
    if (isRefundOAuthProcLockBusy(lockKey)) {
      refundOAuthDebugLog("bare_claim_skipped_in_flight_lock", { lock_key: lockKey });
      clearBareParams();
      return;
    }
    setRefundOAuthProcLock(lockKey);

    writePendingClaimToDurableStorage(claimNonce, normalized);

    setShopifyShop(normalized);
    localStorage.setItem("shopify_shop", normalized);

    void runRefundOAuthInstallClaimSideEffects({
      lockKey,
      claimNonce,
      normalized,
      toast,
      setShopifyShop,
      setShopifyConnectionId,
      setShopifyClaimBusy,
      setShopifyLinkSignInHintShop,
      afterClaim: clearBareParams,
      hydrateShopifySession,
    });
  }, [
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId,
    setShopifyClaimBusy,
    setShopifyLinkSignInHintShop,
  ]);
}
