import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShopifyCredential,
  isShopifyCredentialsSupabasePersistenceEnabled,
  shouldLoadShopifyCredentialsFromSupabase,
  upsertShopifyCredential,
} from "@/lib/shopify-credentials";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { shopDomainFromEmbeddedAppSearch } from "@/lib/shopifyEmbeddedContext";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import { useShopifyLiveConnectionTest } from "@/hooks/useShopifyLiveConnectionTest";
import { useRefundShopifyOAuthReturnParams } from "@/pages/refund/useRefundShopifyOAuthReturnParams";
import {
  LS_SHOPIFY_CONNECTION_ID,
  clearPendingClaimStorage,
  mergeShopifyOAuthParamsFromLocation,
  readPendingClaimNonce,
  readPendingClaimShop,
} from "@/pages/refund/shopifyRefundSessionKeys";

export function useRefundShopifySession() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shopifyShop, setShopifyShop] = useState(
    () => localStorage.getItem("shopify_shop") || ""
  );
  const [shopifyToken, setShopifyToken] = useState(
    () => localStorage.getItem("shopify_admin_token") || ""
  );
  const [shopifyConnectionId, setShopifyConnectionId] = useState(
    () => localStorage.getItem(LS_SHOPIFY_CONNECTION_ID) || ""
  );
  const { toast } = useToast();

  const { shopifyLiveConnectionStatus, shopifyLiveConnectionError } =
    useShopifyLiveConnectionTest(shopifyShop, shopifyToken);

  const hydrateShopifySession = useCallback(async () => {
    const shop = localStorage.getItem("shopify_shop") || "";
    setShopifyShop(shop);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      localStorage.removeItem(LS_SHOPIFY_CONNECTION_ID);
      setShopifyConnectionId("");
    }

    const effectiveSearch = mergeShopifyOAuthParamsFromLocation(searchParams);
    const urlDrivesClaim =
      effectiveSearch.has("shopify_oauth") ||
      (effectiveSearch.has("shopify_claim") && effectiveSearch.has("shop"));

    const pendingNonce = readPendingClaimNonce();
    if (session && pendingNonce && !urlDrivesClaim) {
      const claim = await claimShopifyInstall({ claimNonce: pendingNonce });
      if (claim.ok) {
        clearPendingClaimStorage();
        if (claim.shop_domain) {
          localStorage.setItem("shopify_shop", claim.shop_domain);
          setShopifyShop(claim.shop_domain);
        }
        if (claim.credential_id) {
          localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, claim.credential_id);
          setShopifyConnectionId(claim.credential_id);
        }
        toast({
          title: "Shopify linked",
          description: "Your Admin install is now tied to this account for server-side refunds.",
        });
      }
    } else if (session && !urlDrivesClaim) {
      const pendingClaim = readPendingClaimShop();
      if (pendingClaim) {
        const claim = await claimShopifyInstall({ shop: pendingClaim });
        if (claim.ok) {
          clearPendingClaimStorage();
          if (claim.shop_domain) {
            localStorage.setItem("shopify_shop", claim.shop_domain);
            setShopifyShop(claim.shop_domain);
          }
          if (claim.credential_id) {
            localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, claim.credential_id);
            setShopifyConnectionId(claim.credential_id);
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
      if (row?.id) {
        localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, row.id);
        setShopifyConnectionId(row.id);
      } else if (shouldLoadShopifyCredentialsFromSupabase()) {
        localStorage.removeItem(LS_SHOPIFY_CONNECTION_ID);
        setShopifyConnectionId("");
      }
    } else {
      setShopifyToken(localStorage.getItem("shopify_admin_token") ?? "");
      if (session && !shopAfter) {
        localStorage.removeItem(LS_SHOPIFY_CONNECTION_ID);
        setShopifyConnectionId("");
      }
    }
  }, [toast, setShopifyConnectionId, searchParams]);

  useRefundShopifyOAuthReturnParams(
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId
  );

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
        const { error, credentialId } = await upsertShopifyCredential(shop, token);
        if (!error) {
          if (credentialId) {
            localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, credentialId);
            setShopifyConnectionId(credentialId);
          }
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
    [toast, setShopifyConnectionId]
  );

  const shopifyEmbeddedContextActive =
    shopDomainFromEmbeddedAppSearch(searchParams) !== null;

  return {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    shopifyConnectionId,
    handleShopifyAfterSave,
    shopifyEmbeddedContextActive,
    shopifyLiveConnectionStatus,
    shopifyLiveConnectionError,
  };
}
