import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Trash2,
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  applyDeduplicate,
  scanImportForDuplicates,
  type DedupCandidate,
  type DedupReasonCode,
} from "@/lib/shopify-import-deduplicate";

interface DeduplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string | null;
  brandId: string | null;
  onApplied?: () => void;
}

type Stage =
  | { kind: "idle" }
  | { kind: "scanning" }
  | {
      kind: "ready";
      candidates: DedupCandidate[];
      processed: number;
      aiReviewed: boolean;
    }
  | { kind: "applying"; total: number }
  | {
      kind: "done";
      deleted: number;
      errors: Array<{ product_id: string; error: string }>;
    };

const REASON_LABEL: Record<DedupReasonCode, string> = {
  color_not_in_variants: "Wrong-color",
  duplicate_filename: "Duplicate",
  ref_mismatch: "Wrong product",
  unparseable_filename: "Unparseable",
};

const REASON_VARIANT: Record<
  DedupReasonCode,
  "default" | "secondary" | "destructive" | "outline"
> = {
  color_not_in_variants: "destructive",
  duplicate_filename: "secondary",
  ref_mismatch: "destructive",
  unparseable_filename: "outline",
};

export function DeduplicateDialog({
  open,
  onOpenChange,
  importId,
  batchName,
  brandId,
  onApplied,
}: DeduplicateDialogProps) {
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cancelRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !importId || !brandId) {
      setStage({ kind: "idle" });
      setError(null);
      setSelected(new Set());
      cancelRef.current = false;
      return;
    }
    cancelRef.current = false;
    setStage({ kind: "scanning" });
    setError(null);
    setSelected(new Set());
    void (async () => {
      const res = await scanImportForDuplicates(brandId, importId);
      if (cancelRef.current) return;
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
      setStage({
        kind: "ready",
        candidates: res.candidates,
        processed: res.processed,
        aiReviewed: res.ai_reviewed,
      });
      setSelected(new Set(res.candidates.map((c) => c.media_id)));
    })();
    return () => {
      cancelRef.current = true;
    };
  }, [open, importId, brandId]);

  const grouped = useMemo(() => {
    if (stage.kind !== "ready") return [];
    const map = new Map<
      string,
      { product_title: string; items: DedupCandidate[] }
    >();
    for (const c of stage.candidates) {
      let bucket = map.get(c.product_id);
      if (!bucket) {
        bucket = { product_title: c.product_title, items: [] };
        map.set(c.product_id, bucket);
      }
      bucket.items.push(c);
    }
    return Array.from(map.entries())
      .map(([product_id, v]) => ({ product_id, ...v }))
      .sort((a, b) => a.product_title.localeCompare(b.product_title));
  }, [stage]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (stage.kind !== "ready") return;
    if (selected.size === stage.candidates.length) setSelected(new Set());
    else setSelected(new Set(stage.candidates.map((c) => c.media_id)));
  };

  const handleApply = async () => {
    if (stage.kind !== "ready" || !brandId || !importId) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    setStage({ kind: "applying", total: ids.length });
    const res = await applyDeduplicate(brandId, importId, ids);
    if (!res.ok) {
      toast({
        title: "Deduplicate failed",
        description: res.error,
        variant: "destructive",
      });
      setStage({
        kind: "ready",
        candidates: stage.candidates,
        processed: stage.processed,
        aiReviewed: stage.aiReviewed,
      });
      return;
    }
    setStage({ kind: "done", deleted: res.deleted, errors: res.errors });
    onApplied?.();
    toast({
      title: "Deduplicate complete",
      description:
        res.deleted > 0
          ? `Deleted ${res.deleted} image${res.deleted === 1 ? "" : "s"} from Shopify.`
          : "No images were deleted.",
    });
  };

  const handleClose = (val: boolean) => {
    if (stage.kind === "applying") return;
    onOpenChange(val);
  };

  const isApplying = stage.kind === "applying";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Deduplicate — {batchName || "Import"}
          </DialogTitle>
          <DialogDescription>
            Scans every product in this import and flags Shopify media that
            looks misattributed — wrong-color photos, duplicate uploads, or
            files that match a different product. Claude reviews each
            candidate via the project's LLM Gateway and refines the list when
            available.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs font-mono text-destructive flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {stage.kind === "scanning" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Scanning products on Shopify…
            </div>
          )}

          {stage.kind === "ready" && stage.candidates.length === 0 && (
            <div className="rounded-md border bg-muted/30 p-4 text-sm space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Nothing to clean up
              </div>
              <div className="text-muted-foreground text-xs">
                Scanned {stage.processed} product
                {stage.processed === 1 ? "" : "s"}; no misattributed media
                found.
              </div>
            </div>
          )}

          {stage.kind === "ready" && stage.candidates.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span>
                  {stage.candidates.length} candidate
                  {stage.candidates.length === 1 ? "" : "s"} across{" "}
                  {grouped.length} product
                  {grouped.length === 1 ? "" : "s"} ·{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={toggleAll}
                  >
                    {selected.size === stage.candidates.length
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </span>
                {stage.aiReviewed && (
                  <span className="inline-flex items-center gap-1 text-[10px]">
                    <Sparkles className="h-3 w-3" /> AI-reviewed
                  </span>
                )}
              </div>

              <div className="max-h-[420px] overflow-auto rounded-md border">
                {grouped.map((g) => (
                  <div key={g.product_id} className="border-b last:border-b-0">
                    <div className="px-3 py-2 bg-muted/40 font-mono text-xs sticky top-0">
                      {g.product_title}
                      <span className="text-muted-foreground">
                        {" "}
                        · {g.items.length}
                      </span>
                    </div>
                    {g.items.map((c) => {
                      const checked = selected.has(c.media_id);
                      return (
                        <label
                          key={c.media_id}
                          className="flex items-start gap-3 px-3 py-2 hover:bg-muted/30 cursor-pointer border-t first:border-t-0"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleOne(c.media_id)}
                            className="mt-1"
                          />
                          <div className="h-12 w-12 shrink-0 rounded border bg-muted overflow-hidden">
                            {c.url ? (
                              <img
                                src={c.url}
                                alt={c.filename}
                                className="h-full w-full object-cover pointer-events-none"
                                loading="lazy"
                                decoding="async"
                                draggable={false}
                              />
                            ) : null}
                          </div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant={REASON_VARIANT[c.reason_code]}
                                className="font-mono text-[10px] uppercase"
                              >
                                {REASON_LABEL[c.reason_code]}
                              </Badge>
                              {typeof c.confidence === "number" && (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  {Math.round(c.confidence * 100)}%
                                </span>
                              )}
                              <span className="font-mono text-xs truncate">
                                {c.filename}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {c.reason}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ))}
              </div>
            </>
          )}

          {stage.kind === "applying" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Deleting {stage.total} image{stage.total === 1 ? "" : "s"} on
              Shopify…
            </div>
          )}

          {stage.kind === "done" && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Done
              </div>
              <div className="font-mono text-xs text-muted-foreground">
                Deleted {stage.deleted} image
                {stage.deleted === 1 ? "" : "s"}.
              </div>
              {stage.errors.length > 0 && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] font-mono text-destructive space-y-0.5 mt-2">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="h-3 w-3" />
                    {stage.errors.length} product error
                    {stage.errors.length === 1 ? "" : "s"}
                  </div>
                  {stage.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="truncate" title={e.error}>
                      {e.product_id}: {e.error}
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
            onClick={() => handleClose(false)}
            disabled={isApplying}
          >
            {stage.kind === "done" ? "Close" : "Cancel"}
          </Button>
          {stage.kind === "ready" && stage.candidates.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleApply}
              disabled={selected.size === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete {selected.size} on Shopify
            </Button>
          )}
          {isApplying && (
            <Button disabled>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Deleting…
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
