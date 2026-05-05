import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface NewImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCreated: () => void;
  /** Required when creating an import row (scoped to the dashboard brand). */
  brandId: string | null;
}

export function NewImportDialog({
  open,
  onOpenChange,
  onImportCreated,
  brandId,
}: NewImportDialogProps) {
  const [batchName, setBatchName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).filter((f) =>
        f.type.startsWith("image/")
      );
      setFiles((prev) => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({ title: "No images", description: "Add at least one image.", variant: "destructive" });
      return;
    }
    if (!brandId?.trim()) {
      toast({
        title: "Select a brand",
        description: "Choose a brand in the sidebar before creating an import.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Sparti requires `batch_name` NOT NULL, so default empty input to "Untitled".
      const trimmedBrand = brandId.trim();
      const { data: importData, error: importError } = await supabase
        .from("shopify_imports")
        .insert({
          batch_name: batchName.trim() || "Untitled",
          brand_id: trimmedBrand,
        })
        .select()
        .single();

      if (importError || !importData) throw importError;

      // Upload each file. Position is 1-based and required by shopify_import_images.
      const imageRecords = [];
      let position = 1;
      for (const file of files) {
        const filePath = `${importData.id}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("shopify-import-images")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("shopify-import-images")
          .getPublicUrl(filePath);

        imageRecords.push({
          import_id: importData.id,
          brand_id: trimmedBrand,
          file_name: file.name,
          file_url: urlData.publicUrl,
          file_size: file.size,
          position: position++,
        });
      }

      const { error: imgError } = await supabase
        .from("shopify_import_images")
        .insert(imageRecords);

      if (imgError) throw imgError;

      toast({ title: "Import created", description: `${files.length} images uploaded.` });
      setBatchName("");
      setFiles([]);
      onOpenChange(false);
      onImportCreated();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!isUploading) {
      onOpenChange(val);
      if (!val) {
        setBatchName("");
        setFiles([]);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">New Import</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="batch-name" className="font-mono text-xs uppercase tracking-wider">
              Batch Name
            </Label>
            <Input
              id="batch-name"
              placeholder="e.g. Spring Collection 2025"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">Images</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`
                relative flex flex-col items-center justify-center rounded-md border-2 border-dashed p-8 transition-colors cursor-pointer
                ${isDragging ? "border-accent bg-accent/5" : "border-border hover:border-muted-foreground/40"}
              `}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drop images or folders here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                PNG, JPG, WEBP supported
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <span className="font-mono text-xs truncate flex-1">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                    {(file.size / 1024).toFixed(0)}KB
                  </span>
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || files.length === 0}>
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>Upload {files.length} image{files.length !== 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
