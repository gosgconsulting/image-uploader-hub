import { memo, useCallback, useState } from "react";
import { format } from "date-fns";
import { Send, Eye, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
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
import {
  SendApprovalDialog,
  type SendApprovalImport,
  WebhookProduct,
} from "@/components/SendApprovalDialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { deleteImportWithStorage } from "@/lib/delete-import";

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
  processing: "secondary",
  completed: "default",
  failed: "destructive",
};

type ImportTableRowProps = {
  imp: ImportListRow;
  sendingId: string | null;
  deletingId: string | null;
  onPreview: (imp: ImportListRow) => void;
  onSend: (imp: ImportListRow) => void;
  onDelete: (imp: ImportListRow) => void;
};

const ImportTableRow = memo(function ImportTableRow({
  imp,
  sendingId,
  deletingId,
  onPreview,
  onSend,
  onDelete,
}: ImportTableRowProps) {
  const isSending = sendingId === imp.id;
  const isDeleting = deletingId === imp.id;
  const deleteDisabled =
    deletingId !== null || isSending || imp.status === "processing";

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
        <Badge
          variant={statusVariant[imp.status] || "outline"}
          className="font-mono text-[10px] uppercase"
        >
          {imp.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onPreview(imp)}
            disabled={imp.image_count === 0}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => onSend(imp)}
            disabled={isSending || imp.status === "processing"}
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
  const [deleteTarget, setDeleteTarget] = useState<ImportListRow | null>(null);
  const [preview, setPreview] = useState<{
    batchName: string;
    images: ImportImage[];
    loading: boolean;
  } | null>(null);
  const [approvalImport, setApprovalImport] = useState<ImportListRow | null>(
    null,
  );
  const { toast } = useToast();

  const openPreview = useCallback((imp: ImportListRow) => {
    setPreview({
      batchName: imp.batch_name || "Import",
      images: [],
      loading: true,
    });
    void (async () => {
      const { data, error } = await supabase
        .from("import_images")
        .select("id, file_name, file_url")
        .eq("import_id", imp.id)
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "Could not load images",
          description: error.message,
          variant: "destructive",
        });
        setPreview(null);
        return;
      }
      setPreview({
        batchName: imp.batch_name || "Import",
        images: (data ?? []) as ImportImage[],
        loading: false,
      });
    })();
  }, [toast]);

  const handleTriggerWebhook = useCallback(async (
    imp: SendApprovalImport,
    products: WebhookProduct[],
  ) => {
    const url = imp.webhook_url || webhookUrl;
    if (!url) {
      toast({
        title: "No webhook URL",
        description:
          "Please configure a webhook URL in settings or on the import.",
        variant: "destructive",
      });
      return;
    }

    setSendingId(imp.id);
    try {
      await supabase
        .from("imports")
        .update({ status: "processing" })
        .eq("id", imp.id);

      onStatusChange();

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          import_id: imp.id,
          batch_name: imp.batch_name,
          timestamp: imp.created_at,
          products: products,
        }),
      });

      const data = await response.json();

      if (data?.success) {
        await supabase
          .from("imports")
          .update({ status: "completed" })
          .eq("id", imp.id);
      } else {
        await supabase
          .from("imports")
          .update({ status: "failed" })
          .eq("id", imp.id);
        console.log("ERROR ==========>", data);
      }
      onStatusChange();

      toast({
        title: "Webhook triggered",
        description: "Import data sent. Check your automation tool for status.",
      });
    } catch {
      toast({
        title: "Failed to trigger webhook",
        description: "Check the webhook URL and try again.",
        variant: "destructive",
      });
    } finally {
      setSendingId(null);
    }
  }, [webhookUrl, onStatusChange, toast]);

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

      <SendApprovalDialog
        open={!!approvalImport}
        onOpenChange={(open) => {
          if (!open) setApprovalImport(null);
        }}
        imp={approvalImport}
        onApprove={(imp, products) => {
          setApprovalImport(null);
          handleTriggerWebhook(imp, products);
        }}
        isSending={sendingId === approvalImport?.id}
        onDataChange={onStatusChange}
        brandId={brandId}
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
