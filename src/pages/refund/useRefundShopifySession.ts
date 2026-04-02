import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShopifyCredential,
  isShopifyCredentialsSupabasePersistenceEnabled,
  upsertShopifyCredential,
} from "@/lib/shopify-credentials";
import { supabase } from "@/integrations/supabase/client";

export function useRefundShopifySession() {
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
    if (session && shop) {
      const row = await fetchShopifyCredential(shop);
      setShopifyToken(
        row?.access_token ?? localStorage.getItem("shopify_admin_token") ?? ""
      );
    } else {
      setShopifyToken(localStorage.getItem("shopify_admin_token") ?? "");
    }
  }, []);

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

  return {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    handleShopifyAfterSave,
  };
}
