import { useMemo } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Refund } from "@/refund.mock";

interface BulkRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRefunds: Refund[];
  onConfirm: () => void;
  isProcessing?: boolean;
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

export function BulkRefundDialog({
  open,
  onOpenChange,
  selectedRefunds,
  onConfirm,
  isProcessing = false,
}: BulkRefundDialogProps) {
  const totalAmount = useMemo(() => {
    return selectedRefunds.reduce((sum, refund) => sum + refund.calculatedRefund, 0);
  }, [selectedRefunds]);

  const canProcess = selectedRefunds.every((r) => r.status !== "failed");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-mono">
            Process Bulk Refund ({selectedRefunds.length} {selectedRefunds.length === 1 ? "item" : "items"})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 overflow-y-auto max-h-[60vh]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">
                    Order ID#
                  </TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">
                    Source of Order
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedRefunds.map((refund) => (
                  <TableRow key={refund.id}>
                    <TableCell className="font-mono text-xs">
                      {refund.orderId}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {refund.source}
                    </TableCell>
                    <TableCell className="text-sm">{refund.customer}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {format(new Date(refund.orderDate), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell className="font-mono text-xs tabular-nums">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-mono text-sm text-muted-foreground">
              Total Refund Amount:
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums">
              €{totalAmount.toFixed(2)}
            </span>
          </div>

          {!canProcess && (
            <div className="text-sm text-destructive font-mono">
              Note: Some selected refunds have "failed" status and cannot be processed.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canProcess || isProcessing}
          >
            {isProcessing ? "Processing..." : "Confirm Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
