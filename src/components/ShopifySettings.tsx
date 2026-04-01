import { useState, useEffect } from "react";
import { Store, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    setShopValue(shop);
  }, [shop]);

  useEffect(() => {
    setTokenValue(adminAccessToken);
  }, [adminAccessToken]);

  const handleSave = async () => {
    const s = shopValue.trim();
    const t = tokenValue.trim();
    onShopChange(s);
    onAdminTokenChange(t);
    localStorage.setItem("shopify_shop", s);
    setSaving(true);
    try {
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
              onChange={(e) => setShopValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-xs uppercase tracking-wider">Admin API access token</Label>
            <Input
              type="password"
              placeholder="shpat_…"
              value={tokenValue}
              onChange={(e) => setTokenValue(e.target.value)}
              autoComplete="off"
            />
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Signed-in users can save the token to Supabase for server-side refunds. Until then, the token
            stays in this browser (localStorage) for dev import enrichment via the Vite proxy.
          </p>
          <Button size="sm" onClick={() => void handleSave()} className="w-full" disabled={saving}>
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Saved
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
