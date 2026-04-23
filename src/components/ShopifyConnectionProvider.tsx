import { createContext, useContext, type ReactNode } from "react";
import { useShopifyConnectionState } from "@/hooks/useShopifyConnectionState";

export type ShopifyConnectionContextValue = ReturnType<typeof useShopifyConnectionState>;

const ShopifyConnectionContext = createContext<ShopifyConnectionContextValue | null>(null);

export function ShopifyConnectionProvider({ children }: { children: ReactNode }) {
  const value = useShopifyConnectionState();
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
