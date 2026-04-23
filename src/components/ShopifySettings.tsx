import { useState, useEffect } from "react";
import { Store, Check } from "lucide-react";
import { testShopifyAdminConnection } from "@/utils/shopifyOrder";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  hasShopifyAdminCredentials,
  isShopifyCredentialsSupabasePersistenceEnabled,
} from "@/lib/shopify-credentials";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { beginShopifyManualOAuth, isShopifyOAuthEnabled } from "@/lib/shopifyOAuth";
import { writeOAuthTargetBrandId } from "@/lib/shopifySessionKeys";
import type { ShopifyLiveConnectionStatus } from "@/hooks/useShopifyLiveConnectionTest";
import { ShopifySettingsStatusBlock } from "@/components/ShopifySettingsStatusBlock";

interface ShopifySettingsProps {
  shop: string;
  adminAccessToken: string;
  onShopChange: (shop: string) => void;
  onAdminTokenChange: (token: string) => void;
  /** After local state + shop localStorage; return whether token was stored in Supabase. */
  onAfterSave?: (shop: string, token: string) => Promise<{ serverSaved: boolean }>;
  /** Live `GET shop.json` check (e.g. from dashboard layout). */
  liveConnectionStatus?: ShopifyLiveConnectionStatus;
  liveConnectionError?: string | null;
  /** `popover`: header trigger + popover. `inline`: full-width card for settings page. */
  layout?: "popover" | "inline";
  /** Required for signed-in manual OAuth so the token is stored on the correct brand row. */
  oauthBrandId?: string | null;
}

export function ShopifySettings({
  shop,
  adminAccessToken,
  onShopChange,
  onAdminTokenChange,
  onAfterSave,
  liveConnectionStatus,
  liveConnectionError,
  layout = "popover",
  oauthBrandId,
}: ShopifySettingsProps) {
  const [shopValue, setShopValue] = useState(shop);
  const [tokenValue, setTokenValue] = useState(adminAccessToken);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const oauthUi = isShopifyOAuthEnabled();
  const sessionConnected = hasShopifyAdminCredentials(shop, adminAccessToken);
  const formShopMatchesSaved =
    normalizeShopDomain(shopValue) === normalizeShopDomain(shop);

  useEffect(() => {
    setShopValue(shop);
  }, [shop]);

  useEffect(() => {
    setTokenValue(adminAccessToken);
  }, [adminAccessToken]);

  const handleSave = async () => {
    const s = shopValue.trim();
    const t = tokenValue.trim();
    setConnectionError(null);
    setSaving(true);
    try {
      if (oauthUi) {
        if (!s) {
          setConnectionError("Enter your shop domain to connect with Shopify.");
          return;
        }
        if (oauthBrandId?.trim()) {
          writeOAuthTargetBrandId(oauthBrandId.trim());
        }
        const started = await beginShopifyManualOAuth(s, oauthBrandId ?? undefined);
        if (started.ok === false) {
          setConnectionError(started.error);
          return;
        }
        onShopChange(s);
        localStorage.setItem("shopify_shop", s);
        window.location.assign(started.authorizeUrl);
        return;
      }

      if (t) {
        if (!s) {
          setConnectionError("Enter your shop domain before saving a token.");
          return;
        }
        const ping = await testShopifyAdminConnection(s, t);
        if (ping.ok !== true) {
          setConnectionError(ping.error);
          return;
        }
      }

      onShopChange(s);
      onAdminTokenChange(t);
      localStorage.setItem("shopify_shop", s);
      if (onAfterSave) {
        const { serverSaved } = await onAfterSave(s, t);
        if (serverSaved) {
          localStorage.removeItem("shopify_admin_token");
        } else if (t) {
          localStorage.setItem("shopify_admin_token", t);
        }
      } else {
        if (t) localStorage.setItem("shopify_admin_token", t);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const formBody = (
    <div className="space-y-3">
      <ShopifySettingsStatusBlock
        sessionConnected={sessionConnected}
        shop={shop}
        oauthUi={oauthUi}
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
            setShopValue(e.target.value);
            setConnectionError(null);
          }}
          autoComplete="off"
        />
      </div>
      {oauthUi ? null : (
        <div className="space-y-1.5">
          <Label className="font-mono text-xs uppercase tracking-wider">Admin API access token</Label>
          <Input
            type="password"
            placeholder="shpat_…"
            value={tokenValue}
            onChange={(e) => {
              setTokenValue(e.target.value);
              setConnectionError(null);
            }}
            autoComplete="off"
          />
        </div>
      )}
      <p className="text-[11px] text-muted-foreground leading-snug">
        {oauthUi ? (
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
        )}
      </p>
      {oauthUi ? (
        <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-2.5">
          <p className="text-[11px] text-muted-foreground leading-snug">
            You can also install from <span className="font-medium text-foreground">Shopify Admin</span>{" "}
            (Apps → your app). Embedded flows can use App Bridge session tokens when{" "}
            <span className="font-mono">VITE_SHOPIFY_CLIENT_ID</span> is set.
          </p>
        </div>
      ) : null}
      {connectionError ? (
        <p className="text-[11px] text-destructive leading-snug" role="alert">
          {connectionError}
        </p>
      ) : null}
      <Button size="sm" onClick={() => void handleSave()} className="w-full" disabled={saving}>
        {saved ? (
          <>
            <Check className="h-3.5 w-3.5 mr-1.5" />
            Saved
          </>
        ) : saving ? (
          oauthUi ? (
            "Starting OAuth…"
          ) : (
            "Verifying & saving…"
          )
        ) : oauthUi ? (
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

  if (layout === "inline") {
    return <Card className="max-w-xl p-6">{formBody}</Card>;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          {sessionConnected ? (
            <Check className="h-3.5 w-3.5 mr-1.5 text-green-600 dark:text-green-400" />
          ) : (
            <Store className="h-3.5 w-3.5 mr-1.5" />
          )}
          {oauthUi ? "Shopify" : "Shopify API"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        {formBody}
      </PopoverContent>
    </Popover>
  );
}
