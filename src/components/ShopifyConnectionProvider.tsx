import { createContext, useContext, type ReactNode } from "react";
import { useShopifyConnectionState } from "@/hooks/useShopifyConnectionState";

export type ShopifyConnectionContextValue = ReturnType<typeof useShopifyConnectionState>;

const ShopifyConnectionContext = createContext<ShopifyConnectionContextValue | null>(null);

export function ShopifyConnectionProvider({
  children,
  brandId,
}: {
  children: ReactNode;
  /** Dashboard brand; Shopify credentials are loaded and saved per brand. */
  brandId: string | null;
}) {
  const value = useShopifyConnectionState(brandId);
  return (
    <ShopifyConnectionContext.Provider value={value}>
      {children}
    </ShopifyConnectionContext.Provider>
  );
}

export function useShopifyConnection(): ShopifyConnectionContextValue {
  const ctx = useContext(ShopifyConnectionContext);
  if (!ctx) {
    throw new Error("useShopifyConnection must be used within ShopifyConnectionProvider");
  }
  return ctx;
}
