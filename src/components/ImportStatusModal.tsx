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

interface ReorderSummary {
  processed?: number;
  moved?: number;
  variants_pinned?: number;
  failed?: number;
  errors?: Array<{ product_id?: string; error?: string }>;
}

interface ImportRowMeta {
  reorder_status: string | null;
  reorder_summary: ReorderSummary | null;
  reorder_started_at: string | null;
  reorder_completed_at: string | null;
}

const STATUS_META: Record<
  string,
  { label: string; tone: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  pending: { label: "PENDING", tone: "text-muted-foreground", Icon: Circle },
  uploading: { label: "UPLOADING", tone: "text-blue-500", Icon: Loader2 },
  succeeded: { label: "SUCCEEDED", tone: "text-emerald-600", Icon: CheckCircle2 },
  failed: { label: "FAILED", tone: "text-destructive", Icon: XCircle },
  // "Skipped from upload" — the reorder pass still resequences this image's
  // product, so it's not skipped end-to-end.
  skipped: { label: "ON PRODUCT", tone: "text-muted-foreground", Icon: Clock },
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

type PhaseState = "pending" | "running" | "done" | "failed" | "skipped";

function PhaseRow({
  state,
  label,
  detail,
}: {
  state: PhaseState;
  label: string;
  detail?: React.ReactNode;
}) {
  const Icon =
    state === "done"
      ? CheckCircle2
      : state === "failed"
        ? XCircle
        : state === "running"
          ? Loader2
          : Circle;
  const tone =
    state === "done"
      ? "text-emerald-600"
      : state === "failed"
        ? "text-destructive"
        : state === "running"
          ? "text-blue-500"
          : state === "skipped"
            ? "text-muted-foreground line-through"
            : "text-muted-foreground";
  return (
    <li className="flex items-start gap-2">
      <Icon
        className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${tone} ${state === "running" ? "animate-spin" : ""}`}
      />
      <div className="min-w-0">
        <span className={`font-mono text-xs ${tone}`}>{label}</span>
        {detail !== undefined && (
          <span className="ml-2 font-mono text-[11px] text-muted-foreground">
            {detail}
          </span>
        )}
      </div>
    </li>
  );
}

function PhaseChecklist({
  importStatus,
  counts,
  reorder,
}: {
  importStatus: string;
  counts: { total: number; succeeded: number; failed: number; skipped: number; pending: number };
  reorder: ImportRowMeta | null;
}) {
  // Phase 1 — Queued. Always reaches "done" the moment any row exists.
  const queueState: PhaseState = counts.total > 0 ? "done" : "pending";

  // Phase 2 — Upload pass. Active while import is queued/processing; reaches
  // "done" when status flips to completed/partial; "failed" if the whole
  // import failed.
  let uploadState: PhaseState;
  if (importStatus === "failed") uploadState = "failed";
  else if (importStatus === "completed" || importStatus === "partial")
    uploadState = "done";
  else if (importStatus === "queued" || importStatus === "processing")
    uploadState = "running";
  else uploadState = "pending";

  // Phase 3 — Variant-color reorder. We use the reorder_status column when
  // available, otherwise infer from import status (compat with pre-migration
  // databases — the reorder is fired the moment upload finalizes).
  let reorderState: PhaseState = "pending";
  if (reorder?.reorder_status === "completed") reorderState = "done";
  else if (reorder?.reorder_status === "failed") reorderState = "failed";
  else if (reorder?.reorder_status === "running") reorderState = "running";
  else if (reorder?.reorder_status === "skipped") reorderState = "skipped";
  else if (importStatus === "failed") reorderState = "skipped";
  else if (uploadState === "running") reorderState = "pending";
  else if (uploadState === "done") reorderState = "running"; // fallback when no column
  else reorderState = "pending";

  const uploadDetail = (
    <>
      {counts.succeeded} uploaded · {counts.skipped} already on product
      {counts.failed > 0 && ` · ${counts.failed} failed`}
      {counts.pending > 0 && ` · ${counts.pending} pending`}
    </>
  );

  let reorderDetail: React.ReactNode = null;
  const sum = reorder?.reorder_summary;
  if (reorderState === "done" && sum) {
    reorderDetail = (
      <>
        {sum.processed ?? 0} products · {sum.moved ?? 0} images moved ·{" "}
        {sum.variants_pinned ?? 0} variant images pinned
        {sum.failed && sum.failed > 0 ? ` · ${sum.failed} failed` : ""}
      </>
    );
  } else if (reorderState === "running") {
    reorderDetail = (
      <>Re-sorting every product's media by variant color (skipped images
        are still part of the reorder)</>
    );
  } else if (reorderState === "failed" && sum) {
    reorderDetail = <>{sum.failed ?? 0} of {sum.processed ?? 0} products errored</>;
  } else if (reorderState === "skipped") {
    reorderDetail = <>Upload didn't produce anything to reorder</>;
  } else {
    reorderDetail = <>Runs automatically once upload finishes</>;
  }

  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
        Pipeline
      </p>
      <ul className="space-y-1">
        <PhaseRow
          state={queueState}
          label="Queued"
          detail={counts.total > 0 ? `${counts.total} images` : "—"}
        />
        <PhaseRow
          state={uploadState}
          label="Upload to Shopify"
          detail={counts.total > 0 ? uploadDetail : "—"}
        />
        <PhaseRow
          state={reorderState}
          label="Variant-color reorder"
          detail={reorderDetail}
        />
      </ul>
    </div>
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
  const [importMeta, setImportMeta] = useState<ImportRowMeta | null>(null);

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

  /**
   * Fetch the import row's reorder columns. Wrapped in try/catch and a column-
   * specific fallback so a pre-migration database (where these columns don't
   * exist yet) doesn't break the modal — we just hide the reorder phase.
   */
  const fetchImportMeta = async (id: string) => {
    const tryFetch = async () => {
      const { data, error } = await supabase
        .from("shopify_imports")
        .select(
          "reorder_status, reorder_summary, reorder_started_at, reorder_completed_at",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as ImportRowMeta | null;
    };
    try {
      const meta = await tryFetch();
      setImportMeta(meta);
    } catch {
      setImportMeta(null);
    }
  };

  useEffect(() => {
    if (open && importId) {
      void fetchRows(importId);
      void fetchImportMeta(importId);
    }
    if (!open) {
      setRows([]);
      setShopifyMedia({});
      setImportMeta(null);
    }
  }, [open, importId]);

  // Auto-refresh while the import OR its reorder pass is still active.
  useEffect(() => {
    if (!open || !importId) return;
    const uploadActive =
      importStatus === "queued" || importStatus === "processing";
    const reorderActive =
      importMeta?.reorder_status === "running" ||
      importMeta?.reorder_status === "pending";
    if (!uploadActive && !reorderActive) return;
    const t = setInterval(() => {
      void fetchRows(importId);
      void fetchImportMeta(importId);
    }, 3000);
    return () => clearInterval(t);
  }, [open, importId, importStatus, importMeta?.reorder_status]);

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

        <PhaseChecklist
          importStatus={importStatus}
          counts={{
            total: counts.total,
            succeeded: counts.succeeded,
            failed: counts.failed,
            skipped: counts.skipped,
            pending: counts.pending + counts.uploading,
          }}
          reorder={importMeta}
        />

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-foreground">
          <span>{counts.total} total</span>
          <span className="text-emerald-600">✓ {counts.succeeded}</span>
          <span className="text-destructive">✗ {counts.failed}</span>
          {counts.uploading > 0 && <span className="text-blue-500">↑ {counts.uploading}</span>}
          {counts.pending > 0 && <span>… {counts.pending}</span>}
          {counts.skipped > 0 && (
            <span title="Filename already on the product — skipped from upload, but the variant-color reorder still applies to it.">
              = {counts.skipped} already on product (still reordered)
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
            onClick={() => {
              if (!importId) return;
              void fetchRows(importId);
              void fetchImportMeta(importId);
            }}
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
