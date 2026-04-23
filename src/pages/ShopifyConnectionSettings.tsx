import { Store } from "lucide-react";
import { ShopifySettings } from "@/components/ShopifySettings";
import { useShopifyConnection } from "@/components/ShopifyConnectionProvider";

export default function ShopifyConnectionSettings() {
  const {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    handleShopifyAfterSave,
    shopifyLiveConnectionStatus,
    shopifyLiveConnectionError,
    activeShopifyBrandId,
  } = useShopifyConnection();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-mono font-semibold tracking-tight">Shopify connection</h1>
          <p className="text-xs text-muted-foreground">
            Connect your store for refunds, image workflows, and Admin API features
          </p>
        </div>
      </div>

      <ShopifySettings
        layout="inline"
        shop={shopifyShop}
        adminAccessToken={shopifyToken}
        onShopChange={setShopifyShop}
        onAdminTokenChange={setShopifyToken}
        onAfterSave={handleShopifyAfterSave}
        liveConnectionStatus={shopifyLiveConnectionStatus}
        liveConnectionError={shopifyLiveConnectionError}
        oauthBrandId={activeShopifyBrandId}
      />
    </div>
  );
}
