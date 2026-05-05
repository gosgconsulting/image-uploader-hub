import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Pencil, X, Upload, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllImportImageRows } from "@/lib/fetch-all-import-images";
import { resolveShopifyAdminForMapping } from "@/lib/shopify-credentials";
import { cn } from "@/lib/utils";
import { mapImportImagesToShopifyProducts } from "@/utils/mapImportImagesToShopifyProducts";
import {
  VirtualImageGrid,
  useGalleryPickerGridColumns,
} from "@/components/VirtualImageGrid";

interface ImportImage {
  id: string;
  file_name: string;
  file_url: string;
}

/** List row / session: no full `import_images` — loaded inside this dialog when opened. */
export interface SendApprovalImport {
  id: string;
  batch_name: string | null;
  status: string;
  webhook_url: string | null;
  created_at: string;
}

export interface WebhookProduct {
  id: string;
  file_name: string;
  file_url: string;
  productid: string;
  productname: string;
  referenceparent?: string;
  referenceParent?: string;
}

/** Image rows with no resolved Shopify product after reference-parent lookup. */
export interface FailedMapping {
  id: string;
  file_name: string;
  file_url: string;
  referenceParent: string;
  error: string;
}

interface MappedProduct {
  shopify_product_name: string;
  referenceParent: string;
  productid: string;
  images: { file_name: string; file_url: string }[];
}

export type UploadMode = "append" | "replace";

