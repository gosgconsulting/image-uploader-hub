import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  LS_SHOPIFY_CONNECTION_ID,
  SS_SHOPIFY_CLAIM_NONCE,
  SS_SHOPIFY_CLAIM_SHOP,
} from "@/pages/refund/shopifyRefundSessionKeys";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

async function completeShopifyInstallClaimFlow(opts: {
  claimNonce: string;
  normalized: string;
  toast: ToastFn;
  setShopifyShop: Dispatch<SetStateAction<string>>;
  setShopifyConnectionId: Dispatch<SetStateAction<string>>;
}): Promise<void> {
  const { claimNonce, normalized, toast, setShopifyShop, setShopifyConnectionId } = opts;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    if (normalized) {
      sessionStorage.setItem(SS_SHOPIFY_CLAIM_SHOP, normalized);
    }
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
    sessionStorage.removeItem(SS_SHOPIFY_CLAIM_NONCE);
    sessionStorage.removeItem(SS_SHOPIFY_CLAIM_SHOP);
    if (claimResult.shop_domain) {
      localStorage.setItem("shopify_shop", claimResult.shop_domain);
      setShopifyShop(claimResult.shop_domain);
    }
    const cid = claimResult.credential_id?.trim() ?? "";
    if (cid && UUID_RE.test(cid)) {
      localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, cid);
      setShopifyConnectionId(cid);
    }
    toast({
      title: "Shopify linked",
      description:
        "Install finished. This shop is tied to your account for server-side refunds.",
    });
  } else {
    toast({
      title: "Finish linking",
      description: "error" in claimResult ? claimResult.error : "Unknown error",
      variant: "destructive",
    });
  }
}

/**
 * Handles `?shopify_oauth=...` after Shopify redirects to Refund, and bare
 * `?shop=…&shopify_claim=…` (e.g. from bookmarks or the embedded install escape URL).
 */
export function useRefundShopifyOAuthReturnParams(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  toast: ToastFn,
  hydrateShopifySession: () => Promise<void>,
  setShopifyShop: Dispatch<SetStateAction<string>>,
  setShopifyConnectionId: Dispatch<SetStateAction<string>>
) {
  useEffect(() => {
    const o = searchParams.get("shopify_oauth");
    if (!o) return;

    const reason = searchParams.get("reason") ?? "";
    const shop = searchParams.get("shop") ?? "";
    const claimNonce = searchParams.get("shopify_claim") ?? "";
    const connectionIdRaw = searchParams.get("shopify_connection_id")?.trim() ?? "";
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
    if (sessionStorage.getItem(lockKey)) {
      clearOAuthParams();
      return;
    }
    sessionStorage.setItem(lockKey, "1");

    if (normalized) {
      setShopifyShop(normalized);
      localStorage.setItem("shopify_shop", normalized);
    }
    if (connectionIdRaw && UUID_RE.test(connectionIdRaw)) {
      localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, connectionIdRaw);
      setShopifyConnectionId(connectionIdRaw);
    }
    if (claimNonce) {
      sessionStorage.setItem(SS_SHOPIFY_CLAIM_NONCE, claimNonce);
    }

    void (async () => {
      try {
        await completeShopifyInstallClaimFlow({
          claimNonce,
          normalized,
          toast,
          setShopifyShop,
          setShopifyConnectionId,
        });
      } finally {
        sessionStorage.removeItem(lockKey);
        clearOAuthParams();
        void hydrateShopifySession();
      }
    })();
  }, [
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId,
  ]);

  useEffect(() => {
    if (searchParams.get("shopify_oauth")) return;

    const claimNonce = searchParams.get("shopify_claim")?.trim() ?? "";
    const shop = searchParams.get("shop")?.trim() ?? "";
    if (!claimNonce || !shop || !UUID_RE.test(claimNonce)) return;

    const normalized = normalizeShopDomain(shop);
    if (!normalized.endsWith(".myshopify.com")) return;

    const clearBareParams = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("shop");
        next.delete("shopify_claim");
        return next;
      }, { replace: true });
    };

    const lockKey = `oauth_proc_nonce:${claimNonce}`;
    if (sessionStorage.getItem(lockKey)) {
      clearBareParams();
      return;
    }
    sessionStorage.setItem(lockKey, "1");

    setShopifyShop(normalized);
    localStorage.setItem("shopify_shop", normalized);
    sessionStorage.setItem(SS_SHOPIFY_CLAIM_NONCE, claimNonce);

    void (async () => {
      try {
        await completeShopifyInstallClaimFlow({
          claimNonce,
          normalized,
          toast,
          setShopifyShop,
          setShopifyConnectionId,
        });
      } finally {
        sessionStorage.removeItem(lockKey);
        clearBareParams();
        void hydrateShopifySession();
      }
    })();
  }, [
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId,
  ]);
}
