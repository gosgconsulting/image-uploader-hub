import { useState } from "react";
import { format } from "date-fns";
import { Eye, Pencil, Check, X, DollarSign } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Refund } from "@/refund.mock";
import { ViewPdfDialog } from "@/components/ViewPdfDialog";
import { EditRefundDialog } from "@/components/EditRefundDialog";
import { useToast } from "@/hooks/use-toast";

interface RefundTableProps {
  refunds: Refund[];
  onRefundUpdate: (id: string, updates: Partial<Refund>) => void;
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

export function RefundTable({ refunds, onRefundUpdate }: RefundTableProps) {
  const [previewRefund, setPreviewRefund] = useState<Refund | null>(null);
  const [editRefund, setEditRefund] = useState<Refund | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const handleApprove = (refund: Refund) => {
    onRefundUpdate(refund.id, { status: "completed" });
    toast({
      title: "Refund approved",
      description: `Refund ${refund.orderId} has been approved.`,
    });
  };

  const handleReject = (refund: Refund) => {
    onRefundUpdate(refund.id, { status: "failed" });
    toast({
      title: "Refund rejected",
      description: `Refund ${refund.orderId} has been rejected.`,
      variant: "destructive",
    });
  };

  const handleRefund = async (refund: Refund) => {
    if (refund.status === "failed") return;

    setProcessingId(refund.id);
    if (refund.status === "pending") {
      onRefundUpdate(refund.id, { status: "processing" });
    }

    // Simulate async processing
    setTimeout(() => {
      onRefundUpdate(refund.id, { status: "completed" });
      setProcessingId(null);
      toast({
        title: "Refund processed",
        description: `Refund ${refund.orderId} has been processed successfully.`,
      });
    }, 1000);
  };

  if (refunds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="font-mono text-sm">No refunds found</p>
        <p className="text-xs mt-1">Adjust your filters to see more results</p>
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
                Source
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Order ID#
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Customer
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                SKU(s)
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Qty
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Order Date
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Original Amount
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Return Fee
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Calculated Refund
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                AI Confidence
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
            {refunds.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-mono text-xs tabular-nums">
                  {format(new Date(refund.date), "MMM dd, HH:mm")}
                </TableCell>
                <TableCell className="text-sm">{refund.source}</TableCell>
                <TableCell className="font-mono text-xs">{refund.orderId}</TableCell>
                <TableCell className="text-sm">{refund.customer}</TableCell>
                <TableCell className="text-sm">
                  <div className="max-w-[120px] truncate">
                    {refund.skus.join(", ")}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {refund.qty}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {format(new Date(refund.orderDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  €{refund.originalAmount.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  –€3.00
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  €{refund.calculatedRefund.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {(refund.aiConfidence * 100).toFixed(0)}%
                </TableCell>
                <TableCell>
                  <Badge
                    variant={statusVariant[refund.status] || "outline"}
                    className="font-mono text-[10px] uppercase"
                  >
                    {refund.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditRefund(refund)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Edit Refund Amount</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreviewRefund(refund)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View PDF</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(refund)}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Approve</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReject(refund)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reject</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefund(refund)}
                          disabled={refund.status === "failed" || processingId === refund.id}
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refund</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ViewPdfDialog
        open={!!previewRefund}
        onOpenChange={() => setPreviewRefund(null)}
        pdfUrl={previewRefund?.pdfUrl || ""}
      />

      <EditRefundDialog
        open={!!editRefund}
        onOpenChange={() => setEditRefund(null)}
        refund={editRefund}
        onSave={(updates) => {
          if (editRefund) {
            onRefundUpdate(editRefund.id, updates);
            setEditRefund(null);
          }
        }}
      />
    </>
  );
}
