import { useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  reorderImportMedia,
  type ReorderMedia,
  type ReorderResult,
} from "@/lib/shopify-product-reorder";

interface ReorderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importId: string | null;
  batchName: string | null;
  brandId: string | null;
  onApplied?: () => void;
}

export function ReorderPreviewDialog({
  open,
  onOpenChange,
  importId,
  batchName,
  brandId,
  onApplied,
}: ReorderPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ReorderResult[] | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !importId || !brandId) return;
    let cancelled = false;
    setResults(null);
    setError(null);
    setLoading(true);
    void (async () => {
      const res = await reorderImportMedia(brandId, importId, { dryRun: true });
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.processed === 0) {
        setError(
          res.message ??
            "No products linked to this import yet — send to Shopify first.",
        );
        return;
      }
      setResults(res.results);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, importId, brandId]);

  const summary = useMemo(() => {
    if (!results) return null;
    const willMove = results.filter((r) => r.moved > 0).length;
    const noChange = results.filter((r) => !r.error && r.moved === 0).length;
    const failed = results.filter((r) => r.error).length;
    const totalMoved = results.reduce((acc, r) => acc + r.moved, 0);
    return { willMove, noChange, failed, totalMoved };
  }, [results]);

  // Show products with actual changes first; products already in order at the
  // bottom and ones that errored above the unchanged so they're easy to spot.
  const sortedResults = useMemo(() => {
    if (!results) return [];
    return [...results].sort((a, b) => {
      const aRank = a.error ? 1 : a.moved > 0 ? 0 : 2;
      const bRank = b.error ? 1 : b.moved > 0 ? 0 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return (a.title ?? "").localeCompare(b.title ?? "");
    });
  }, [results]);

  const handleApply = async () => {
    if (!importId || !brandId) return;
    setApplying(true);
    const res = await reorderImportMedia(brandId, importId, { dryRun: false });
    setApplying(false);
    if (!res.ok) {
      toast({
        title: "Reorder failed",
        description: res.error,
        variant: "destructive",
      });
      return;
    }
    const moved = res.results.reduce((acc, r) => acc + r.moved, 0);
    const failed = res.results.filter((r) => r.error).length;
    toast({
      title: failed > 0 ? `Reordered ${res.processed - failed} of ${res.processed}` : "Gallery reordered",
      description: `${moved} image${moved === 1 ? "" : "s"} moved${failed > 0 ? ` · ${failed} failed` : ""}`,
      variant: failed > 0 ? "destructive" : "default",
    });
    onApplied?.();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!applying) onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono">
            Reorder preview · {batchName || "Import"}
          </DialogTitle>
          <DialogDescription>
            Position 1 (the leftmost image) becomes the featured image on Shopify.
            Items are sorted by the trailing number in the filename
            (<code>...-1.JPG</code>, <code>...-2.JPG</code>, …). Files without a
            trailing number drop to the end.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="font-mono text-sm">
                Fetching current order from Shopify…
              </span>
            </div>
          )}
          {!loading && error && (
            <div className="py-12 text-center text-sm text-destructive">
              {error}
            </div>
          )}
          {!loading && !error && summary && (
            <>
              <div className="flex flex-wrap gap-2 mb-3 text-xs font-mono">
                <Badge variant="default">
                  {summary.willMove} product{summary.willMove === 1 ? "" : "s"} will change
                </Badge>
                <Badge variant="secondary">
                  {summary.noChange} already in order
                </Badge>
                {summary.failed > 0 && (
                  <Badge variant="destructive">
                    {summary.failed} fetch error{summary.failed === 1 ? "" : "s"}
                  </Badge>
                )}
                <Badge variant="outline">
                  {summary.totalMoved} image{summary.totalMoved === 1 ? "" : "s"} moved total
                </Badge>
              </div>
              <div className="space-y-3">
                {sortedResults.map((r) => (
                  <ProductRow key={r.product_id} result={r} />
                ))}
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={applying}
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={
              applying ||
              loading ||
              !!error ||
              !summary ||
              summary.willMove === 0
            }
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying…
              </>
            ) : summary && summary.willMove > 0 ? (
              <>Apply reorder ({summary.willMove})</>
            ) : (
              <>Apply reorder</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductRow({ result }: { result: ReorderResult }) {
  const proposed = result.proposed ?? [];
  const featured = proposed[0];
  const gallery = proposed.slice(1);
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-xs uppercase tracking-wider truncate">
            {result.title || result.product_id}
          </span>
          {result.moved > 0 && !result.error && (
            <Badge variant="default" className="text-[10px] font-mono">
              {result.moved} moved
            </Badge>
          )}
          {result.moved === 0 && !result.error && (
            <Badge variant="secondary" className="text-[10px] font-mono">
              in order
            </Badge>
          )}
          {result.error && (
            <Badge variant="destructive" className="text-[10px] font-mono">
              {result.error}
            </Badge>
          )}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">
          {proposed.length} image{proposed.length === 1 ? "" : "s"}
        </span>
      </div>

      {proposed.length > 0 && (
        <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1 flex items-center gap-1">
              <Star className="h-2.5 w-2.5" />
              Featured
            </div>
            {featured && <Thumb media={featured} highlight />}
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase text-muted-foreground mb-1">
              Gallery
            </div>
            {gallery.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">
                (no other images)
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {gallery.map((m) => (
                  <Thumb key={m.id} media={m} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({
  media,
  highlight = false,
}: {
  media: ReorderMedia;
  highlight?: boolean;
}) {
  // Strip the "<productName> - " prefix that import-media adds to alt text so
  // the filename-derived order signal is clearer at a glance.
  const label = media.alt
    ? media.alt.split(/ - /).pop() || media.alt
    : (media.url ?? "").split("/").pop() || `#${media.position}`;
  return (
    <div
      className={`relative h-20 w-20 shrink-0 rounded border bg-muted overflow-hidden ${
        highlight ? "ring-2 ring-primary" : ""
      }`}
      title={`${media.position}. ${label}`}
    >
      {media.url ? (
        <img
          src={media.url}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div className="h-full w-full grid place-items-center text-[10px] text-muted-foreground">
          ?
        </div>
      )}
      <span className="absolute bottom-0 right-0 bg-background/90 text-[9px] font-mono px-1 rounded-tl">
        {media.position}
      </span>
    </div>
  );
}
