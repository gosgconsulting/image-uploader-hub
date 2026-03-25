import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Pencil, X, Upload } from "lucide-react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImportImage {
  id: string;
  file_name: string;
  file_url: string;
}

interface Import {
  id: string;
  batch_name: string | null;
  status: string;
  webhook_url: string | null;
  created_at: string;
  import_images: ImportImage[];
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

interface MappedProduct {
  shopify_product_name: string;
  referenceParent: string;
  productid: string;
  images: { file_name: string; file_url: string }[];
}

interface SendApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imp: Import | null;
  onApprove: (imp: Import, products: WebhookProduct[]) => void;
  isSending: boolean;
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function uploadImageToSupabase(
  importId: string,
  file: File
): Promise<{ file_name: string; file_url: string }> {
  const safeName = `${Date.now()}_${file.name}`;
  const filePath = `${importId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("import-images")
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("import-images")
    .getPublicUrl(filePath);

  // Persist to import_images table so it's tracked
  await supabase.from("import_images").insert({
    import_id: importId,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size,
  });

  return { file_name: file.name, file_url: urlData.publicUrl };
}

// ─── Upload zone (reusable) ────────────────────────────────────────────────────

interface UploadZoneProps {
  importId: string;
  onUploaded: (images: { file_name: string; file_url: string }[]) => void;
  multiple?: boolean;
  label?: string;
}

function UploadZone({ importId, onUploaded, multiple = true, label }: UploadZoneProps) {
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
          images.map((f) => uploadImageToSupabase(importId, f))
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
    [importId, onUploaded, toast]
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
          <span className="font-mono text-xs">{label ?? "Drop or click to upload"}</span>
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
  onNewImagesUploaded: (imgs: { file_name: string; file_url: string }[]) => void;
}

function ImagePickerDialog({
  open,
  onOpenChange,
  images,
  selectedIndex,
  title,
  importId,
  onSelect,
  onNewImagesUploaded,
}: ImagePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">{title}</DialogTitle>
        </DialogHeader>

        <div className="overflow-auto flex-1 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => {
                  onSelect(i);
                  onOpenChange(false);
                }}
                className={`relative rounded-lg border-2 overflow-hidden aspect-square focus:outline-none transition-all ${
                  i === selectedIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-muted hover:border-primary/50"
                }`}
              >
                <img
                  src={img.file_url}
                  alt={img.file_name}
                  className="h-full w-full object-cover"
                />
                {i === selectedIndex && (
                  <div className="absolute top-1.5 right-1.5 bg-primary rounded-full h-5 w-5 flex items-center justify-center">
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                  <p className="text-[9px] text-white truncate">{img.file_name}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Upload zone */}
       
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
  onNewImagesUploaded: (imgs: { file_name: string; file_url: string }[]) => void;
}

function GalleryEditorDialog({
  open,
  onOpenChange,
  allImages,
  featureIndex,
  importId,
  onSetFeature,
  onRemoveGallery,
  onNewImagesUploaded,
}: GalleryEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Edit Gallery Images</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1 space-y-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
            {allImages.map((img, i) => {
              const isFeature = i === featureIndex;
              return (
                <div
                  key={i}
                  className={`relative rounded-lg border-2 overflow-hidden aspect-square group ${
                    isFeature ? "border-primary" : "border-muted"
                  }`}
                >
                  <img
                    src={img.file_url}
                    alt={img.file_name}
                    className="h-full w-full object-cover"
                  />

                  {isFeature && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Feature
                    </div>
                  )}

                  <button
                    onClick={() => onRemoveGallery(i)}
                    className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>

                  {!isFeature && (
                    <button
                      onClick={() => onSetFeature(i)}
                      className="absolute bottom-0 inset-x-0 bg-primary/80 text-primary-foreground text-[9px] font-semibold py-1 opacity-0 group-hover:opacity-100 transition-opacity text-center"
                    >
                      Set as Feature
                    </button>
                  )}

                  {isFeature && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5">
                      <p className="text-[9px] text-white truncate">{img.file_name}</p>
                    </div>
                  )}

                  {!isFeature && (
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1 py-0.5 group-hover:opacity-0 transition-opacity">
                      <p className="text-[9px] text-white truncate">{img.file_name}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

// ─── Main dialog ───────────────────────────────────────────────────────────────

const MAP_DATA_WEBHOOK_URL =
  "https://n8n-main-instance-production-8d68.up.railway.app/webhook/mapdata";

export function SendApprovalDialog({
  open,
  onOpenChange,
  imp,
  onApprove,
  isSending,
}: SendApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [rawProducts, setRawProducts] = useState<WebhookProduct[]>([]);
  const [editableProducts, setEditableProducts] = useState<MappedProduct[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [featurePickerFor, setFeaturePickerFor] = useState<number | null>(null);
  const [galleryEditorFor, setGalleryEditorFor] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchMapData = useCallback(async () => {
    if (!imp) return;
    setLoading(true);
    try {
      // Always pull the latest images from Supabase before calling the webhook
      const { data: latestImages } = await supabase
        .from("import_images")
        .select("id, file_name, file_url")
        .eq("import_id", imp.id);

      const images = (latestImages ?? imp.import_images) as ImportImage[];

      const response = await fetch(MAP_DATA_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          import_id: imp.id,
          batch_name: imp.batch_name,
          status: imp.status,
          webhook_url: imp.webhook_url,
          created_at: imp.created_at,
          images: images.map((img) => ({
            id: img.id,
            file_name: img.file_name,
            file_url: img.file_url,
          })),
        }),
      });

      const data = await response.json();
      const { filtered, grouped } = parseWebhookResponse(data);

      setRawProducts(filtered);

      const freshProducts = grouped.length > 0 ? grouped : buildFallbackProducts(imp);

      setEditableProducts((prev) => {
        // First load — use webhook response as-is
        if (prev.length === 0) {
          setSelectedRows(new Set(freshProducts.map((_, i) => i)));
          return freshProducts;
        }

        // Subsequent loads — merge to avoid creating new rows for already-assigned images
        const assignedUrls = new Set(prev.flatMap((p) => p.images.map((i) => i.file_url)));

        // Keep existing products with their current image list (preserves local edits & uploads)
        const existingIds = new Set(prev.map((p) => p.productid));
        const merged = prev.map((p) => {
          const fresh = freshProducts.find((fp) => fp.productid === p.productid);
          return fresh ? { ...fresh, images: p.images } : p;
        });

        // Only append genuinely new products whose images aren't already assigned
        for (const fp of freshProducts) {
          if (!existingIds.has(fp.productid)) {
            const unassigned = fp.images.filter((i) => !assignedUrls.has(i.file_url));
            if (unassigned.length > 0) merged.push({ ...fp, images: unassigned });
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
      const fallback = buildFallbackProducts(imp);
      setEditableProducts(fallback);
      setSelectedRows(new Set(fallback.map((_, i) => i)));
    } finally {
      setLoading(false);
    }
  }, [imp]);

  // Reset only when the import itself changes, not on every close
  useEffect(() => {
    setEditableProducts([]);
    setRawProducts([]);
    setSelectedRows(new Set());
  }, [imp?.id]);

  // Fetch whenever the modal opens
  useEffect(() => {
    if (open && imp) fetchMapData();
  }, [open, imp?.id]);

  if (!imp) return null;

  // ── Selection ──────────────────────────────────────────────────────────────
  const allSelected =
    editableProducts.length > 0 && selectedRows.size === editableProducts.length;
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

  const removeGalleryImage = async (productIndex: number, imageIndex: number) => {
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
      const storagePath = img.file_url.split("/import-images/")[1];
      if (storagePath) {
        await supabase.storage.from("import-images").remove([storagePath]);
      }
      await supabase.from("import_images").delete().eq("file_url", img.file_url);
    } catch (err: any) {
      toast({
        title: "Image removed from view",
        description: "Could not delete from storage: " + (err?.message || "unknown error"),
        variant: "destructive",
      });
    }

    onOpenChange(false);
  };

  /** Append newly uploaded images to a product's image list. */
  const appendImagesToProduct = (
    productIndex: number,
    newImgs: { file_name: string; file_url: string }[]
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

  // ── Approve ────────────────────────────────────────────────────────────────
  const handleApprove = () => {
    const payload: WebhookProduct[] = editableProducts
      .filter((_, i) => selectedRows.has(i))
      .flatMap((p) =>
        p.images.map((img) => ({
          id: "",
          file_name: img.file_name,
          file_url: img.file_url,
          productid: p.productid,
          productname: p.shopify_product_name,
          referenceparent: p.referenceParent,
          ...rawProducts.find(
            (rp) => rp.productid === p.productid && rp.file_name === img.file_name
          ),
        } as WebhookProduct))
      );
    onApprove(imp, payload);
  };

  const galleryProduct =
    galleryEditorFor !== null ? editableProducts[galleryEditorFor] : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              Review & Send — {imp.batch_name || "Untitled"}
            </DialogTitle>
          </DialogHeader>

          <UploadZone
            importId={imp.id}
            label="Drop or click to upload new gallery images"
            onUploaded={(newImgs) => {
              const indices = selectedRows.size > 0 ? Array.from(selectedRows) : editableProducts.map((_, i) => i);
              indices.forEach((i) => appendImagesToProduct(i, newImgs));
              onOpenChange(false);
            }}
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm font-mono">Fetching product data…</p>
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 px-3">
                        <Checkbox
                          checked={allSelected ? true : someSelected ? "indeterminate" : false}
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
                        <TableRow key={index} className={!isSelected ? "opacity-50" : undefined}>
                          <TableCell className="px-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(index)}
                              aria-label={`Select ${product.shopify_product_name}`}
                            />
                          </TableCell>

                          <TableCell className="text-sm font-medium max-w-[200px]">
                            <span className="line-clamp-2">{product.shopify_product_name}</span>
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

          <DialogFooter className="pt-4">
            <div className="flex items-center text-xs text-muted-foreground mr-auto font-mono">
              {selectedRows.size} / {editableProducts.length} selected
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSending || loading || selectedRows.size === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                `Approve & Send (${selectedRows.size})`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            const currentLen = editableProducts[featurePickerFor]?.images.length ?? 0;
            appendImagesToProduct(featurePickerFor, newImgs);
            setFeatureImage(featurePickerFor, currentLen); // index after append
            setFeaturePickerFor(null);
            onOpenChange(false);
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
          onSetFeature={(imageIndex) => setFeatureImage(galleryEditorFor, imageIndex)}
          onRemoveGallery={(imageIndex) => removeGalleryImage(galleryEditorFor, imageIndex)}
          onNewImagesUploaded={(newImgs) => {
            appendImagesToProduct(galleryEditorFor, newImgs);
            onOpenChange(false);
          }}
        />
      )}
    </>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseWebhookResponse(data: unknown): {
  filtered: WebhookProduct[];
  grouped: MappedProduct[];
} {
  try {
    const raw = data as any;
    let products: WebhookProduct[] = [];

    if (Array.isArray(raw?.products)) {
      products = raw.products;
    } else if (Array.isArray(raw) && Array.isArray(raw[0]?.products)) {
      products = raw[0].products;
    }

    const filtered = products.filter((p) => p.productid);
    if (filtered.length === 0) return { filtered: [], grouped: [] };

    const groupedMap = new Map<string, WebhookProduct[]>();
    for (const item of filtered) {
      const key = item.productid;
      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(item);
    }

    const grouped = Array.from(groupedMap.values()).map((group) => ({
      shopify_product_name: group[0].productname,
      referenceParent: group[0].referenceparent ?? group[0].referenceParent ?? "",
      productid: group[0].productid,
      images: group.map((p) => ({ file_name: p.file_name, file_url: p.file_url })),
    }));

    return { filtered, grouped };
  } catch {
    return { filtered: [], grouped: [] };
  }
}

function buildFallbackProducts(imp: Import): MappedProduct[] {
  return [
    {
      shopify_product_name: imp.batch_name || "Untitled Product",
      referenceParent: "",
      productid: "",
      images: imp.import_images.map((img) => ({
        file_name: img.file_name,
        file_url: img.file_url,
      })),
    },
  ];
}
