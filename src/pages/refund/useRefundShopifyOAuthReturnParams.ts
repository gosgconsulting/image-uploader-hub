import { useEffect, type Dispatch, type SetStateAction } from "react";
import type { SetURLSearchParams } from "react-router-dom";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast";
import {
  SS_SHOPIFY_CLAIM_NONCE,
  SS_SHOPIFY_CLAIM_SHOP,
} from "@/pages/refund/shopifyRefundSessionKeys";

type ToastFn = (props: ToastProps & { action?: ToastActionElement }) => void;

/**
 * Handles `?shopify_oauth=...` on the Refund URL after Shopify redirects back.
 */
export function useRefundShopifyOAuthReturnParams(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  toast: ToastFn,
  hydrateShopifySession: () => Promise<void>,
  setShopifyShop: Dispatch<SetStateAction<string>>
) {
  useEffect(() => {
    const o = searchParams.get("shopify_oauth");
    if (!o) return;

    const reason = searchParams.get("reason") ?? "";
    const shop = searchParams.get("shop") ?? "";
    const claimNonce = searchParams.get("shopify_claim") ?? "";
    const normalized = shop ? normalizeShopDomain(shop) : "";

    const clearOAuthParams = () => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("shopify_oauth");
        next.delete("shop");
        next.delete("reason");
        next.delete("shopify_claim");
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
    if (claimNonce) {
      sessionStorage.setItem(SS_SHOPIFY_CLAIM_NONCE, claimNonce);
    }

    void (async () => {
      try {
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
      } finally {
        sessionStorage.removeItem(lockKey);
        clearOAuthParams();
        void hydrateShopifySession();
      }
    })();
  }, [searchParams, setSearchParams, toast, hydrateShopifySession, setShopifyShop]);
}
