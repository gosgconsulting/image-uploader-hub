import { useState } from "react";
import { format } from "date-fns";
import { X, DollarSign } from "lucide-react";
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
  const [editRefund, setEditRefund] = useState<Refund | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

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
                Order ID#
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Customer
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Order Date
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Refund Amount
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Status
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                <div className="flex justify-end pr-6">
                  Actions
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.map((refund) => (
              <TableRow key={refund.id}>
                <TableCell className="font-mono text-xs tabular-nums">
                  {format(new Date(refund.date), "MMM dd, HH:mm")}
                </TableCell>
                <TableCell className="font-mono text-xs">{refund.orderId}</TableCell>
                <TableCell className="text-sm">{refund.customer}</TableCell>
                <TableCell className="font-mono text-xs">
                  {format(new Date(refund.orderDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell 
                  className="font-mono text-xs tabular-nums cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setEditRefund(refund)}
                >
                  €{refund.calculatedRefund.toFixed(2)}
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
