import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShopifyCredential,
  isShopifyCredentialsSupabasePersistenceEnabled,
  upsertShopifyCredential,
} from "@/lib/shopify-credentials";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { shopDomainFromEmbeddedAppSearch } from "@/lib/shopifyEmbeddedContext";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";

const SS_CLAIM_NONCE = "shopify_pending_claim_nonce";
const SS_CLAIM_SHOP = "shopify_pending_claim_shop";

export function useRefundShopifySession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopifyShop, setShopifyShop] = useState(
    () => localStorage.getItem("shopify_shop") || ""
  );
  const [shopifyToken, setShopifyToken] = useState(
    () => localStorage.getItem("shopify_admin_token") || ""
  );
  const { toast } = useToast();

  const hydrateShopifySession = useCallback(async () => {
    const shop = localStorage.getItem("shopify_shop") || "";
    setShopifyShop(shop);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const pendingNonce = sessionStorage.getItem(SS_CLAIM_NONCE);
    if (session && pendingNonce) {
      const claim = await claimShopifyInstall({ claimNonce: pendingNonce });
      if (claim.ok) {
        sessionStorage.removeItem(SS_CLAIM_NONCE);
        sessionStorage.removeItem(SS_CLAIM_SHOP);
        if (claim.shop_domain) {
          localStorage.setItem("shopify_shop", claim.shop_domain);
          setShopifyShop(claim.shop_domain);
        }
        toast({
          title: "Shopify linked",
          description: "Your Admin install is now tied to this account for server-side refunds.",
        });
      }
    } else if (session) {
      const pendingClaim = sessionStorage.getItem(SS_CLAIM_SHOP);
      if (pendingClaim) {
        const claim = await claimShopifyInstall({ shop: pendingClaim });
        if (claim.ok) {
          sessionStorage.removeItem(SS_CLAIM_SHOP);
          if (claim.shop_domain) {
            localStorage.setItem("shopify_shop", claim.shop_domain);
            setShopifyShop(claim.shop_domain);
          }
          toast({
            title: "Shopify linked",
            description: "Your Admin install is now tied to this account for server-side refunds.",
          });
        }
      }
    }

    const shopAfter = localStorage.getItem("shopify_shop") || "";
    setShopifyShop(shopAfter);
    if (session && shopAfter) {
      const row = await fetchShopifyCredential(shopAfter);
      setShopifyToken(
        row?.access_token ?? localStorage.getItem("shopify_admin_token") ?? ""
      );
    } else {
      setShopifyToken(localStorage.getItem("shopify_admin_token") ?? "");
    }
  }, [toast]);

  useEffect(() => {
    void hydrateShopifySession();
  }, [hydrateShopifySession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void hydrateShopifySession();
    });
    return () => subscription.unsubscribe();
  }, [hydrateShopifySession]);

  useEffect(() => {
    const fromEmbed = shopDomainFromEmbeddedAppSearch(searchParams);
    if (!fromEmbed) return;

    const stored = localStorage.getItem("shopify_shop") || "";
    if (stored !== fromEmbed) {
      localStorage.setItem("shopify_shop", fromEmbed);
      setShopifyShop(fromEmbed);
    }
    void hydrateShopifySession();
  }, [searchParams, hydrateShopifySession]);

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
      sessionStorage.setItem(SS_CLAIM_NONCE, claimNonce);
    }

    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (normalized) {
            sessionStorage.setItem(SS_CLAIM_SHOP, normalized);
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
          sessionStorage.removeItem(SS_CLAIM_NONCE);
          sessionStorage.removeItem(SS_CLAIM_SHOP);
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
  }, [searchParams, setSearchParams, toast, hydrateShopifySession]);

  const handleShopifyAfterSave = useCallback(
    async (shop: string, token: string) => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && token.trim()) {
        if (!isShopifyCredentialsSupabasePersistenceEnabled()) {
          toast({
            title: "Saved locally only",
            description:
              "Saving Shopify tokens to Supabase is off (set VITE_SAVE_SHOPIFY_CREDENTIALS=true to enable).",
          });
          return { serverSaved: false };
        }
        const { error } = await upsertShopifyCredential(shop, token);
        if (!error) {
          toast({
            title: "Shopify credentials saved",
            description: "Token stored in Supabase for server-side refunds.",
          });
          return { serverSaved: true };
        }
        toast({
          title: "Could not save credentials",
          description: error.message,
          variant: "destructive",
        });
      } else if (!session && token.trim()) {
        toast({
          title: "Saved locally only",
          description: "Sign in to store your Admin token for bulk Shopify refunds.",
        });
      }
      return { serverSaved: false };
    },
    [toast]
  );

  const shopifyEmbeddedContextActive =
    shopDomainFromEmbeddedAppSearch(searchParams) !== null;

  return {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    handleShopifyAfterSave,
    shopifyEmbeddedContextActive,
  };
}
