import { memo, useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  Send,
  Eye,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ListChecks,
  History,
  ArrowUpDown,
  Minimize2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
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
import { Badge } from "@/components/ui/badge";
import { ImagePreviewDialog } from "@/components/ImagePreviewDialog";
import { ImportStatusModal } from "@/components/ImportStatusModal";
import { CompressImagesDialog } from "@/components/CompressImagesDialog";
import { DeduplicateDialog } from "@/components/DeduplicateDialog";
import {
  SendApprovalDialog,
  type SendApprovalImport,
  type UploadMode,
  WebhookProduct,
} from "@/components/SendApprovalDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { deleteImportWithStorage } from "@/lib/delete-import";
import { fetchAllImportImageRows } from "@/lib/fetch-all-import-images";
import { useImportUploadProgress } from "@/lib/import-upload-queue";
import { takeImportSnapshot } from "@/lib/shopify-import-snapshots";
import { reorderImportMedia } from "@/lib/shopify-product-reorder";
import { ReorderPreviewDialog } from "@/components/ReorderPreviewDialog";
import { RollbackDialog } from "@/components/RollbackDialog";

export interface ImportImage {
  id: string;
  file_name: string;
  file_url: string;
}

/** Row from `imports_with_list_preview` (list page). */
export interface ImportListRow {
  id: string;
  batch_name: string | null;
  status: string;
  webhook_url: string | null;
  created_at: string;
  image_count: number;
  preview_images: ImportImage[];
  succeeded_count?: number;
  failed_count?: number;
  pending_count?: number;
  uploading_count?: number;
}

interface ImportTableProps {
  imports: ImportListRow[];
  webhookUrl: string;
  onStatusChange: () => void;
  brandId?: string | null;
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  queued: "secondary",
  processing: "secondary",
  completed: "default",
  partial: "secondary",
  failed: "destructive",
};

type ImportTableRowProps = {
  imp: ImportListRow;
  sendingId: string | null;
  deletingId: string | null;
  onPreview: (imp: ImportListRow) => void;
  onSend: (imp: ImportListRow) => void;
  onDelete: (imp: ImportListRow) => void;
  onShowStatus: (imp: ImportListRow) => void;
  onRollback: (imp: ImportListRow) => void;
  onReorder: (imp: ImportListRow) => void;
  onCompress: (imp: ImportListRow) => void;
  onDedup: (imp: ImportListRow) => void;
};

const ImportTableRow = memo(function ImportTableRow({
  imp,
  sendingId,
  deletingId,
  onPreview,
  onSend,
  onDelete,
  onShowStatus,
  onRollback,
  onReorder,
  onCompress,
  onDedup,
}: ImportTableRowProps) {
  const isSending = sendingId === imp.id;
  const isDeleting = deletingId === imp.id;
  // Live progress from the in-browser upload queue (the file→storage step). This is
  // separate from `imp.status`, which tracks the Shopify-push step and is server-side.
  const uploadProgress = useImportUploadProgress(imp.id);
  const uploadInFlight =
    uploadProgress !== null && uploadProgress.finishedAt === null;
  // Allow retrying queued/processing rows: a stuck `processing` (worker timed out) and a
  // `partial` (some images failed) should both be re-sendable. Only block during the
  // synchronous handoff (when our own click is in flight) or while the local browser
  // queue is still pushing files for this import to storage.
  const sendDisabled = isSending || uploadInFlight;
  const deleteDisabled = deletingId !== null || isSending || uploadInFlight;
  // Reorder relies on shopify_product_id rows that are populated by the send step,
  // so block until at least one image has succeeded on Shopify.
  const reorderDisabled =
    isSending || uploadInFlight || (imp.succeeded_count ?? 0) === 0;
  const isActive = imp.status === "queued" || imp.status === "processing";
  const showStatusButton =
    imp.status !== "pending" || (imp.succeeded_count ?? 0) + (imp.failed_count ?? 0) > 0;

  return (
    <TableRow>
      <TableCell className="font-mono text-xs tabular-nums">
        {format(new Date(imp.created_at), "MMM dd, HH:mm")}
      </TableCell>
      <TableCell className="text-sm">
        {imp.batch_name || (
          <span className="text-muted-foreground italic">Untitled</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {imp.preview_images.length > 0 && (
            <div className="flex -space-x-2 isolate">
              {imp.preview_images.map((img) => (
                <div
                  key={img.id}
                  className="h-8 w-8 shrink-0 rounded border-2 border-card bg-muted overflow-hidden"
                >
                  <img
                    src={img.file_url}
                    alt={img.file_name}
                    className="h-full w-full object-cover pointer-events-none"
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                  />
                </div>
              ))}
              {imp.image_count > imp.preview_images.length && (
                <div className="h-8 w-8 shrink-0 rounded border-2 border-card bg-muted flex items-center justify-center">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    +{imp.image_count - imp.preview_images.length}
                  </span>
                </div>
              )}
            </div>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {imp.image_count}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <Badge
            variant={statusVariant[imp.status] || "outline"}
            className="font-mono text-[10px] uppercase w-fit"
          >
            {isActive && (
              <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
            )}
            {imp.status}
          </Badge>
          {(imp.succeeded_count !== undefined || imp.failed_count !== undefined) &&
            (imp.succeeded_count! + imp.failed_count! > 0) && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {imp.succeeded_count}✓ {imp.failed_count ? `${imp.failed_count}✗` : ""}
              </span>
            )}
          {uploadProgress && (
            <span className="text-[10px] font-mono text-blue-600 inline-flex items-center gap-1">
              {uploadProgress.finishedAt === null ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : null}
              uploading {uploadProgress.done + uploadProgress.failed}
              /{uploadProgress.total}
              {uploadProgress.failed > 0 && (
                <span className="text-destructive">
                  &nbsp;({uploadProgress.failed} failed)
                </span>
              )}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onPreview(imp)}
            disabled={imp.image_count === 0}
            aria-label="Preview images"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          {showStatusButton && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => onShowStatus(imp)}
              aria-label="View upload status"
            >
              <ListChecks className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onRollback(imp)}
            aria-label="View backups & rollback"
          >
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onSend(imp)}
            disabled={sendDisabled}
            aria-label={isActive ? "Resend (currently active)" : "Send to Shopify"}
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onReorder(imp)}
            disabled={reorderDisabled}
            aria-label="Reorder product images by filename"
            title="Reorder product images by filename"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onCompress(imp)}
            disabled={imp.image_count === 0 || uploadInFlight}
            aria-label="Compress oversized images"
            title="Compress oversized images (Shopify ≤25 MB)"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onDedup(imp)}
            disabled={
              uploadInFlight ||
              imp.status === "pending" ||
              imp.status === "queued" ||
              imp.status === "processing" ||
              imp.image_count === 0
            }
            aria-label="Deduplicate misattributed images"
            title="Deduplicate misattributed images on Shopify (AI-assisted)"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onDelete(imp)}
            disabled={deleteDisabled}
            aria-label="Delete import"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            )}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

