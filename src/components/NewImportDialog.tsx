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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { resizeImagesForShopify } from "@/lib/image-resize";
import { startImportUpload } from "@/lib/import-upload-queue";

interface NewImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportCreated: () => void;
  /** Required when creating an import row (scoped to the dashboard brand). */
  brandId: string | null;
}

type Stage =
  | { kind: "idle" }
  | { kind: "resizing"; done: number; total: number }
  | { kind: "creating" };

export function NewImportDialog({
  open,
  onOpenChange,
  onImportCreated,
  brandId,
}: NewImportDialogProps) {
  const [batchName, setBatchName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [resizeForShopify, setResizeForShopify] = useState(true);
  const { toast } = useToast();

  const isBusy = stage.kind !== "idle";

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

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("You must be signed in.");

      // Stage 1: optionally resize each image client-side. For 1000+ photos at 4–7 MB
      // each, this is the difference between a 30s upload and a 30-minute one.
      let processed = files;
      if (resizeForShopify) {
        setStage({ kind: "resizing", done: 0, total: files.length });
        const resized = await resizeImagesForShopify(files, {
          concurrency: 4,
          onProgress: (done, total) =>
            setStage({ kind: "resizing", done, total }),
        });
        processed = resized.map((r) => r.file);
      }

      setStage({ kind: "creating" });

      // Stage 2: ask the edge function to create the import + sign upload URLs.
      const { data: createRes, error: createErr } = await supabase.functions.invoke<{
        ok?: boolean;
        error?: string;
        import_id?: string;
        uploads?: Array<{ file_name: string; path: string; token: string; public_url: string }>;
      }>("shopify-import-create", {
        body: {
          brand_id: brandId.trim(),
          batch_name: batchName.trim() || "Untitled",
          files: processed.map((f) => ({ name: f.name, size: f.size })),
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (createErr) {
        const ctx = (createErr as { context?: Response }).context;
        if (ctx instanceof Response) {
          try {
            const body = await ctx.clone().json();
            if (body?.error) throw new Error(body.error);
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== createErr.message) throw parseErr;
          }
        }
        throw createErr;
      }
      if (!createRes?.ok || !createRes.uploads || !createRes.import_id) {
        throw new Error(createRes?.error || "Could not create import");
      }
      if (createRes.uploads.length !== processed.length) {
        throw new Error("Server did not return an upload slot for every file");
      }

      // Stage 3: hand the work to the module-level upload queue and close immediately.
      // The queue keeps running even if the dialog or page route unmounts; the imports
      // list shows live progress for any in-flight uploads.
      startImportUpload({
        importId: createRes.import_id,
        files: processed,
        uploads: createRes.uploads.map((u) => ({ path: u.path, token: u.token })),
      });

      toast({
        title: "Upload started in background",
        description: `${processed.length} image${processed.length === 1 ? "" : "s"} uploading. You can close this dialog.`,
      });
      setBatchName("");
      setFiles([]);
      setStage({ kind: "idle" });
      onOpenChange(false);
      onImportCreated();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err?.message || "Something went wrong.",
        variant: "destructive",
      });
      setStage({ kind: "idle" });
    }
  };

  const handleClose = (val: boolean) => {
    // While we're resizing or talking to the edge function, the dialog must stay open
    // to surface progress. After we hand off to the queue we set stage back to idle.
    if (isBusy) return;
    onOpenChange(val);
    if (!val) {
      setBatchName("");
      setFiles([]);
    }
  };

  const submitLabel = (() => {
    if (stage.kind === "resizing") {
      return `Resizing ${stage.done} / ${stage.total}…`;
    }
    if (stage.kind === "creating") return "Starting upload…";
    return `Upload ${files.length} image${files.length !== 1 ? "s" : ""}`;
  })();

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
              disabled={isBusy}
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
              onClick={() => !isBusy && document.getElementById("file-input")?.click()}
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
                disabled={isBusy}
              />
            </div>
          </div>

          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={resizeForShopify}
              onCheckedChange={(v) => setResizeForShopify(v === true)}
              disabled={isBusy}
              className="mt-0.5"
            />
            <span>
              <span className="font-mono">Resize for Shopify (recommended)</span>
              <br />
              Shrinks each image to <span className="font-mono">2048&nbsp;px</span> wide,
              re-encoded as JPEG quality 85. Typical 4–7 MB photos drop to 200–800 KB,
              well under the&nbsp;1&nbsp;MB target.
            </span>
          </label>

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
                    onClick={() => !isBusy && removeFile(i)}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                    disabled={isBusy}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isBusy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isBusy || files.length === 0}>
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {submitLabel}
              </>
            ) : (
              <>{submitLabel}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
