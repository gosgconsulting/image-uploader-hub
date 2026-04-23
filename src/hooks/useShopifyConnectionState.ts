import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  fetchShopifyCredentialForBrand,
  isShopifyCredentialsSupabasePersistenceEnabled,
  shouldLoadShopifyCredentialsFromSupabase,
  upsertShopifyCredential,
} from "@/lib/shopify-credentials";
import { shopDomainFromEmbeddedAppSearch } from "@/lib/shopifyEmbeddedContext";
import { supabase } from "@/integrations/supabase/client";
import { claimShopifyInstall } from "@/lib/shopifyOAuth";
import { useShopifyLiveConnectionTest } from "@/hooks/useShopifyLiveConnectionTest";
import { useShopifyOAuthReturnParams } from "@/hooks/useShopifyOAuthReturnParams";
import {
  LS_SHOPIFY_CONNECTION_ID,
  clearOAuthTargetBrandId,
  clearPendingClaimStorage,
  mergeShopifyOAuthParamsFromLocation,
  readOAuthTargetBrandId,
  readPendingClaimBrandId,
  readPendingClaimNonce,
  readPendingClaimShop,
} from "@/lib/shopifySessionKeys";

function resolveClaimBrandId(activeBrandId: string | null): string | undefined {
  const a = activeBrandId?.trim() || "";
  if (a) return a;
  const t = readOAuthTargetBrandId().trim();
  if (t) return t;
  const p = readPendingClaimBrandId().trim();
  if (p) return p;
  return undefined;
}

export function useShopifyConnectionState(brandId: string | null) {
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
  const [shopifyClaimBusy, setShopifyClaimBusy] = useState(false);
  const [shopifyLinkSignInHintShop, setShopifyLinkSignInHintShop] = useState<string | null>(null);
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

    const claimBrand = resolveClaimBrandId(brandId);

    const pendingNonce = readPendingClaimNonce();
    if (session && pendingNonce && !urlDrivesClaim) {
      setShopifyLinkSignInHintShop(null);
      setShopifyClaimBusy(true);
      try {
        const claim = await claimShopifyInstall({
          claimNonce: pendingNonce,
          brandId: claimBrand,
        });
        if (claim.ok) {
          clearPendingClaimStorage();
          clearOAuthTargetBrandId();
          setShopifyLinkSignInHintShop(null);
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
      } finally {
        setShopifyClaimBusy(false);
      }
    } else if (session && !urlDrivesClaim) {
      const pendingClaim = readPendingClaimShop();
      if (pendingClaim) {
        setShopifyLinkSignInHintShop(null);
        setShopifyClaimBusy(true);
        try {
          const claim = await claimShopifyInstall({
            shop: pendingClaim,
            brandId: claimBrand,
          });
          if (claim.ok) {
            clearPendingClaimStorage();
            clearOAuthTargetBrandId();
            setShopifyLinkSignInHintShop(null);
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
        } finally {
          setShopifyClaimBusy(false);
        }
      }
    }

    const activeBrand = brandId?.trim() || "";
    if (session && activeBrand) {
      const row = await fetchShopifyCredentialForBrand(activeBrand);
      if (row) {
        localStorage.setItem("shopify_shop", row.shop_domain);
        setShopifyShop(row.shop_domain);
        setShopifyToken(row.access_token ?? localStorage.getItem("shopify_admin_token") ?? "");
        localStorage.setItem(LS_SHOPIFY_CONNECTION_ID, row.id);
        setShopifyConnectionId(row.id);
      } else if (shouldLoadShopifyCredentialsFromSupabase()) {
        setShopifyToken("");
        setShopifyShop("");
        try {
          localStorage.removeItem("shopify_shop");
        } catch {
          /* */
        }
        localStorage.removeItem(LS_SHOPIFY_CONNECTION_ID);
        setShopifyConnectionId("");
      } else {
        const shopAfter = localStorage.getItem("shopify_shop") || "";
        setShopifyShop(shopAfter);
        setShopifyToken(localStorage.getItem("shopify_admin_token") ?? "");
      }
    } else {
      const shopAfter = localStorage.getItem("shopify_shop") || "";
      setShopifyShop(shopAfter);
      setShopifyToken(localStorage.getItem("shopify_admin_token") ?? "");
      if (session && !shopAfter) {
        localStorage.removeItem(LS_SHOPIFY_CONNECTION_ID);
        setShopifyConnectionId("");
      }
    }
  }, [toast, searchParams, brandId]);

  useShopifyOAuthReturnParams(
    searchParams,
    setSearchParams,
    toast,
    hydrateShopifySession,
    setShopifyShop,
    setShopifyConnectionId,
    setShopifyClaimBusy,
    setShopifyLinkSignInHintShop,
    brandId
  );

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const nonce = readPendingClaimNonce();
      const shop = readPendingClaimShop().trim();
      if (nonce && !session) {
        setShopifyLinkSignInHintShop(shop || "your store");
      } else if (!nonce) {
        setShopifyLinkSignInHintShop(null);
      }
    })();
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
      const bid = brandId?.trim() || "";
      if (session && token.trim()) {
        if (!bid) {
          toast({
            title: "Select a brand",
            description: "Choose a brand in the sidebar before saving Shopify credentials.",
            variant: "destructive",
          });
          return { serverSaved: false };
        }
        if (!isShopifyCredentialsSupabasePersistenceEnabled()) {
          toast({
            title: "Saved locally only",
            description:
              "Saving Shopify tokens to Supabase is off (set VITE_SAVE_SHOPIFY_CREDENTIALS=true to enable).",
          });
          return { serverSaved: false };
        }
        const { error, credentialId } = await upsertShopifyCredential(shop, token, bid);
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
          description:
            "No app session is active, so the token was not saved on the server. Add authentication (same browser) to enable server-side refunds, or keep using this device with the token in local storage.",
        });
      }
      return { serverSaved: false };
    },
    [toast, brandId]
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
    shopifyClaimBusy,
    shopifyLinkSignInHintShop,
    activeShopifyBrandId: brandId,
  };
}
