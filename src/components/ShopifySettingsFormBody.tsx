import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isShopifyCredentialsSupabasePersistenceEnabled } from "@/lib/shopify-credentials";
import type { ShopifyLiveConnectionStatus } from "@/hooks/useShopifyLiveConnectionTest";
import { ShopifySettingsStatusBlock } from "@/components/ShopifySettingsStatusBlock";
import { ShopifySettingsTokenControls } from "@/components/ShopifySettingsTokenControls";
import { ShopifyPartnerAppCard } from "@/components/ShopifyPartnerAppCard";

export type ShopifySettingsFormBodyProps = {
  sessionConnected: boolean;
  shop: string;
  oauthUi: boolean;
  useManualAdminToken: boolean;
  onUseManualAdminTokenChange: (value: boolean) => void;
  shopValue: string;
  onShopValueChange: (value: string) => void;
  tokenValue: string;
  onTokenValueChange: (value: string) => void;
  liveConnectionStatus?: ShopifyLiveConnectionStatus;
  liveConnectionError?: string | null;
  formShopMatchesSaved: boolean;
  useOAuthConnectFlow: boolean;
  connectionError: string | null;
  onClearConnectionError: () => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  oauthBrandId?: string | null;
};

export function ShopifySettingsFormBody({
  sessionConnected,
  shop,
  oauthUi,
  useManualAdminToken,
  onUseManualAdminTokenChange,
  shopValue,
  onShopValueChange,
  tokenValue,
  onTokenValueChange,
  liveConnectionStatus,
  liveConnectionError,
  formShopMatchesSaved,
  useOAuthConnectFlow,
  connectionError,
  onClearConnectionError,
  onSave,
  saving,
  saved,
  oauthBrandId,
}: ShopifySettingsFormBodyProps) {
  const helperParagraph = useOAuthConnectFlow ? (
    <>
      Enter your <span className="font-mono">*.myshopify.com</span> hostname, then connect—you will
      approve the app in Shopify and return here.{" "}
      <span className="font-medium text-foreground">Sign in</span> first to attach the Admin token to
      your account for server-side refunds
      {isShopifyCredentialsSupabasePersistenceEnabled()
        ? " (and ensure saving credentials is enabled for this build)."
        : " (enable saving credentials in env if you use Supabase token storage)."}
    </>
  ) : (
    <>
      Use the <span className="font-mono">*.myshopify.com</span> hostname only (not a full Admin API
      URL).{" "}
      {isShopifyCredentialsSupabasePersistenceEnabled() ? (
        <>
          Signed-in users can save the token to Supabase for server-side refunds. Until then, the
          token stays in this browser (localStorage) for dev import enrichment via the Vite proxy.
        </>
      ) : (
        <>
          Supabase token storage is disabled for this build; the Admin token stays in this browser
          (localStorage) only.
        </>
      )}
    </>
  );

  return (
    <div className="space-y-3">
      <ShopifySettingsStatusBlock
        sessionConnected={sessionConnected}
        shop={shop}
        oauthUi={oauthUi}
        manualTokenMode={oauthUi && useManualAdminToken}
        liveConnectionStatus={liveConnectionStatus}
        liveConnectionError={liveConnectionError}
        formShopDiffers={sessionConnected && !formShopMatchesSaved}
        shopFieldValue={shopValue}
      />
      <div className="space-y-1.5">
        <Label className="font-mono text-xs uppercase tracking-wider">Shop domain</Label>
        <Input
          placeholder="your-store.myshopify.com"
          value={shopValue}
          onChange={(e) => {
            onShopValueChange(e.target.value);
            onClearConnectionError();
          }}
          autoComplete="off"
        />
      </div>
      <ShopifySettingsTokenControls
        oauthUi={oauthUi}
        useManualAdminToken={useManualAdminToken}
        onUseManualAdminTokenChange={(v) => {
          onUseManualAdminTokenChange(v);
          onClearConnectionError();
        }}
        tokenValue={tokenValue}
        onTokenValueChange={onTokenValueChange}
        onClearConnectionError={onClearConnectionError}
      />
      <p className="text-[11px] text-muted-foreground leading-snug">{helperParagraph}</p>
      {useOAuthConnectFlow ? (
        <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-2.5">
          <p className="text-[11px] text-muted-foreground leading-snug">
            You can also install from <span className="font-medium text-foreground">Shopify Admin</span>{" "}
            (Apps → your app). Embedded flows need the app&apos;s public Client ID:{" "}
            <span className="font-mono">VITE_SHOPIFY_CLIENT_ID</span> or{" "}
            <span className="font-mono">VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID</span> (must match Edge secrets),
            unless you use a saved Partner app below.
          </p>
        </div>
      ) : null}
      {oauthUi && oauthBrandId?.trim() ? (
        <ShopifyPartnerAppCard brandId={oauthBrandId.trim()} />
      ) : null}
      {connectionError ? (
        <p className="text-[11px] text-destructive leading-snug" role="alert">
          {connectionError}
        </p>
      ) : null}
      <Button size="sm" onClick={() => void onSave()} className="w-full" disabled={saving}>
        {saved ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Saved
          </>
        ) : saving ? (
          useOAuthConnectFlow ? (
            "Starting OAuth…"
          ) : (
            "Verifying & saving…"
          )
        ) : useOAuthConnectFlow ? (
          sessionConnected ? (
            "Reconnect with Shopify"
          ) : (
            "Connect with Shopify"
          )
        ) : (
          "Save"
        )}
      </Button>
    </div>
  );
}
