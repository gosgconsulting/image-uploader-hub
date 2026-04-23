import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  oauthUi: boolean;
  useManualAdminToken: boolean;
  onUseManualAdminTokenChange: (value: boolean) => void;
  tokenValue: string;
  onTokenValueChange: (value: string) => void;
  onClearConnectionError: () => void;
};

export function ShopifySettingsTokenControls({
  oauthUi,
  useManualAdminToken,
  onUseManualAdminTokenChange,
  tokenValue,
  onTokenValueChange,
  onClearConnectionError,
}: Props) {
  const showTokenField = !oauthUi || useManualAdminToken;

  return (
    <>
      {oauthUi ? (
        <div className="flex items-center gap-2.5 rounded-md border border-border/80 bg-muted/20 px-2.5 py-2">
          <Switch
            id="shopify-manual-admin-token"
            checked={useManualAdminToken}
            onCheckedChange={onUseManualAdminTokenChange}
            aria-label="Use my own Admin API access token instead of Connect"
          />
          <Label
            htmlFor="shopify-manual-admin-token"
            className="cursor-pointer text-[11px] font-normal leading-snug text-foreground"
          >
            Use my own Admin API access token instead of Connect
          </Label>
        </div>
      ) : null}
      {showTokenField ? (
        <div className="space-y-1.5">
          <Label className="font-mono text-xs uppercase tracking-wider">Admin API access token</Label>
          <Input
            type="password"
            placeholder="shpat_…"
            value={tokenValue}
            onChange={(e) => {
              onTokenValueChange(e.target.value);
              onClearConnectionError();
            }}
            autoComplete="off"
          />
        </div>
      ) : null}
    </>
  );
}
