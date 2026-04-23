import { useState, useEffect, useRef } from "react";
import { Store, Check } from "lucide-react";
import { testShopifyAdminConnection } from "@/utils/shopifyOrder";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  hasShopifyAdminCredentials,
} from "@/lib/shopify-credentials";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import { beginShopifyManualOAuth, isShopifyOAuthEnabled } from "@/lib/shopifyOAuth";
import { writeOAuthTargetBrandId } from "@/lib/shopifySessionKeys";
import type { ShopifyLiveConnectionStatus } from "@/hooks/useShopifyLiveConnectionTest";
import { ShopifySettingsFormBody } from "@/components/ShopifySettingsFormBody";

interface ShopifySettingsProps {
  shop: string;
  adminAccessToken: string;
  onShopChange: (shop: string) => void;
  onAdminTokenChange: (token: string) => void;
  onAfterSave?: (shop: string, token: string) => Promise<{ serverSaved: boolean }>;
  liveConnectionStatus?: ShopifyLiveConnectionStatus;
  liveConnectionError?: string | null;
  layout?: "popover" | "inline";
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
  const oauthUi = isShopifyOAuthEnabled();
  const [useManualAdminToken, setUseManualAdminToken] = useState(
    () => oauthUi && Boolean(adminAccessToken.trim())
  );
  const [shopValue, setShopValue] = useState(shop);
  const [tokenValue, setTokenValue] = useState(adminAccessToken);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const sessionConnected = hasShopifyAdminCredentials(shop, adminAccessToken);
  const formShopMatchesSaved =
    normalizeShopDomain(shopValue) === normalizeShopDomain(shop);
  const useOAuthConnectFlow = oauthUi && !useManualAdminToken;

  const prevHydratedToken = useRef(adminAccessToken);
  useEffect(() => {
    if (!oauthUi) return;
    const next = adminAccessToken.trim();
    const prev = prevHydratedToken.current.trim();
    prevHydratedToken.current = adminAccessToken;
    if (next && !prev) {
      setUseManualAdminToken(true);
    }
  }, [oauthUi, adminAccessToken]);

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
      if (useOAuthConnectFlow) {
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
    <ShopifySettingsFormBody
      sessionConnected={sessionConnected}
      shop={shop}
      oauthUi={oauthUi}
      useManualAdminToken={useManualAdminToken}
      onUseManualAdminTokenChange={setUseManualAdminToken}
      shopValue={shopValue}
      onShopValueChange={setShopValue}
      tokenValue={tokenValue}
      onTokenValueChange={setTokenValue}
      liveConnectionStatus={liveConnectionStatus}
      liveConnectionError={liveConnectionError}
      formShopMatchesSaved={formShopMatchesSaved}
      useOAuthConnectFlow={useOAuthConnectFlow}
      connectionError={connectionError}
      onClearConnectionError={() => setConnectionError(null)}
      onSave={handleSave}
      saving={saving}
      saved={saved}
      oauthBrandId={oauthBrandId}
    />
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
      <PopoverContent className="w-[min(100vw-2rem,28rem)] max-h-[min(90vh,32rem)] overflow-y-auto" align="end">
        {formBody}
      </PopoverContent>
    </Popover>
  );
}
