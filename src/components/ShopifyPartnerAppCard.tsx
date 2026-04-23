import { useState, useEffect, useCallback } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  deleteBrandPartnerApp,
  fetchBrandPartnerAppPublic,
  shopifyOAuthInstallUrlForTenant,
  upsertBrandPartnerApp,
} from "@/lib/brandShopifyPartnerApp";

type Props = {
  brandId: string;
};

export function ShopifyPartnerAppCard({ brandId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [savedClientId, setSavedClientId] = useState("");
  const [clientIdInput, setClientIdInput] = useState("");
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchBrandPartnerAppPublic(brandId);
    setLoading(false);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setConfigured(res.configured);
    const cid = res.shopifyClientId ?? "";
    setSavedClientId(cid);
    setClientIdInput(cid);
    setClientSecretInput("");
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const installUrl = shopifyOAuthInstallUrlForTenant(brandId);

  const copyInstallUrl = useCallback(async () => {
    const text = shopifyOAuthInstallUrlForTenant(brandId);
    if (!text) {
      toast({
        title: "Nothing to copy",
        description: "Set VITE_SUPABASE_URL so the install URL can be built.",
        variant: "destructive",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Install App URL copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  }, [brandId, toast]);

  const handleSave = async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await upsertBrandPartnerApp(brandId, clientIdInput, clientSecretInput);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      setMessage("Partner app credentials saved.");
      setClientSecretInput("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const res = await deleteBrandPartnerApp(brandId);
      if (res.ok === false) {
        setError(res.error);
        return;
      }
      setMessage("Removed Partner app credentials.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-border/80 bg-muted/20 p-2.5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Your Shopify Partner app (optional)
      </p>
      <p className="text-[11px] text-muted-foreground leading-snug">
        Use your own app instead of platform Edge secrets: save the app&apos;s Client ID and Client
        secret here, then set the Partner app <span className="font-medium text-foreground">App URL</span>{" "}
        to the install link below. Allowed redirection URL(s) must include the{" "}
        <span className="font-mono">…/functions/v1/shopify-oauth</span> URL{" "}
        <span className="font-medium text-foreground">without</span>{" "}
        <span className="font-mono">?tenant=</span>. For <span className="font-medium text-foreground">embedded</span>{" "}
        Admin, set <span className="font-mono">VITE_SHOPIFY_CLIENT_ID</span> (or{" "}
        <span className="font-mono">VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID</span>) to this Partner app&apos;s{" "}
        <span className="font-medium text-foreground">public</span> Client ID so App Bridge matches the token your server verifies.
      </p>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Tenant id (brand id for App URL)</Label>
        <Input readOnly className="font-mono text-xs h-8" value={brandId} />
      </div>
      {installUrl ? (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Install App URL (copy to Partner Dashboard)</Label>
          <div className="flex gap-1">
            <Input
              readOnly
              title="Click to copy"
              className="font-mono text-[10px] h-auto py-1.5 leading-snug cursor-pointer"
              value={installUrl}
              onClick={() => void copyInstallUrl()}
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-auto shrink-0 px-2.5"
              title="Copy install URL"
              aria-label="Copy install URL"
              onClick={() => void copyInstallUrl()}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
      {loading ? (
        <p className="text-[11px] text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider">Partner Client ID</Label>
            <Input
              className="font-mono text-xs h-8"
              value={clientIdInput}
              onChange={(e) => setClientIdInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] uppercase tracking-wider">Partner Client secret</Label>
            <Input
              type="password"
              className="font-mono text-xs h-8"
              placeholder={configured ? "•••••••• (enter new secret to rotate)" : "shpss_…"}
              value={clientSecretInput}
              onChange={(e) => setClientSecretInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="flex-1"
              disabled={saving || !clientIdInput.trim() || !clientSecretInput.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? "Saving…" : "Save Partner app"}
            </Button>
            {configured ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => void handleRemove()}
              >
                Remove
              </Button>
            ) : null}
          </div>
          {savedClientId && configured ? (
            <p className="text-[10px] text-muted-foreground font-mono break-all">
              Saved Client ID: {savedClientId}
            </p>
          ) : null}
        </>
      )}
      {message ? (
        <p className="text-[11px] text-green-700 dark:text-green-400" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
