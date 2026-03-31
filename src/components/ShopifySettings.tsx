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
}

export function ShopifySettings({
  shop,
  adminAccessToken,
  onShopChange,
  onAdminTokenChange,
}: ShopifySettingsProps) {
  const [shopValue, setShopValue] = useState(shop);
  const [tokenValue, setTokenValue] = useState(adminAccessToken);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setShopValue(shop);
  }, [shop]);

  useEffect(() => {
    setTokenValue(adminAccessToken);
  }, [adminAccessToken]);

  const handleSave = () => {
    onShopChange(shopValue.trim());
    onAdminTokenChange(tokenValue.trim());
    localStorage.setItem("shopify_shop", shopValue.trim());
    localStorage.setItem("shopify_admin_token", tokenValue.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            Token stays in this browser (localStorage). In dev, requests go through the Vite proxy to avoid CORS.
          </p>
          <Button size="sm" onClick={handleSave} className="w-full">
            {saved ? (
              <>
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Saved
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
