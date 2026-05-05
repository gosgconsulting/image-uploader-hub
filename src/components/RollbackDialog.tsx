import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { History, Loader2, RotateCcw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  listImportSnapshots,
  restoreImportSnapshot,
  type SnapshotRow,
} from "@/lib/shopify-import-snapshots";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string | null;
  brandId: string | null | undefined;
};

type SnapshotBatch = {
  /** ISO string truncated to the second — snapshots taken in the same call share this. */
  takenAt: string;
  rows: SnapshotRow[];
  restored: boolean;
};

function groupByBatch(rows: SnapshotRow[]): SnapshotBatch[] {
  // Snapshots inserted in the same call share a `created_at` to ms granularity, but DB
  // server-side defaults can drift; bucket to the second to keep them together.
  const buckets = new Map<string, SnapshotBatch>();
  for (const r of rows) {
    const key = r.created_at.slice(0, 19);
    let b = buckets.get(key);
    if (!b) {
      b = { takenAt: r.created_at, rows: [], restored: true };
      buckets.set(key, b);
    }
    b.rows.push(r);
    if (!r.restored_at) b.restored = false;
  }
  return Array.from(buckets.values()).sort(
    (a, b) => +new Date(b.takenAt) - +new Date(a.takenAt),
  );
}

export function RollbackDialog({
  open,
  onOpenChange,
  importId,
  batchName,
  brandId,
}: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [rows, setRows] = useState<SnapshotRow[]>([]);
  const [confirmBatch, setConfirmBatch] = useState<SnapshotBatch | null>(null);

  useEffect(() => {
    if (!open || !importId) return;
    let cancelled = false;
    setLoading(true);
    void listImportSnapshots(importId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.ok) setRows(res.snapshots);
      else
        toast({
          title: "Could not load history",
          description: res.error,
          variant: "destructive",
        });
    });
    return () => {
      cancelled = true;
    };
  }, [open, importId, toast]);

  const batches = useMemo(() => groupByBatch(rows), [rows]);

  const doRestore = async () => {
    if (!brandId || !importId) return;
    setRestoring(true);
    try {
      const res = await restoreImportSnapshot({ brandId, importId });
      if (!res.ok) {
        toast({
          title: "Restore failed",
          description: res.error,
          variant: "destructive",
        });
        return;
      }
      const desc = res.failed
        ? `Restored ${res.restored} product${res.restored === 1 ? "" : "s"}, ${res.failed} failed.`
        : `Restored ${res.restored} product${res.restored === 1 ? "" : "s"}.`;
      toast({ title: "Rollback complete", description: desc });
      // Refresh local state.
      const refreshed = await listImportSnapshots(importId);
      if (refreshed.ok) setRows(refreshed.snapshots);
      setConfirmBatch(null);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm flex items-center gap-2">
              <History className="h-4 w-4" />
              Backup history — {batchName || "Import"}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs leading-relaxed">
              Snapshots are captured before each send when "Backup existing media" is checked.
              Click a date to restore that state. We re-add the saved image URLs to each
              product without removing current images.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="py-8 flex items-center justify-center text-xs font-mono text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading…
            </div>
          ) : batches.length === 0 ? (
            <div className="py-6 text-center">
              <AlertTriangle className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs font-mono text-muted-foreground">
                No backups for this import.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Send with "Backup existing media" checked to create one.
              </p>
            </div>
          ) : (
            <ul className="border rounded-md divide-y max-h-72 overflow-y-auto">
              {batches.map((b) => (
                <li
                  key={b.takenAt}
                  className="flex items-center justify-between px-3 py-2 text-xs font-mono"
                >
                  <div>
                    <p className="font-medium">
                      {format(new Date(b.takenAt), "MMM dd, yyyy · HH:mm:ss")}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {b.rows.length} product{b.rows.length === 1 ? "" : "s"} captured
                      {b.restored ? " · already restored" : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!brandId || restoring}
                    onClick={() => setConfirmBatch(b)}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmBatch}
        onOpenChange={(v) => {
          if (!v && !restoring) setConfirmBatch(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This re-adds {confirmBatch?.rows.length ?? 0} products' previous images to Shopify.
              It does NOT delete current media — you may end up with duplicates and need to tidy
              the gallery. Shopify CDN URLs of media that's already been deleted may fail to
              re-import; we'll report any errors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoring}
              onClick={(e) => {
                e.preventDefault();
                void doRestore();
              }}
            >
              {restoring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Restoring…
                </>
              ) : (
                "Restore"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
