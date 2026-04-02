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

    const pendingClaim = sessionStorage.getItem("shopify_pending_claim_shop");
    if (session && pendingClaim) {
      const claim = await claimShopifyInstall(pendingClaim);
      if (claim.ok) {
        sessionStorage.removeItem("shopify_pending_claim_shop");
        toast({
          title: "Shopify linked",
          description: "Your Admin install is now tied to this account for server-side refunds.",
        });
      }
    }

    if (session && shop) {
      const row = await fetchShopifyCredential(shop);
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

    if (o === "success" && shop) {
      const normalized = normalizeShopDomain(shop);
      if (normalized) {
        setShopifyShop(normalized);
        localStorage.setItem("shopify_shop", normalized);
      }

      void (async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session && normalized) {
          const claim = await claimShopifyInstall(normalized);
          if (!claim.ok) {
            toast({
              title: "Finish linking",
              description: "error" in claim ? claim.error : "Unknown error",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Shopify linked",
              description:
                "Install finished. This shop is tied to your account for server-side refunds.",
            });
          }
        } else if (normalized) {
          sessionStorage.setItem("shopify_pending_claim_shop", normalized);
          toast({
            title: "Almost done",
            description:
              "Sign in on this site with the same browser. Your shop will link automatically for refunds.",
          });
        } else {
          toast({
            title: "Shopify install completed",
            description: "Could not read shop from redirect; set the shop domain in settings if needed.",
          });
        }
        void hydrateShopifySession();
      })();
    } else if (o === "error") {
      toast({
        title: "Shopify connection failed",
        description: reason || "Unknown error",
        variant: "destructive",
      });
    }

    const next = new URLSearchParams(searchParams);
    next.delete("shopify_oauth");
    next.delete("shop");
    next.delete("reason");
    setSearchParams(next, { replace: true });
    if (o !== "success") {
      void hydrateShopifySession();
    }
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
