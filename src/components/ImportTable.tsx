import { useState } from "react";
import { format } from "date-fns";
import { Send, Eye, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { SendApprovalDialog, WebhookProduct } from "@/components/SendApprovalDialog";
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

interface ImportTableProps {
  imports: Import[];
  webhookUrl: string;
  onStatusChange: () => void;
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

export function ImportTable({
  imports,
  webhookUrl,
  onStatusChange,
}: ImportTableProps) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [previewImport, setPreviewImport] = useState<Import | null>(null);
  const [approvalImport, setApprovalImport] = useState<Import | null>(null);
  const { toast } = useToast();

  const handleTriggerWebhook = async (imp: Import, products: WebhookProduct[]) => {
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
  };

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
              <TableRow key={imp.id}>
                <TableCell className="font-mono text-xs tabular-nums">
                  {format(new Date(imp.created_at), "MMM dd, HH:mm")}
                </TableCell>
                <TableCell className="text-sm">
                  {imp.batch_name || (
                    <span className="text-muted-foreground italic">
                      Untitled
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {imp.import_images.length > 0 && (
                      <div className="flex -space-x-2">
                        {imp.import_images.slice(0, 3).map((img) => (
                          <div
                            key={img.id}
                            className="h-8 w-8 rounded border-2 border-card bg-muted overflow-hidden"
                          >
                            <img
                              src={img.file_url}
                              alt={img.file_name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                        {imp.import_images.length > 3 && (
                          <div className="h-8 w-8 rounded border-2 border-card bg-muted flex items-center justify-center">
                            <span className="text-[10px] font-mono text-muted-foreground">
                              +{imp.import_images.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      {imp.import_images.length}
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
                      onClick={() => setPreviewImport(imp)}
                      disabled={imp.import_images.length === 0}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setApprovalImport(imp)}
                        disabled={
                          sendingId === imp.id || imp.status === "processing"
                        }
                      >
                        {sendingId === imp.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ImagePreviewDialog
        open={!!previewImport}
        onOpenChange={() => setPreviewImport(null)}
        images={previewImport?.import_images || []}
        batchName={previewImport?.batch_name || "Import"}
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
      />
    </>
  );
}
