import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
    const hasChange = (r: (typeof results)[number]) =>
      r.moved > 0 ||
      (r.variant_updates_planned ?? 0) > 0 ||
      (r.variant_media_appends_planned ?? 0) > 0 ||
      (r.variant_media_detaches_planned ?? 0) > 0 ||
      (r.media_deletions_planned ?? 0) > 0;
    const willChange = results.filter(hasChange).length;
    const noChange = results.filter((r) => !r.error && !hasChange(r)).length;
    const failed = results.filter((r) => r.error).length;
    const totalMoved = results.reduce((acc, r) => acc + r.moved, 0);
    const totalVariantUpdates = results.reduce(
      (acc, r) => acc + (r.variant_updates_planned ?? 0),
      0,
    );
    const totalVariantMediaAppends = results.reduce(
      (acc, r) => acc + (r.variant_media_appends_planned ?? 0),
      0,
    );
    const totalVariantMediaDetaches = results.reduce(
      (acc, r) => acc + (r.variant_media_detaches_planned ?? 0),
      0,
    );
    const totalMediaDeletions = results.reduce(
      (acc, r) => acc + (r.media_deletions_planned ?? 0),
      0,
    );
    return {
      willChange,
      noChange,
      failed,
      totalMoved,
      totalVariantUpdates,
      totalVariantMediaAppends,
      totalVariantMediaDetaches,
      totalMediaDeletions,
    };
  }, [results]);

  // Products with actual changes first; errors above unchanged; alphabetical within tier.
  const sortedResults = useMemo(() => {
    if (!results) return [];
    const hasChange = (r: (typeof results)[number]) =>
      r.moved > 0 ||
      (r.variant_updates_planned ?? 0) > 0 ||
      (r.variant_media_appends_planned ?? 0) > 0 ||
      (r.variant_media_detaches_planned ?? 0) > 0 ||
      (r.media_deletions_planned ?? 0) > 0;
    return [...results].sort((a, b) => {
      const aRank = a.error ? 1 : hasChange(a) ? 0 : 2;
      const bRank = b.error ? 1 : hasChange(b) ? 0 : 2;
      if (aRank !== bRank) return aRank - bRank;
      return (a.title ?? "").localeCompare(b.title ?? "");
    });
  }, [results]);

  // Flatten all results into table rows (one row per product × variant).
  const tableRows = useMemo(() => {
    return sortedResults.flatMap((r) => buildRows(r));
  }, [sortedResults]);

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
    const variantsUpdated = res.results.reduce(
      (acc, r) => acc + (r.variants_updated ?? 0),
      0,
    );
    const failed = res.results.filter((r) => r.error).length;
    const parts: string[] = [];
    parts.push(`${moved} image${moved === 1 ? "" : "s"} moved`);
    if (variantsUpdated > 0) {
      parts.push(
        `${variantsUpdated} variant image${variantsUpdated === 1 ? "" : "s"} pinned`,
      );
    }
    if (failed > 0) parts.push(`${failed} failed`);
    toast({
      title:
        failed > 0
          ? `Reordered ${res.processed - failed} of ${res.processed}`
          : "Gallery reordered",
      description: parts.join(" · "),
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
            Images are grouped by color variant (matched on the filename —
            e.g.&nbsp;<code>...-CREME-1.JPG</code> → Crème variant) and ordered
            by the variant order on Shopify. The first image of each color becomes
            that variant's featured image, and <strong>every other image of that
            color is attached to the variant's gallery</strong> so the storefront
            no longer shows other-color shots when a variant is selected.
            Wrong-color attachments left over from prior runs are detached.
            Products without color variants are sorted by trailing number only.
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
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 mb-3 text-xs font-mono">
                <Badge variant="default">
                  {summary.willChange} product{summary.willChange === 1 ? "" : "s"} will change
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
                {summary.totalVariantUpdates > 0 && (
                  <Badge variant="outline">
                    {summary.totalVariantUpdates} variant image
                    {summary.totalVariantUpdates === 1 ? "" : "s"} to pin
                  </Badge>
                )}
                {summary.totalVariantMediaAppends > 0 && (
                  <Badge
                    variant="outline"
                    title="Each variant gets its color's images attached so the storefront gallery only shows the right color when that variant is selected."
                  >
                    {summary.totalVariantMediaAppends} gallery link
                    {summary.totalVariantMediaAppends === 1 ? "" : "s"} to add
                  </Badge>
                )}
                {summary.totalVariantMediaDetaches > 0 && (
                  <Badge
                    variant="outline"
                    title="Wrong-color images currently attached to variants will be detached so the storefront gallery stops showing other-color shots."
                  >
                    {summary.totalVariantMediaDetaches} wrong-color link
                    {summary.totalVariantMediaDetaches === 1 ? "" : "s"} to drop
                  </Badge>
                )}
                {summary.totalMediaDeletions > 0 && (
                  <Badge
                    variant="destructive"
                    title="Duplicate images on the product (same filename appearing more than once) will be deleted entirely. Only duplicates are removed — single-copy media is kept regardless of color."
                  >
                    {summary.totalMediaDeletions} duplicate
                    {summary.totalMediaDeletions === 1 ? "" : "s"} to delete
                  </Badge>
                )}
              </div>

              {/* Flat table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-mono text-xs w-[220px]">Product</TableHead>
                      <TableHead className="font-mono text-xs w-[120px]">Variant</TableHead>
                      <TableHead className="font-mono text-xs w-[200px]">Featured</TableHead>
                      <TableHead className="font-mono text-xs">Gallery</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map((row, idx) => (
                      <TableRow
                        key={`${row.productId}-${row.variantColor ?? "_"}-${idx}`}
                        className={row.isFirstInProduct ? "border-t-2 border-t-muted" : ""}
                      >
                        {/* Product name — only show on the first row of each product */}
                        {row.isFirstInProduct ? (
                          <TableCell
                            rowSpan={row.productRowSpan}
                            className="align-top py-2"
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-mono text-xs font-medium leading-tight">
                                {row.productTitle}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {row.badges.map((b, i) => (
                                  <Badge
                                    key={i}
                                    variant={b.variant}
                                    className="text-[10px] font-mono"
                                    title={b.title}
                                  >
                                    {b.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </TableCell>
                        ) : null}

                        {/* Variant */}
                        <TableCell className="py-2 align-top">
                          <span
                            className={`font-mono text-xs ${
                              row.variantColor === null
                                ? "text-muted-foreground italic"
                                : ""
                            }`}
                          >
                            {row.variantLabel}
                          </span>
                        </TableCell>

                        {/* Featured */}
                        <TableCell className="py-2 align-top">
                          <span
                            className="font-mono text-[11px] text-foreground break-all leading-snug"
                            title={row.featuredFilename ?? undefined}
                          >
                            {row.featuredFilename ?? (
                              <span className="text-muted-foreground italic">—</span>
                            )}
                          </span>
                        </TableCell>

                        {/* Gallery */}
                        <TableCell className="py-2 align-top">
                          {row.galleryFilenames.length === 0 ? (
                            <span className="text-[11px] font-mono text-muted-foreground italic">
                              —
                            </span>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              {row.galleryFilenames.map((f, i) => (
                                <span
                                  key={i}
                                  className="font-mono text-[11px] text-muted-foreground leading-snug break-all"
                                >
                                  {f}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex-col sm:flex-col items-stretch gap-2">
          {summary && summary.willChange === 0 && !loading && !error && (
            <p className="text-[11px] font-mono text-muted-foreground text-left">
              Nothing to apply. Every product is already in the correct order and
              each variant's image is already pinned.
            </p>
          )}
          <div className="flex gap-2 justify-end">
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
                summary.willChange === 0
              }
              title={
                summary && summary.willChange === 0
                  ? "No products need reordering or variant-image pinning."
                  : undefined
              }
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying…
                </>
              ) : summary && summary.willChange > 0 ? (
                <>Apply reorder ({summary.willChange})</>
              ) : (
                <>Apply reorder</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type VariantGroup = {
  color: string | null;
  variantIndex: number | null;
  media: ReorderMedia[];
};

type BadgeDef = {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  title?: string;
};

type TableRowData = {
  productId: string;
  productTitle: string;
  /** true only on the first row of each product block */
  isFirstInProduct: boolean;
  /** how many rows this product spans (used for rowSpan on the product cell) */
  productRowSpan: number;
  /** badges shown in the product cell */
  badges: BadgeDef[];
  /** the matched color value, or null for no-color products */
  variantColor: string | null;
  /** human-readable variant label */
  variantLabel: string;
  /** filename of the first (featured) image in this group */
  featuredFilename: string | null;
  /** filenames of the remaining images in this group */
  galleryFilenames: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract a short, readable filename from a media item. */
function mediaLabel(m: ReorderMedia): string {
  if (m.alt) {
    // Strip the "ProductName - " prefix that shopify-import-media adds to alt text.
    const stripped = m.alt.split(/ - /).pop() || m.alt;
    return stripped;
  }
  if (m.url) {
    // Use the last path segment of the URL, minus any query string.
    return m.url.split("/").pop()?.split("?")[0] || m.url;
  }
  return `#${m.position}`;
}

/**
 * Split proposed media into one VariantGroup per color, preserving Shopify's
 * variant order. Media that didn't match any color go into a trailing "Unassigned"
 * group so nothing is lost.
 */
function groupByVariant(
  proposed: ReorderMedia[],
  colorValues: string[] | null | undefined,
): VariantGroup[] {
  const order = new Map<string, number>();
  (colorValues ?? []).forEach((c, i) => order.set(c, i));

  const groups = new Map<string | null, VariantGroup>();
  for (const m of proposed) {
    const key = m.color ?? null;
    let g = groups.get(key);
    if (!g) {
      g = {
        color: key,
        variantIndex: key !== null ? (order.get(key) ?? null) : null,
        media: [],
      };
      groups.set(key, g);
    }
    g.media.push(m);
  }
  return Array.from(groups.values()).sort((a, b) => {
    const rank = (g: VariantGroup) => {
      if (g.color === null) return 2;
      if (g.variantIndex === null) return 1;
      return 0;
    };
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (a.variantIndex !== null && b.variantIndex !== null) {
      return a.variantIndex - b.variantIndex;
    }
    return (a.color ?? "").localeCompare(b.color ?? "");
  });
}

/** Build the per-product badges shown in the Product column cell. */
function buildBadges(result: ReorderResult): BadgeDef[] {
  const badges: BadgeDef[] = [];

  if (result.error) {
    badges.push({ label: result.error, variant: "destructive" });
    return badges;
  }

  if (result.moved > 0) {
    badges.push({ label: `${result.moved} moved`, variant: "default" });
  } else {
    badges.push({ label: "in order", variant: "secondary" });
  }

  if ((result.variant_updates_planned ?? 0) > 0) {
    const n = result.variant_updates_planned!;
    badges.push({
      label: `${n} variant${n === 1 ? "" : "s"} to pin`,
      variant: "default",
    });
  }

  if (result.color_option && (result.color_values?.length ?? 0) > 0) {
    badges.push({
      label: `${result.color_option}${result.color_option_source === "auto" ? " (auto)" : ""}: ${result.color_values!.join(" · ")}`,
      variant: "outline",
    });
  } else {
    badges.push({
      label: "no color variants",
      variant: "outline",
      title:
        "This product doesn't have a Color/Couleur option — no per-variant image pinning.",
    });
  }

  if (
    result.color_option &&
    (result.variant_updates_planned ?? 0) === 0 &&
    result.moved === 0
  ) {
    badges.push({
      label: "variants already pinned",
      variant: "outline",
      title: "Each variant's featured image is already pinned to the right color.",
    });
  }

  return badges;
}

/**
 * Convert one ReorderResult into one or more TableRowData entries — one per
 * variant group (or just one row for products with no color variants).
 */
function buildRows(result: ReorderResult): TableRowData[] {
  const proposed = result.proposed ?? [];
  const variantGroups = groupByVariant(proposed, result.color_values);
  const productTitle = result.title || result.product_id;
  const badges = buildBadges(result);

  if (proposed.length === 0 || variantGroups.length === 0) {
    // Error case or no proposed media at all — single placeholder row.
    return [
      {
        productId: result.product_id,
        productTitle,
        isFirstInProduct: true,
        productRowSpan: 1,
        badges,
        variantColor: null,
        variantLabel: "—",
        featuredFilename: null,
        galleryFilenames: [],
      },
    ];
  }

  const hasMultipleGroups = variantGroups.length > 1;

  return variantGroups.map((g, idx) => {
    const featured = g.media[0] ?? null;
    const gallery = g.media.slice(1);

    let variantLabel: string;
    if (!hasMultipleGroups) {
      // Single group — no per-variant label needed.
      variantLabel = "—";
    } else if (g.color !== null) {
      variantLabel = g.color;
    } else {
      variantLabel = "Unassigned";
    }

    return {
      productId: result.product_id,
      productTitle,
      isFirstInProduct: idx === 0,
      productRowSpan: variantGroups.length,
      badges,
      variantColor: hasMultipleGroups ? g.color : null,
      variantLabel,
      featuredFilename: featured ? mediaLabel(featured) : null,
      galleryFilenames: gallery.map(mediaLabel),
    };
  });
}
