import { useState } from "react";
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  reorderImportMedia,
  type BatchPosition,
} from "@/lib/shopify-product-reorder";

interface ReorderPositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string | null;
  brandId: string | null;
  onApplied?: () => void;
}

type Stage =
  | { kind: "idle" }
  | { kind: "applying"; position: BatchPosition }
  | {
      kind: "done";
      position: BatchPosition;
      processed: number;
      moved: number;
      failed: number;
      sampleErrors: string[];
    };

export function ReorderPositionDialog({
  open,
  onOpenChange,
  importId,
  batchName,
  brandId,
  onApplied,
}: ReorderPositionDialogProps) {
  const [position, setPosition] = useState<BatchPosition>("last");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const close = (val: boolean) => {
    if (stage.kind === "applying") return;
    if (!val) {
      setStage({ kind: "idle" });
      setError(null);
    }
    onOpenChange(val);
  };

  const handleApply = async () => {
    if (!importId || !brandId) return;
    setError(null);
    setStage({ kind: "applying", position });
    const res = await reorderImportMedia(brandId, importId, {
      dryRun: false,
      batchPosition: position,
    });
    if (!res.ok) {
      setError(res.error);
      setStage({ kind: "idle" });
      return;
    }
    if (res.processed === 0) {
      setError(
        res.message ??
          "No products linked to this import yet — send to Shopify first.",
      );
      setStage({ kind: "idle" });
      return;
    }
    const moved = res.results.reduce((acc, r) => acc + r.moved, 0);
    const failed = res.results.filter((r) => r.error).length;
    const sampleErrors = res.results
      .filter((r) => r.error)
      .slice(0, 5)
      .map((r) => `${r.title ?? r.product_id}: ${r.error}`);
    setStage({
      kind: "done",
      position,
      processed: res.processed,
      moved,
      failed,
      sampleErrors,
    });
    onApplied?.();
    toast({
      title: "Batch reordered",
      description: `${moved} image${moved === 1 ? "" : "s"} moved across ${res.processed} product${res.processed === 1 ? "" : "s"}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <ArrowDownToLine className="h-4 w-4" />
            Reorder position — {batchName || "Import"}
          </DialogTitle>
          <DialogDescription>
            Move every image attached by this import to the start or end of
            each product's Shopify gallery. The internal 1-2-3 and
            front-then-back order is preserved inside the batch.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs font-mono text-destructive flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {(stage.kind === "idle" || stage.kind === "applying") && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPosition("first")}
                disabled={stage.kind === "applying"}
                className={`flex items-center gap-2 rounded-md border p-3 text-left transition-colors ${
                  position === "first"
                    ? "border-foreground/60 bg-muted/40"
                    : "border-border hover:border-foreground/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowUpToLine className="h-4 w-4" />
                <div>
                  <div className="font-mono text-sm">First</div>
                  <div className="text-[10px] text-muted-foreground">
                    Batch images come first, existing media after.
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setPosition("last")}
                disabled={stage.kind === "applying"}
                className={`flex items-center gap-2 rounded-md border p-3 text-left transition-colors ${
                  position === "last"
                    ? "border-foreground/60 bg-muted/40"
                    : "border-border hover:border-foreground/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowDownToLine className="h-4 w-4" />
                <div>
                  <div className="font-mono text-sm">Last</div>
                  <div className="text-[10px] text-muted-foreground">
                    Existing media first, batch images at the end.
                  </div>
                </div>
              </button>
            </div>
          )}

          {stage.kind === "applying" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Moving batch images to {stage.position === "first" ? "the start" : "the end"} of each gallery…
            </div>
          )}

          {stage.kind === "done" && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Done — {stage.position === "first" ? "moved to start" : "moved to end"}
              </div>
              <div className="font-mono text-xs text-muted-foreground space-y-0.5">
                <div>Processed: {stage.processed} product{stage.processed === 1 ? "" : "s"}</div>
                <div>Images moved: {stage.moved}</div>
                {stage.failed > 0 && <div>Failed: {stage.failed}</div>}
              </div>
              {stage.sampleErrors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] font-mono text-destructive space-y-0.5 mt-2 max-h-32 overflow-auto">
                  {stage.sampleErrors.map((m, i) => (
                    <div key={i} className="truncate" title={m}>
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => close(false)}
            disabled={stage.kind === "applying"}
          >
            {stage.kind === "done" ? "Close" : "Cancel"}
          </Button>
          {stage.kind !== "done" && (
            <Button onClick={handleApply} disabled={stage.kind === "applying"}>
              {stage.kind === "applying" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying…
                </>
              ) : (
                <>Apply ({position === "first" ? "First" : "Last"})</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
