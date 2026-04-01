import { useState, useEffect } from "react";
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
import type { Refund } from "@/types/refund";

interface EditRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: Refund | null;
  onSave: (updates: { calculatedRefund: number }) => void;
}

export function EditRefundDialog({
  open,
  onOpenChange,
  refund,
  onSave,
}: EditRefundDialogProps) {
  const [refundAmount, setRefundAmount] = useState("");

  useEffect(() => {
    if (refund) {
      setRefundAmount(refund.calculatedRefund.toFixed(2));
    }
  }, [refund]);

  const handleSave = () => {
    const amount = parseFloat(refundAmount);
    if (isNaN(amount) || amount < 0) {
      return;
    }
    onSave({ calculatedRefund: amount });
  };

  if (!refund) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-mono">Edit Refund Amount</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Order ID
            </Label>
            <Input value={refund.orderId} disabled className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Original Amount
            </Label>
            <Input
              value={`€${refund.originalAmount.toFixed(2)}`}
              disabled
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider">
              Return Fee
            </Label>
            <Input value="–€3.00" disabled className="font-mono" />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="refund-amount"
              className="font-mono text-xs uppercase tracking-wider"
            >
              Refund Amount
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">€</span>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                min="0"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
