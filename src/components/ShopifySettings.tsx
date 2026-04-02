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
import { isShopifyCredentialsSupabasePersistenceEnabled } from "@/lib/shopify-credentials";
import { isShopifyOAuthEnabled } from "@/lib/shopifyOAuth";

interface ShopifySettingsProps {
  shop: string;
  adminAccessToken: string;
  onShopChange: (shop: string) => void;
  onAdminTokenChange: (token: string) => void;
  /** After local state + shop localStorage; return whether token was stored in Supabase. */
  onAfterSave?: (shop: string, token: string) => Promise<{ serverSaved: boolean }>;
}

export function ShopifySettings({
  shop,
  adminAccessToken,
  onShopChange,
  onAdminTokenChange,
  onAfterSave,
}: ShopifySettingsProps) {
  const [shopValue, setShopValue] = useState(shop);
  const [tokenValue, setTokenValue] = useState(adminAccessToken);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const showShopifyInstallHelp =
    isShopifyOAuthEnabled() && isShopifyCredentialsSupabasePersistenceEnabled();

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

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Store className="h-3.5 w-3.5 mr-1.5" />
          Shopify API
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-3">
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
          <p className="text-[11px] text-muted-foreground leading-snug">
            Use the <span className="font-mono">*.myshopify.com</span> hostname only (not a full Admin API
            URL).{" "}
            {isShopifyCredentialsSupabasePersistenceEnabled() ? (
              <>
                Signed-in users can save the token to Supabase for server-side refunds. Until then, the token
                stays in this browser (localStorage) for dev import enrichment via the Vite proxy.
              </>
            ) : (
              <>
                Supabase token storage is disabled for this build; the Admin token stays in this browser
                (localStorage) only.
              </>
            )}
          </p>
          {showShopifyInstallHelp ? (
            <div className="space-y-2 rounded-md border border-border/80 bg-muted/30 p-2.5">
              <p className="text-[11px] text-muted-foreground leading-snug">
                Install the app from <span className="font-medium text-foreground">Shopify Admin</span> (Apps →
                your app → Install). Shopify opens our app URL, then sends you back here. When you open the
                Refund page <span className="font-medium text-foreground">embedded</span> in Admin, bulk refunds
                can use Shopify session tokens (set <span className="font-mono">VITE_SHOPIFY_CLIENT_ID</span>
                ). <span className="font-medium text-foreground">Sign in</span> here if you also want the token
                in your account (<span className="font-mono">shopify_credentials</span>)—same idea as pasting a
                token manually.
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
              "Verifying & saving…"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