interface SendApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imp: SendApprovalImport | null;
  onApprove: (
    imp: SendApprovalImport,
    products: WebhookProduct[],
    mode: UploadMode,
    backup: boolean,
  ) => void;
  isSending: boolean;
  onDataChange?: () => void;
  /** Used to load Shopify Admin credentials from Supabase when enabled. */
  brandId?: string | null;
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function uploadImageToSupabase(
  importId: string,
  brandId: string,
  file: File,
): Promise<{ file_name: string; file_url: string }> {
  const safeName = `${Date.now()}_${file.name}`;
  const filePath = `${importId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("shopify-import-images")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("shopify-import-images")
    .getPublicUrl(filePath);

  // Persist to shopify_import_images so the import has a tracked row. brand_id and
  // position are NOT NULL on Sparti; position defaults to 1 and ordering falls back
  // to created_at + id, which is fine for ad-hoc uploads added during approval.
  await supabase.from("shopify_import_images").insert({
    import_id: importId,
    brand_id: brandId,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size,
  });

  return { file_name: file.name, file_url: urlData.publicUrl };
}

// ─── Upload zone (reusable) ────────────────────────────────────────────────────

interface UploadZoneProps {
  importId: string;
  brandId: string;
  onUploaded: (images: { file_name: string; file_url: string }[]) => void;
  multiple?: boolean;
  label?: string;
}

function UploadZone({
  importId,
  brandId,
  onUploaded,
  multiple = true,
  label,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFiles = useCallback(
    async (files: File[]) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;
      setUploading(true);
      try {
        const results = await Promise.all(
          images.map((f) => uploadImageToSupabase(importId, brandId, f)),
        );
        onUploaded(results);
      } catch (err: any) {
        toast({
          title: "Upload failed",
          description: err?.message || "Something went wrong.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [importId, brandId, onUploaded, toast],
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`flex items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-3 cursor-pointer transition-colors text-sm text-muted-foreground select-none
        ${isDragging ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-muted-foreground/40 hover:text-foreground"}`}
    >
      {uploading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-xs">Uploading…</span>
        </>
      ) : (
        <>
          <Upload className="h-4 w-4 shrink-0" />
          <span className="font-mono text-xs">
            {label ?? "Drop or click to upload"}
          </span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}

// ─── Feature image picker dialog ───────────────────────────────────────────────

interface ImagePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: { file_name: string; file_url: string }[];
  selectedIndex: number;
  title: string;
  importId: string;
  onSelect: (index: number) => void;
  onNewImagesUploaded: (
    imgs: { file_name: string; file_url: string }[],
  ) => void;
}

function ImagePickerDialog({
  open,
  onOpenChange,
  images,
  selectedIndex,
  title,
  importId: _importId,
  onSelect,
  onNewImagesUploaded: _onNewImagesUploaded,
}: ImagePickerDialogProps) {
  const cols = useGalleryPickerGridColumns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          {images.length > 0 ? (
            <VirtualImageGrid
              items={images}
              columns={cols}
              estimateRowHeight={220}
              scrollClassName="overflow-y-auto flex-1 min-h-0 max-h-[50vh] p-1"
              gridClassName="gap-3"
              renderCell={(img, i) => (
                <button
                  type="button"
                  onClick={() => {
                    onSelect(i);
                    onOpenChange(false);
                  }}
                  className={`relative w-full rounded-lg border-2 overflow-hidden aspect-square focus:outline-none transition-all ${
                    i === selectedIndex
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-muted hover:border-primary/50"
                  }`}
                >
                  <img
                    src={img.file_url}
                    alt={img.file_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                  {i === selectedIndex && (
                    <div className="absolute top-1.5 right-1.5 bg-primary rounded-full h-5 w-5 flex items-center justify-center">
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                    <p className="text-[9px] text-white truncate">
                      {img.file_name}
                    </p>
                  </div>
                </button>
              )}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gallery editor dialog ─────────────────────────────────────────────────────

interface GalleryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allImages: { file_name: string; file_url: string }[];
  featureIndex: number;
  importId: string;
  onSetFeature: (index: number) => void;
  onRemoveGallery: (index: number) => void;
  onNewImagesUploaded: (
    imgs: { file_name: string; file_url: string }[],
  ) => void;
}

function GalleryEditorDialog({
  open,
  onOpenChange,
  allImages,
  featureIndex,
  importId: _importId,
  onSetFeature: _onSetFeature,
  onRemoveGallery,
  onNewImagesUploaded: _onNewImagesUploaded,
}: GalleryEditorDialogProps) {
  const cols = useGalleryPickerGridColumns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            Edit Gallery Images
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col flex-1 min-h-0 space-y-3">
          {allImages.length > 0 ? (
            <VirtualImageGrid
              items={allImages}
              columns={cols}
              estimateRowHeight={260}
              scrollClassName="overflow-y-auto flex-1 min-h-0 max-h-[50vh] p-1"
              gridClassName="gap-3"
              renderCell={(img, i) => {
                const isFeature = i === featureIndex;
                return (
                  <div
                    className={`relative rounded-lg border-2 overflow-hidden aspect-square group w-full ${
                      isFeature ? "border-primary" : "border-muted"
                    }`}
                  >
                    <img
                      src={img.file_url}
                      alt={img.file_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />

                    {isFeature && (
                      <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                        Feature
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveGallery(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {isFeature && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                        <p className="text-[9px] text-white truncate">
                          {img.file_name}
                        </p>
                      </div>
                    )}

                    {!isFeature && (
                      <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5 group-hover:opacity-0 transition-opacity">
                        <p className="text-[9px] text-white truncate">
                          {img.file_name}
                        </p>
                      </div>
                    )}
                  </div>
                );
              }}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Unmatched images (failed mapping) ─────────────────────────────────────────

function FailedMappingsDialog({
  open,
  onOpenChange,
  rows,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rows: FailedMapping[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-3 overflow-hidden p-6">
        <DialogHeader className="shrink-0 space-y-1.5 p-0">
          <DialogTitle className="font-mono text-sm flex items-center gap-2 pr-8">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            Not synced to Shopify ({rows.length})
          </DialogTitle>
        </DialogHeader>
        <p className="shrink-0 text-xs text-muted-foreground">
          No matching product was found for these files. They are excluded from approve and send
          until mapping succeeds in your automation.
        </p>
        {/* Single scroll container (not the shared Table wrapper) so long lists scroll inside the modal */}
        <div
          className={cn(
            "flex-1 min-h-0 overflow-y-auto rounded-md border overscroll-y-contain",
            "[scrollbar-gutter:stable]",
          )}
          role="region"
          aria-label="Unmatched images"
        >
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 border-b bg-background">
              <tr className="border-b border-border hover:bg-transparent">
                <th
                  scope="col"
                  className="h-10 w-14 px-3 text-left align-middle font-medium text-muted-foreground font-mono text-[10px] uppercase tracking-wider bg-background"
                >
                  Preview
                </th>
                <th
                  scope="col"
                  className="h-10 px-3 text-left align-middle font-medium text-muted-foreground font-mono text-[10px] uppercase tracking-wider bg-background"
                >
                  File
                </th>
                <th
                  scope="col"
                  className="h-10 px-3 text-left align-middle font-medium text-muted-foreground font-mono text-[10px] uppercase tracking-wider bg-background min-w-[160px]"
                >
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {rows.map((row) => (
                <tr
                  key={row.id || row.file_url}
                  className="border-b border-border transition-colors hover:bg-muted/50 align-middle"
                >
                  <td className="p-2 align-middle">
                    {row.file_url ? (
                      <a
                        href={row.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block h-11 w-11 rounded border bg-muted overflow-hidden shrink-0 focus:outline-none focus:ring-2 focus:ring-ring"
                        title="Open image"
                      >
                        <img
                          src={row.file_url}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </a>
                    ) : (
                      <div className="h-11 w-11 rounded border border-dashed bg-muted/50" />
                    )}
                  </td>
                  <td className="p-2 align-middle text-xs font-mono max-w-[200px]">
                    <span className="line-clamp-2 break-all" title={row.file_name}>
                      {row.file_name || "—"}
                    </span>
                  </td>
                  <td className="p-2 align-middle text-xs text-destructive/90">
                    <span className="line-clamp-3" title={row.error}>
                      {row.error}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter className="shrink-0 border-t border-border pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main dialog ───────────────────────────────────────────────────────────────

export function SendApprovalDialog({
  open,
  onOpenChange,
  imp,
  onApprove,
  isSending,
  onDataChange,
  brandId = null,
}: SendApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [rawProducts, setRawProducts] = useState<WebhookProduct[]>([]);
  const [failedMappings, setFailedMappings] = useState<FailedMapping[]>([]);
  const [failedMappingsOpen, setFailedMappingsOpen] = useState(false);
  const [editableProducts, setEditableProducts] = useState<MappedProduct[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [featurePickerFor, setFeaturePickerFor] = useState<number | null>(null);
  const [galleryEditorFor, setGalleryEditorFor] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [backup, setBackup] = useState(true);
  const { toast } = useToast();

  const fetchMapData = useCallback(async () => {
    if (!imp) return;
    setLoading(true);
    let images: ImportImage[] = [];
    try {
      const result = await fetchAllImportImageRows<ImportImage>(supabase, {
        importId: imp.id,
        select: "id, file_name, file_url",
      });
      if (!result.ok) throw new Error(result.error);
      images = result.rows;

      const creds = await resolveShopifyAdminForMapping(brandId);
      if (!creds) {
        toast({
          title: "Shopify not connected",
          description:
            "Add your shop and Admin API token under Shopify settings (or save credentials for this brand), then try again.",
          variant: "destructive",
        });
        setRawProducts([]);
        setFailedMappings([]);
        const fallback = buildFallbackProducts(imp.batch_name, images);
        setEditableProducts(fallback);
        setSelectedRows(new Set(fallback.map((_, i) => i)));
        return;
      }

      const { filtered, grouped, failed } = await mapImportImagesToShopifyProducts(
        creds.shop,
        creds.token,
        images,
        brandId,
      );

      const matchedRows = filtered as WebhookProduct[];
      const failedRows = failed as FailedMapping[];

      setRawProducts(matchedRows);
      setFailedMappings(mergeFailedAndOrphans(matchedRows, failedRows, images));
      onDataChange?.();

      const freshProducts =
        grouped.length > 0 ? grouped : buildFallbackProducts(imp.batch_name, images);

      setEditableProducts((prev) => {
        // First load — use webhook response as-is
        if (prev.length === 0) {
          setSelectedRows(new Set(freshProducts.map((_, i) => i)));
          return freshProducts;
        }

        // Subsequent loads — merge to avoid creating new rows for already-assigned images
        const assignedUrls = new Set(
          prev.flatMap((p) => p.images.map((i) => i.file_url)),
        );

        // Keep existing products with their current image list (preserves local edits & uploads)
        const existingIds = new Set(prev.map((p) => p.productid));
        const merged = prev.map((p) => {
          const fresh = freshProducts.find(
            (fp) => fp.productid === p.productid,
          );
          return fresh ? { ...fresh, images: p.images } : p;
        });

        // Only append genuinely new products whose images aren't already assigned
        for (const fp of freshProducts) {
          if (!existingIds.has(fp.productid)) {
            const unassigned = fp.images.filter(
              (i) => !assignedUrls.has(i.file_url),
            );
            if (unassigned.length > 0)
              merged.push({ ...fp, images: unassigned });
          }
        }

        return merged;
      });
    } catch {
      toast({
        title: "Failed to fetch product data",
        description: "Using placeholder data instead.",
        variant: "destructive",
      });
      setRawProducts([]);
      setFailedMappings([]);
      const fallback = buildFallbackProducts(imp.batch_name, images);
      setEditableProducts(fallback);
      setSelectedRows(new Set(fallback.map((_, i) => i)));
    } finally {
      setLoading(false);
    }
  }, [imp, onDataChange, toast, brandId]);

  // Reset only when the import itself changes, not on every close
  useEffect(() => {
    setEditableProducts([]);
    setRawProducts([]);
    setFailedMappings([]);
    setFailedMappingsOpen(false);
    setSelectedRows(new Set());
  }, [imp?.id]);

  // Fetch whenever the modal opens
  useEffect(() => {
    if (open && imp) void fetchMapData();
  }, [open, imp?.id, fetchMapData]);

  useEffect(() => {
    if (!open) setFailedMappingsOpen(false);
  }, [open]);

  if (!imp) return null;

  // ── Selection ──────────────────────────────────────────────────────────────
  const allSelected =
    editableProducts.length > 0 &&
    selectedRows.size === editableProducts.length;
  const someSelected = selectedRows.size > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(editableProducts.map((_, i) => i)));
  };

  const toggleRow = (index: number) => {
    const next = new Set(selectedRows);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedRows(next);
  };

  // ── Image editing ──────────────────────────────────────────────────────────

  const setFeatureImage = (productIndex: number, imageIndex: number) => {
    setEditableProducts((prev) => {
      const updated = [...prev];
      const imgs = [...updated[productIndex].images];
      const [selected] = imgs.splice(imageIndex, 1);
      imgs.unshift(selected);
      updated[productIndex] = { ...updated[productIndex], images: imgs };
      return updated;
    });
  };

  const removeGalleryImage = async (
    productIndex: number,
    imageIndex: number,
  ) => {
    const img = editableProducts[productIndex].images[imageIndex];

    // Always remove from UI immediately
    setEditableProducts((prev) => {
      const updated = [...prev];
      const imgs = [...updated[productIndex].images];
      imgs.splice(imageIndex, 1);
      updated[productIndex] = { ...updated[productIndex], images: imgs };
      return updated;
    });

    // Best-effort Supabase delete — warn on failure but don't block UI
    try {
      const storagePath = img.file_url.split("/shopify-import-images/")[1];
      if (storagePath) {
        await supabase.storage.from("shopify-import-images").remove([storagePath]);
      }
      await supabase
        .from("shopify_import_images")
        .delete()
        .eq("file_url", img.file_url);
      fetchMapData();
    } catch (err: any) {
      toast({
        title: "Image removed from view",
        description:
          "Could not delete from storage: " + (err?.message || "unknown error"),
        variant: "destructive",
      });
    }
  };

  /** Append newly uploaded images to a product's image list. */
  const appendImagesToProduct = (
    productIndex: number,
    newImgs: { file_name: string; file_url: string }[],
  ) => {
    setEditableProducts((prev) => {
      const updated = [...prev];
      updated[productIndex] = {
        ...updated[productIndex],
        images: [...updated[productIndex].images, ...newImgs],
      };
      return updated;
    });
  };

  // ── Send: build payload once, then user picks Replace vs Add ───────────────
  const buildPayload = (): WebhookProduct[] =>
    editableProducts
      .filter((_, i) => selectedRows.has(i))
      .flatMap((p) =>
        p.images.map(
          (img) =>
            ({
              id: "",
              file_name: img.file_name,
              file_url: img.file_url,
              productid: p.productid,
              productname: p.shopify_product_name,
              referenceparent: p.referenceParent,
              ...rawProducts.find(
                (rp) =>
                  rp.productid === p.productid && rp.file_url === img.file_url,
              ),
            }) as WebhookProduct,
        ),
      );

  const handleSendClick = () => {
    if (selectedRows.size === 0) return;
    setConfirmOpen(true);
  };

  const handleConfirm = (mode: UploadMode) => {
    setConfirmOpen(false);
    onApprove(imp, buildPayload(), mode, backup);
  };

  const galleryProduct =
    galleryEditorFor !== null ? editableProducts[galleryEditorFor] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              {`Review & Send — ${imp.batch_name || "Untitled"}`}
            </DialogTitle>
          </DialogHeader>

          <UploadZone
            importId={imp.id}
            brandId={brandId ?? ""}
            label="Drop or click to upload new gallery images"
            onUploaded={() => {
              setEditableProducts([]);
              setSelectedRows(new Set());
              fetchMapData();
            }}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm font-mono">Fetching product data…</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1 min-h-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={
                            allSelected
                              ? true
                              : someSelected
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all rows"
                        />
                      </TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider">
                        Shopify Product Name
                      </TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider">
                        Reference Parent
                      </TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider">
                        Feature Image
                      </TableHead>
                      <TableHead className="font-mono text-xs uppercase tracking-wider">
                        Gallery
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editableProducts.map((product, index) => {
                      const featureImage = product.images[0] ?? null;
                      const galleryImages = product.images.slice(1);
                      const isSelected = selectedRows.has(index);

                      return (
                        <TableRow
                          key={index}
                          className={!isSelected ? "opacity-50" : undefined}
                        >
                          <TableCell className="px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(index)}
                              aria-label={`Select ${product.shopify_product_name}`}
                            />
                          </TableCell>

                          <TableCell className="text-sm font-medium max-w-[200px]">
                            <span className="line-clamp-2">
                              {product.shopify_product_name}
                            </span>
                          </TableCell>

                          <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {product.referenceParent || "—"}
                          </TableCell>

                          {/* Feature Image */}
                          <TableCell>
                            {featureImage ? (
                              <button
                                onClick={() => setFeaturePickerFor(index)}
                                className="relative h-14 w-14 rounded border bg-muted overflow-hidden group focus:outline-none focus:ring-2 focus:ring-primary"
                                title="Click to change feature image"
                              >
                                <img
                                  src={featureImage.file_url}
                                  alt={featureImage.file_name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Pencil className="h-4 w-4 text-white" />
                                </div>
                              </button>
                            ) : (
                              <button
                                onClick={() => setFeaturePickerFor(index)}
                                className="h-14 w-14 rounded border-2 border-dashed border-muted-foreground/30 bg-muted flex items-center justify-center hover:border-primary/50 transition-colors"
                                title="Upload a feature image"
                              >
                                <Upload className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                          </TableCell>

                          {/* Gallery */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {galleryImages.length > 0 ? (
                                <>
                                  <div className="flex -space-x-2">
                                    {galleryImages.slice(0, 4).map((img, i) => (
                                      <div
                                        key={i}
                                        className="h-10 w-10 rounded border-2 border-card bg-muted overflow-hidden"
                                      >
                                        <img
                                          src={img.file_url}
                                          alt={img.file_name}
                                          className="h-full w-full object-cover"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </div>
                                    ))}
                                    {galleryImages.length > 4 && (
                                      <div className="h-10 w-10 rounded border-2 border-card bg-muted flex items-center justify-center">
                                        <span className="text-[10px] font-mono text-muted-foreground">
                                          +{galleryImages.length - 4}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setGalleryEditorFor(index)}
                                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit gallery"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setGalleryEditorFor(index)}
                                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  title="Edit gallery images"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:mr-auto w-full sm:w-auto">
              <span className="text-xs text-muted-foreground font-mono">
                {selectedRows.size} / {editableProducts.length} selected
              </span>
              <label className="flex items-center gap-2 text-xs font-mono cursor-pointer select-none">
                <Checkbox
                  checked={backup}
                  onCheckedChange={(v) => setBackup(v === true)}
                  aria-label="Backup existing product media before sending"
                />
                <span>Backup existing media (rollback later)</span>
              </label>
              {!loading && failedMappings.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-mono text-xs justify-center"
                  onClick={() => setFailedMappingsOpen(true)}
                >
                  <AlertTriangle className="h-3.5 w-3.5 mr-2 shrink-0" />
                  View unmatched ({failedMappings.length})
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end w-full sm:w-auto shrink-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendClick}
              disabled={isSending || loading || selectedRows.size === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                `Send (${selectedRows.size})`
              )}
            </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>How should these images land on Shopify?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono font-medium">Replace</span> deletes every
              existing media on each product first, then uploads the {selectedRows.size}{" "}
              selected image{selectedRows.size === 1 ? "" : "s"}. <br />
              <span className="font-mono font-medium">Add new</span> keeps the existing
              product media and just appends these.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleConfirm("append")}
              className="bg-primary"
            >
              Add new
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleConfirm("replace")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Replace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FailedMappingsDialog
        open={failedMappingsOpen}
        onOpenChange={setFailedMappingsOpen}
        rows={failedMappings}
      />

      {/* Feature image picker */}
      {featurePickerFor !== null && (
        <ImagePickerDialog
          open
          onOpenChange={(v) => !v && setFeaturePickerFor(null)}
          images={editableProducts[featurePickerFor]?.images ?? []}
          selectedIndex={0}
          title={`Select Feature Image — ${editableProducts[featurePickerFor]?.shopify_product_name}`}
          importId={imp.id}
          onSelect={(imageIndex) => {
            setFeatureImage(featurePickerFor, imageIndex);
            setFeaturePickerFor(null);
          }}
          onNewImagesUploaded={(newImgs) => {
            // Append then auto-select the first new image as feature
            const currentLen =
              editableProducts[featurePickerFor]?.images.length ?? 0;
            appendImagesToProduct(featurePickerFor, newImgs);
            setFeatureImage(featurePickerFor, currentLen); // index after append
            setFeaturePickerFor(null);
          }}
        />
      )}

      {/* Gallery editor */}
      {galleryEditorFor !== null && galleryProduct && (
        <GalleryEditorDialog
          open
          onOpenChange={(v) => !v && setGalleryEditorFor(null)}
          allImages={galleryProduct.images}
          featureIndex={0}
          importId={imp.id}
          onSetFeature={(imageIndex) =>
            setFeatureImage(galleryEditorFor, imageIndex)
          }
          onRemoveGallery={(imageIndex) =>
            removeGalleryImage(galleryEditorFor, imageIndex)
          }
          onNewImagesUploaded={(newImgs) => {
            appendImagesToProduct(galleryEditorFor, newImgs);
          }}
        />
      )}
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Combine failed mappings with import images that never appear on a matched row. */
function mergeFailedAndOrphans(
  filtered: WebhookProduct[],
  failed: FailedMapping[],
  images: ImportImage[],
): FailedMapping[] {
  const byUrl = new Map<string, FailedMapping>();
  for (const f of failed) {
    if (f.file_url) byUrl.set(f.file_url, f);
  }
  if (filtered.length === 0) return [...byUrl.values()];

  const successUrls = new Set(
    filtered.map((p) => p.file_url).filter(Boolean),
  );
  for (const img of images) {
    if (!img.file_url || successUrls.has(img.file_url)) continue;
    if (byUrl.has(img.file_url)) continue;
    byUrl.set(img.file_url, {
      id: img.id,
      file_name: img.file_name,
      file_url: img.file_url,
      referenceParent: "",
      error:
        "Not included in any matched Shopify product for this batch. Check the reference parent token before the first space or \"-\" in the filename.",
    });
  }
  return [...byUrl.values()];
}

function buildFallbackProducts(
  batchName: string | null,
  images: ImportImage[],
): MappedProduct[] {
  return [
    {
      shopify_product_name: batchName || "Untitled Product",
      referenceParent: "",
      productid: "",
      images: images.map((img) => ({
        file_name: img.file_name,
        file_url: img.file_url,
      })),
    },
  ];
}
