import { useEffect, useState } from "react";
import { hasShopifyAdminCredentials } from "@/lib/shopify-credentials";
import { testShopifyAdminConnection } from "@/utils/shopifyOrder";

export type ShopifyLiveConnectionStatus = "idle" | "checking" | "ok" | "failed";

/**
 * On mount and whenever shop/token change, pings Shopify Admin `GET shop.json` once.
 * Skips when credentials are incomplete.
 */
export function useShopifyLiveConnectionTest(shop: string, token: string) {
  const [status, setStatus] = useState<ShopifyLiveConnectionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasShopifyAdminCredentials(shop, token)) {
      setStatus("idle");
      setError(null);
      return;
    }

    let cancelled = false;
    setStatus("checking");
    setError(null);

    void testShopifyAdminConnection(shop, token).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setStatus("ok");
        setError(null);
      } else {
        setStatus("failed");
        setError(r.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shop, token]);

  return { shopifyLiveConnectionStatus: status, shopifyLiveConnectionError: error };
}
