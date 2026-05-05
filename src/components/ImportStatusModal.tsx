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
      <Icon
        className={`h-3 w-3 ${status === "uploading" ? "animate-spin" : ""}`}
      />
      {meta.label}
    </span>
  );
}

export function ImportStatusModal({
  open,
  onOpenChange,
  importId,
  batchName,
  importStatus,
}: ImportStatusModalProps) {
  const [rows, setRows] = useState<ImportImageStatusRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRows = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("import_images")
      .select(
        "id, file_name, file_url, status, shopify_product_id, shopify_product_name, shopify_media_id, error_message, attempts, started_at, completed_at, updated_at",
      )
      .eq("import_id", id)
      .order("created_at", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("ImportStatusModal fetch", error);
      setRows([]);
      return;
    }
    setRows((data ?? []) as unknown as ImportImageStatusRow[]);
  };

  // Initial load when opened.
  useEffect(() => {
    if (open && importId) void fetchRows(importId);
    if (!open) setRows([]);
  }, [open, importId]);

  // Auto-refresh while the import is still active.
  useEffect(() => {
    if (!open || !importId) return;
    const active = importStatus === "queued" || importStatus === "processing";
    if (!active) return;
    const t = setInterval(() => void fetchRows(importId), 3000);
    return () => clearInterval(t);
  }, [open, importId, importStatus]);

  const counts = useMemo(() => {
    const c = { total: rows.length, succeeded: 0, failed: 0, uploading: 0, pending: 0 };
    for (const r of rows) {
      if (r.status === "succeeded") c.succeeded += 1;
      else if (r.status === "failed") c.failed += 1;
      else if (r.status === "uploading") c.uploading += 1;
      else if (r.status === "pending") c.pending += 1;
    }
    return c;
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
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
          {counts.uploading > 0 && (
            <span className="text-blue-500">↑ {counts.uploading}</span>
          )}
          {counts.pending > 0 && <span>… {counts.pending}</span>}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className="ml-auto h-7"
            onClick={() => importId && void fetchRows(importId)}
            disabled={loading}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        <div className="overflow-y-auto min-h-0 mt-2 border rounded-md divide-y">
          {rows.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No images in this import.
            </p>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 p-2 hover:bg-muted/40"
              >
                <div className="h-10 w-10 shrink-0 rounded border bg-muted overflow-hidden">
                  <img
                    src={r.file_url}
                    alt={r.file_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono truncate">{r.file_name}</p>
                  {r.shopify_product_name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      → {r.shopify_product_name}
                    </p>
                  )}
                  {r.error_message && (
                    <p className="text-[11px] text-destructive truncate">
                      {r.error_message}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <StatusPill status={r.status} />
                  {r.attempts > 1 && (
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                      {r.attempts} attempts
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
