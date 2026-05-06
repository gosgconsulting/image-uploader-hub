import { useEffect, useRef, useState } from "react";
import { Loader2, Minimize2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  compressImportImages,
  countOversizeImages,
  type CompressItemResult,
  type CompressSummary,
} from "@/lib/compress-existing-images";

interface CompressImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string | null;
  onCompleted?: () => void;
}

type Stage =
  | { kind: "idle" }
  | { kind: "scanning" }
  | { kind: "ready"; total: number; oversized: number }
  | { kind: "running"; done: number; total: number; currentName: string }
  | { kind: "done"; summary: CompressSummary };

const TARGET_BYTES = 1_000_000;

function formatMB(bytes: number) {
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function CompressImagesDialog({
  open,
  onOpenChange,
  importId,
  batchName,
  onCompleted,
}: CompressImagesDialogProps) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [failures, setFailures] = useState<CompressItemResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  // Re-scan whenever the dialog opens for a (potentially different) import.
  useEffect(() => {
    if (!open || !importId) {
      setStage({ kind: "idle" });
      setFailures([]);
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    let cancelled = false;
    setStage({ kind: "scanning" });
    setFailures([]);
    void (async () => {
      const res = await countOversizeImages(importId, TARGET_BYTES);
      if (cancelled) return;
      if (!res.ok) {
        toast({
          title: "Could not scan images",
          description: res.error,
          variant: "destructive",
        });
        onOpenChange(false);
        return;
      }
      setStage({ kind: "ready", total: res.total, oversized: res.oversized });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, importId, onOpenChange, toast]);

  const isRunning = stage.kind === "running";

  const handleCompress = async () => {
    if (!importId) return;
    abortRef.current = new AbortController();
    setFailures([]);
    setStage({
      kind: "running",
      done: 0,
      total: stage.kind === "ready" ? stage.oversized : 0,
      currentName: "",
    });
    try {
      const summary = await compressImportImages(importId, {
        minSizeBytes: TARGET_BYTES,
        concurrency: 3,
        abortSignal: abortRef.current.signal,
        onProgress: (p) =>
          setStage({
            kind: "running",
            done: p.done,
            total: p.total,
            currentName: p.currentName,
          }),
        onItem: (r) => {
          if (!r.ok) setFailures((prev) => [...prev, r]);
        },
      });
      setStage({ kind: "done", summary });
      onCompleted?.();
      toast({
        title: "Compression finished",
        description:
          summary.processed > 0
            ? `Shrunk ${summary.processed} image${summary.processed === 1 ? "" : "s"}, saved ${formatMB(summary.bytesSaved)}.`
            : `Nothing to do — every image is already at or below ${formatMB(TARGET_BYTES)}.`,
      });
    } catch (err) {
      toast({
        title: "Compression failed",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      setStage({ kind: "idle" });
    }
  };

  const handleClose = (val: boolean) => {
    if (isRunning) return;
    onOpenChange(val);
  };

  const progressPct =
    stage.kind === "running" && stage.total > 0
      ? Math.round((stage.done / stage.total) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <Minimize2 className="h-4 w-4" />
            Compress images — {batchName || "Import"}
          </DialogTitle>
          <DialogDescription>
            Re-encodes oversized photos that haven't been pushed to Shopify yet,
            so the next send fits the 25 MB media limit. Targets{" "}
            <span className="font-mono">2048 px</span> max, JPEG quality 85,
            aiming below <span className="font-mono">1 MB</span> per image.
            Images already on Shopify are skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {stage.kind === "scanning" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning images…
            </div>
          )}

          {stage.kind === "ready" && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-mono text-xs text-muted-foreground">
                Scan results
              </div>
              {stage.total === 0 ? (
                <div>
                  No pending images — every photo in this batch is already on
                  Shopify.
                </div>
              ) : (
                <div>
                  <span className="font-mono">{stage.oversized}</span> of{" "}
                  <span className="font-mono">{stage.total}</span> pending
                  image{stage.total === 1 ? "" : "s"} are above{" "}
                  {formatMB(TARGET_BYTES)}.
                </div>
              )}
              {stage.oversized === 0 && stage.total > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Nothing needs compressing for this batch.
                </div>
              )}
            </div>
          )}

          {stage.kind === "running" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span>
                  {stage.done} / {stage.total}
                </span>
                <span className="text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} />
              <div className="text-[11px] text-muted-foreground truncate font-mono">
                {stage.currentName || "Working…"}
              </div>
            </div>
          )}

          {stage.kind === "done" && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Done
              </div>
              <div className="font-mono text-xs text-muted-foreground space-y-0.5 pt-1">
                <div>Processed: {stage.summary.processed}</div>
                <div>Skipped: {stage.summary.skipped}</div>
                <div>Failed: {stage.summary.failed}</div>
                <div>Saved: {formatMB(stage.summary.bytesSaved)}</div>
              </div>
            </div>
          )}

          {failures.length > 0 && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs space-y-1 max-h-32 overflow-auto">
              <div className="flex items-center gap-1.5 font-mono text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                {failures.length} failed
              </div>
              <ul className="font-mono text-[10px] text-destructive/90 space-y-0.5">
                {failures.slice(0, 10).map((f) => (
                  <li key={f.id} className="truncate" title={f.error}>
                    {f.name}: {f.error}
                  </li>
                ))}
                {failures.length > 10 && (
                  <li className="opacity-70">…and {failures.length - 10} more</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={isRunning}
          >
            {stage.kind === "done" ? "Close" : "Cancel"}
          </Button>
          {(stage.kind === "ready" || stage.kind === "done") && (
            <Button
              onClick={handleCompress}
              disabled={
                isRunning ||
                (stage.kind === "ready" && stage.oversized === 0)
              }
            >
              {stage.kind === "done" ? "Run again" : `Compress (${stage.kind === "ready" ? stage.oversized : 0})`}
            </Button>
          )}
          {isRunning && (
            <Button disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Compressing…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