export function parsePreviewImagesJson(raw: unknown): ImportImage[] {
  if (!Array.isArray(raw)) return [];
  const out: ImportImage[] = [];
  for (const el of raw) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const id = String(o.id ?? "");
    const file_name = String(o.file_name ?? "");
    const file_url = String(o.file_url ?? "");
    if (!file_url) continue;
    out.push({
      id: id || `${file_name}:${file_url}`,
      file_name,
      file_url,
    });
  }
  return out;
}

export function ImportTable({
  imports,
  webhookUrl,
  onStatusChange,
  brandId = null,
}: ImportTableProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderTarget, setReorderTarget] = useState<ImportListRow | null>(null);
  // Imports the user just sent. We watch for them to land in a terminal state
  // (completed/partial) and then auto-reorder so the gallery follows the
  // filename convention without a second click.
  const pendingAutoReorderRef = useRef<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<ImportListRow | null>(null);
  const [preview, setPreview] = useState<{
    batchName: string;
    images: ImportImage[];
    loading: boolean;
  } | null>(null);
  const [approvalImport, setApprovalImport] = useState<ImportListRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<ImportListRow | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<ImportListRow | null>(null);
  const [compressTarget, setCompressTarget] = useState<ImportListRow | null>(null);
  const [dedupTarget, setDedupTarget] = useState<ImportListRow | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const trimmedBrand = brandId?.trim() ?? "";
    if (!trimmedBrand) return;
    const pending = pendingAutoReorderRef.current;
    if (pending.size === 0) return;
    const ready: string[] = [];
    for (const imp of imports) {
      if (!pending.has(imp.id)) continue;
      if (
        imp.status === "completed" ||
        imp.status === "partial" ||
        imp.status === "failed"
      ) {
        ready.push(imp.id);
      }
    }
    if (ready.length === 0) return;
    for (const id of ready) pending.delete(id);
    void (async () => {
      for (const id of ready) {
        const res = await reorderImportMedia(trimmedBrand, id, { dryRun: false });
        if (!res.ok) {
          toast({
            title: "Auto-reorder failed",
            description: res.error,
            variant: "destructive",
          });
          continue;
        }
        const moved = res.results.reduce((acc, r) => acc + r.moved, 0);
        if (moved > 0) {
          toast({
            title: "Gallery auto-reordered",
            description: `${moved} image${moved === 1 ? "" : "s"} moved across ${res.processed} product${res.processed === 1 ? "" : "s"}.`,
          });
        }
      }
    })();
  }, [imports, brandId, toast]);

  const openPreview = useCallback((imp: ImportListRow) => {
    setPreview({
      batchName: imp.batch_name || "Import",
      images: [],
      loading: true,
    });
    void (async () => {
      const result = await fetchAllImportImageRows<ImportImage>(supabase, {
        importId: imp.id,
        select: "id, file_name, file_url",
      });
      if (!result.ok) {
        toast({
          title: "Could not load images",
          description: result.error,
          variant: "destructive",
        });
        setPreview(null);
        return;
      }
      setPreview({
        batchName: imp.batch_name || "Import",
        images: result.rows,
        loading: false,
      });
    })();
  }, [toast]);

  const handleTriggerWebhook = useCallback(async (
    imp: SendApprovalImport,
    products: WebhookProduct[],
    mode: UploadMode,
    backup: boolean,
  ) => {
    const webhookTarget = imp.webhook_url || webhookUrl;
    const trimmedBrand = brandId?.trim() ?? "";

    if (!trimmedBrand && !webhookTarget) {
      toast({
        title: "Cannot send import",
        description:
          "Select a brand with saved Shopify credentials, or configure a webhook URL in settings.",
        variant: "destructive",
      });
      return;
    }

    setSendingId(imp.id);

    // Snapshot current Shopify product media BEFORE we touch anything. If the user
    // unchecked the backup box, skip. If snapshot fails we abort so they don't lose
    // state silently.
    if (backup && trimmedBrand) {
      const productIds = Array.from(
        new Set(products.map((p) => p.productid).filter(Boolean)),
      );
      if (productIds.length > 0) {
        const snap = await takeImportSnapshot({
          brandId: trimmedBrand,
          importId: imp.id,
          productIds,
        });
        if (!snap.ok) {
          toast({
            title: "Backup failed — send aborted",
            description: snap.error,
            variant: "destructive",
          });
          setSendingId(null);
          return;
        }
        toast({
          title: "Backup saved",
          description: `Snapshotted ${snap.snapshots} product${snap.snapshots === 1 ? "" : "s"}. You can rollback from the history icon.`,
        });
      }
    }
    try {
      type ImportNativeResponse = {
        success?: boolean;
        accepted?: boolean;
        message?: string;
        pending?: number;
        skipped_already_done?: number;
      };

      let nativeAccepted = false;
      let blockWebhookDup = false;

      if (trimmedBrand) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.access_token) {
          const expMs =
            typeof session.expires_at === "number"
              ? session.expires_at * 1000
              : 0;
          const stale = expMs > 0 && expMs < Date.now() + 90_000;
          if (stale) await supabase.auth.refreshSession();

          // The function now returns immediately after queueing — actual upload runs
          // in the background. We do NOT mark the import completed here; the worker
          // does that when it finishes. Polling on the list page surfaces progress.
          const { data, error } =
            await supabase.functions.invoke<ImportNativeResponse>(
              "shopify-import-media",
              {
                body: {
                  brand_id: trimmedBrand,
                  import_id: imp.id,
                  products,
                  upload_mode: mode,
                },
              },
            );

          if (!error && data?.accepted) {
            nativeAccepted = true;
            // Mark this import for auto-reorder once the background worker finishes.
            // The watcher effect below detects the terminal status flip.
            pendingAutoReorderRef.current.add(imp.id);
            const pending = typeof data.pending === "number" ? data.pending : products.length;
            const skipped = data.skipped_already_done ?? 0;
            toast({
              title: "Upload queued",
              description: skipped > 0
                ? `Uploading ${pending} image${pending === 1 ? "" : "s"} in background. ${skipped} already done.`
                : `Uploading ${pending} image${pending === 1 ? "" : "s"} in background. Refreshes automatically.`,
            });
          } else if (!webhookTarget) {
            await supabase
              .from("shopify_imports")
              .update({ status: "failed" })
              .eq("id", imp.id);

            let description =
              typeof data?.message === "string"
                ? data.message
                : ("Save Shopify credentials for this brand under Settings." as const);

            if (error?.message?.trim())
              description = error.message.trim();

            toast({
              title: "Shopify upload failed",
              description,
              variant: "destructive",
            });
          } else {
            const credOrInfra =
              Boolean(error) ||
              (typeof data?.message === "string" &&
                /No Shopify credentials saved for this brand/i.test(
                  data.message
                ));

            if (!credOrInfra) {
              blockWebhookDup = true;
              await supabase
                .from("shopify_imports")
                .update({ status: "failed" })
                .eq("id", imp.id);
              toast({
                title: "Shopify upload failed",
                description:
                  typeof data?.message === "string"
                    ? data.message
                    : "Shopify rejected the upload.",
                variant: "destructive",
              });
            }
          }
        } else if (!webhookTarget) {
          await supabase
            .from("shopify_imports")
            .update({ status: "failed" })
            .eq("id", imp.id);
          toast({
            title: "Session expired",
            description: "Sign in again to upload images to Shopify.",
            variant: "destructive",
          });
        }
      }

      if (!nativeAccepted && webhookTarget && !blockWebhookDup) {
        // Webhook fallback path (no native brand creds): keep prior synchronous behavior.
        await supabase
          .from("shopify_imports")
          .update({ status: "processing" })
          .eq("id", imp.id);
        onStatusChange();

        const response = await fetch(webhookTarget, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            import_id: imp.id,
            batch_name: imp.batch_name,
            timestamp: imp.created_at,
            products,
            upload_mode: mode,
          }),
        });

        let parsed: { success?: boolean } = {};
        try {
          parsed = await response.json();
        } catch {
          parsed = {};
        }

        if (parsed?.success) {
          await supabase
            .from("shopify_imports")
            .update({ status: "completed" })
            .eq("id", imp.id);
          toast({
            title: webhookTarget && trimmedBrand ? "Imported via webhook" : "Webhook triggered",
            description:
              webhookTarget && trimmedBrand
                ? "Native upload unavailable; automation completed the run."
                : "Import data sent. Check your automation tool for status.",
          });
        } else {
          await supabase
            .from("shopify_imports")
            .update({ status: "failed" })
            .eq("id", imp.id);
          toast({
            title: "Webhook failed",
            description: "The automation endpoint did not confirm success.",
            variant: "destructive",
          });
        }
      }

      onStatusChange();
    } catch {
      try {
        await supabase
          .from("shopify_imports")
          .update({ status: "failed" })
          .eq("id", imp.id);
      } catch {
        /* ignore */
      }
      toast({
        title: "Upload failed",
        description: "Something went wrong. Try again.",
        variant: "destructive",
      });
      onStatusChange();
    } finally {
      setSendingId(null);
    }
  }, [brandId, webhookUrl, onStatusChange, toast]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    const result = await deleteImportWithStorage(supabase, deleteTarget.id);
    setDeletingId(null);
    if (result.ok === false) {
      toast({
        title: "Delete failed",
        description: result.message,
        variant: "destructive",
      });
      return;
    }
    setDeleteTarget(null);
    onStatusChange();
    toast({
      title: "Import deleted",
      description: "The import and its images were removed.",
    });
  }, [deleteTarget, onStatusChange, toast]);

  if (imports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-4 opacity-40" />
        <p className="font-mono text-sm">No imports yet</p>
        <p className="text-xs mt-1">Create your first import to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Date
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Batch
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Images
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map((imp) => (
              <ImportTableRow
                key={imp.id}
                imp={imp}
                sendingId={sendingId}
                deletingId={deletingId}
                onPreview={openPreview}
                onSend={setApprovalImport}
                onDelete={setDeleteTarget}
                onShowStatus={setStatusTarget}
                onRollback={setRollbackTarget}
                onReorder={setReorderTarget}
                onCompress={setCompressTarget}
                onDedup={setDedupTarget}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      <ImagePreviewDialog
        open={!!preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        images={preview?.images || []}
        batchName={preview?.batchName || "Import"}
        loading={preview?.loading ?? false}
      />

      <ImportStatusModal
        open={!!statusTarget}
        onOpenChange={(open) => {
          if (!open) setStatusTarget(null);
        }}
        importId={statusTarget?.id ?? null}
        batchName={statusTarget?.batch_name || "Import"}
        importStatus={statusTarget?.status || "pending"}
        brandId={brandId}
      />

      <SendApprovalDialog
        open={!!approvalImport}
        onOpenChange={(open) => {
          if (!open) setApprovalImport(null);
        }}
        imp={approvalImport}
        onApprove={(imp, products, mode, backup) => {
          setApprovalImport(null);
          handleTriggerWebhook(imp, products, mode, backup);
        }}
        isSending={sendingId === approvalImport?.id}
        onDataChange={onStatusChange}
        brandId={brandId}
      />

      <RollbackDialog
        open={!!rollbackTarget}
        onOpenChange={(open) => {
          if (!open) setRollbackTarget(null);
        }}
        importId={rollbackTarget?.id ?? null}
        batchName={rollbackTarget?.batch_name ?? null}
        brandId={brandId}
      />

      <CompressImagesDialog
        open={!!compressTarget}
        onOpenChange={(open) => {
          if (!open) setCompressTarget(null);
        }}
        importId={compressTarget?.id ?? null}
        batchName={compressTarget?.batch_name ?? null}
        onCompleted={onStatusChange}
      />

      <DeduplicateDialog
        open={!!dedupTarget}
        onOpenChange={(open) => {
          if (!open) setDedupTarget(null);
        }}
        importId={dedupTarget?.id ?? null}
        batchName={dedupTarget?.batch_name ?? null}
        brandId={brandId}
        onApplied={onStatusChange}
      />

      <ReorderPreviewDialog
        open={!!reorderTarget}
        onOpenChange={(open) => {
          if (!open) setReorderTarget(null);
        }}
        importId={reorderTarget?.id ?? null}
        batchName={reorderTarget?.batch_name ?? null}
        brandId={brandId}
        onApplied={onStatusChange}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && deletingId === null) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this import?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the import record, all linked image rows, and every
              file in storage for this batch. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deletingId !== null}
              onClick={handleConfirmDelete}
            >
              {deletingId !== null ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
