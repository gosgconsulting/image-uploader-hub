import { useEffect, useState, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Circle,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllImportImageRows } from "@/lib/fetch-all-import-images";
import {
  fetchShopifyProductMedia,
  type ShopifyProductMediaMap,
} from "@/lib/shopify-product-media";

interface ImportImageStatusRow {
  id: string;
  file_name: string;
  file_url: string;
  status: string;
  shopify_product_id: string | null;
  shopify_product_name: string | null;
  shopify_media_id: string | null;
  error_message: string | null;
  attempts: number;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

interface ImportStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string;
  importStatus: string;
  brandId?: string | null;
}

const STATUS_META: Record<
  string,
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "PENDING", tone: "text-muted-foreground", Icon: Circle },
  uploading: { label: "UPLOADING", tone: "text-blue-500", Icon: Loader2 },
  succeeded: { label: "SUCCEEDED", tone: "text-emerald-600", Icon: CheckCircle2 },
  failed: { label: "FAILED", tone: "text-destructive", Icon: XCircle },
  skipped: { label: "SKIPPED", tone: "text-muted-foreground", Icon: Clock },
};

function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const { Icon } = meta;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] ${meta.tone}`}>
      <Icon className={`h-3 w-3 ${status === "uploading" ? "animate-spin" : ""}`} />
      {meta.label}
    </span>
  );
}

function Thumb({ src, alt, size = "h-10 w-10" }: { src: string; alt: string; size?: string }) {
  return (
    <div className={`${size} shrink-0 rounded border bg-muted overflow-hidden`}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

export function ImportStatusModal({
  open,
  onOpenChange,
  importId,
  batchName,
  importStatus,
  brandId = null,
}: ImportStatusModalProps) {
  const [rows, setRows] = useState<ImportImageStatusRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [shopifyMedia, setShopifyMedia] = useState<ShopifyProductMediaMap>({});
  const [mediaLoading, setMediaLoading] = useState(false);

  const fetchRows = async (id: string) => {
    setLoading(true);
    const result = await fetchAllImportImageRows<ImportImageStatusRow>(supabase, {
      importId: id,
      select:
        "id, file_name, file_url, status, shopify_product_id, shopify_product_name, shopify_media_id, error_message, attempts, started_at, completed_at, updated_at",
    });
    setLoading(false);
    if (!result.ok) {
      console.error("ImportStatusModal fetch", result.error);
      setRows([]);
      return;
    }
    setRows(result.rows);
  };

  useEffect(() => {
    if (open && importId) void fetchRows(importId);
    if (!open) {
      setRows([]);
      setShopifyMedia({});
    }
  }, [open, importId]);

  // Auto-refresh while the import is still active.
  useEffect(() => {
    if (!open || !importId) return;
    const active = importStatus === "queued" || importStatus === "processing";
    if (!active) return;
    const t = setInterval(() => void fetchRows(importId), 3000);
    return () => clearInterval(t);
  }, [open, importId, importStatus]);

  // After rows load, fetch existing Shopify media for any mapped products.
  const productIdsKey = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((r) => r.shopify_product_id)
            .filter((v): v is string => !!v && v.length > 0),
        ),
      )
        .sort()
        .join(","),
    [rows],
  );

  useEffect(() => {
    if (!open || !brandId || !productIdsKey) return;
    const ids = productIdsKey.split(",").filter(Boolean);
    if (ids.length === 0) return;
    let cancelled = false;
    setMediaLoading(true);
    void fetchShopifyProductMedia(brandId, ids).then((res) => {
      if (cancelled) return;
      setMediaLoading(false);
      if (res.ok) setShopifyMedia(res.products);
    });
    return () => {
      cancelled = true;
    };
  }, [open, brandId, productIdsKey]);

  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      succeeded: 0,
      failed: 0,
      uploading: 0,
      pending: 0,
      skipped: 0,
    };
    for (const r of rows) {
      if (r.status === "succeeded") c.succeeded += 1;
      else if (r.status === "failed") c.failed += 1;
      else if (r.status === "uploading") c.uploading += 1;
      else if (r.status === "pending") c.pending += 1;
      else if (r.status === "skipped") c.skipped += 1;
    }
    return c;
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono flex items-center gap-2">
            <span>{batchName}</span>
            <Badge variant="outline" className="font-mono text-[10px] uppercase">
              {importStatus}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>{counts.total} total</span>
          <span className="text-emerald-600">✓ {counts.succeeded}</span>
          <span className="text-destructive">✗ {counts.failed}</span>
          {counts.uploading > 0 && <span className="text-blue-500">↑ {counts.uploading}</span>}
          {counts.pending > 0 && <span>… {counts.pending}</span>}
          {counts.skipped > 0 && (
            <span title="Filename already on the product — skipped to avoid duplicates">
              = {counts.skipped} already on product
            </span>
          )}
          {mediaLoading && (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading existing images…
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="ml-auto h-7"
            onClick={() => importId && void fetchRows(importId)}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="overflow-y-auto min-h-0 mt-2 border rounded-md">
          <table className="w-full text-left">
            <thead className="bg-muted/40 border-b sticky top-0">
              <tr className="font-mono text-[10px] uppercase text-muted-foreground">
                <th className="px-3 py-2 font-medium">Uploaded</th>
                <th className="px-3 py-2 font-medium">Product</th>
                <th className="px-3 py-2 font-medium">Featured image</th>
                <th className="px-3 py-2 font-medium">Gallery</th>
                <th className="px-3 py-2 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No images in this import.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const product = r.shopify_product_id ? shopifyMedia[r.shopify_product_id] : null;
                  const featured = product?.featured_image ?? null;
                  // Gallery excludes the featured image to avoid duplication, and excludes
                  // the just-uploaded media if Shopify already returned it.
                  const gallery = (product?.gallery ?? []).filter(
                    (g) => g.url !== featured?.url,
                  );
                  return (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/30 align-top">
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <Thumb src={r.file_url} alt={r.file_name} />
                          <div className="min-w-0">
                            <p className="text-xs font-mono truncate max-w-[180px]">
                              {r.file_name}
                            </p>
                            {r.attempts > 1 && (
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {r.attempts} attempts
                              </p>
                            )}
                            {r.error_message && (
                              <p className="text-[11px] text-destructive truncate max-w-[180px]">
                                {r.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-[11px] font-mono">
                        {r.shopify_product_name ? (
                          <span className="text-foreground">{r.shopify_product_name}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {featured ? (
                          <Thumb src={featured.url} alt={featured.alt ?? "featured"} />
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {product ? "—" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {gallery.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {gallery.slice(0, 6).map((g) => (
                              <Thumb
                                key={g.id ?? g.url}
                                src={g.url}
                                alt={g.alt ?? ""}
                                size="h-8 w-8"
                              />
                            ))}
                            {gallery.length > 6 && (
                              <span className="text-[10px] font-mono text-muted-foreground self-center">
                                +{gallery.length - 6}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {product ? "—" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <StatusPill status={r.status} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
