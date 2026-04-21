import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import type { ShopifyLiveConnectionStatus } from "@/hooks/useShopifyLiveConnectionTest";

type Props = {
  sessionConnected: boolean;
  shop: string;
  oauthUi: boolean;
  liveConnectionStatus?: ShopifyLiveConnectionStatus;
  liveConnectionError?: string | null;
  formShopDiffers: boolean;
  shopFieldValue: string;
};

export function ShopifySettingsStatusBlock({
  sessionConnected,
  shop,
  oauthUi,
  liveConnectionStatus,
  liveConnectionError,
  formShopDiffers,
  shopFieldValue,
}: Props) {
  return (
    <>
      <div
        className={`rounded-md border px-2.5 py-2 text-[11px] leading-snug ${
          sessionConnected
            ? "border-green-600/35 bg-green-500/10"
            : "border-border/80 bg-muted/30"
        }`}
        role="status"
      >
        {sessionConnected ? (
          <div className="space-y-1.5 text-foreground">
            <p>
              <span className="font-medium text-green-700 dark:text-green-400">Connected</span>{" "}
              <span className="font-mono">{normalizeShopDomain(shop)}</span>
              {liveConnectionStatus === "ok" ? (
                <span className="text-muted-foreground font-normal"> — Admin API OK</span>
              ) : null}
            </p>
            {liveConnectionStatus === "checking" ? (
              <p className="text-[10px] text-muted-foreground">Verifying with Shopify…</p>
            ) : null}
            {liveConnectionStatus === "failed" && liveConnectionError ? (
              <p className="text-[10px] text-destructive leading-snug" role="alert">
                Live check failed: {liveConnectionError}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Not connected</span>
            {oauthUi
              ? " — use Connect below or install the app from Shopify Admin."
              : " — enter your shop and Admin token, then Save."}
          </p>
        )}
      </div>
      {sessionConnected && formShopDiffers && shopFieldValue.trim() ? (
        <p className="text-[10px] text-amber-700 dark:text-amber-500 leading-snug" role="note">
          Shop field differs from your saved shop. Save or Connect to switch.
        </p>
      ) : null}
    </>
  );
}
