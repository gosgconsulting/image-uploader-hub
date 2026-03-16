import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Refund } from "@/refund.mock";
import { getRefundCalculationData, Product } from "@/utils/refundCalculation";

interface RefundDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refund: Refund | null;
  onSave?: (data: {
    products: Product[];
    returnFees: number;
    refundAmount: number;
  }) => void;
}


export function RefundDetailsModal({
  open,
  onOpenChange,
  refund,
  onSave,
}: RefundDetailsModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [returnFees, setReturnFees] = useState<number>(3);
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [isManualRefundAmount, setIsManualRefundAmount] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [pdfPage, setPdfPage] = useState<number>(2);
  const [pdfTotalPages, setPdfTotalPages] = useState<number>(47);
  const [pdfName, setPdfName] = useState<string>("20260203145934236.pdf");

  // Initialize products when modal opens
  useEffect(() => {
    if (open && refund) {
      // Use shared calculation logic to get products and ensure consistency
      const { products: generatedProducts } = getRefundCalculationData(refund.id, refund.returnFee);
      setProducts(generatedProducts);
      setReturnFees(Math.abs(refund.returnFee));
      
      // Use the refund amount from the parent (pre-calculated, source of truth)
      // This value is already correct and calculated using the same logic
      setRefundAmount(refund.calculatedRefund);
      // Start with auto-calculation disabled since we're using the pre-calculated value
      setIsManualRefundAmount(false);
      setIsInitialized(true);
      setPdfPage(2);
      setPdfTotalPages(47);
      setPdfName("20260203145934236.pdf");
    } else if (!open) {
      setIsInitialized(false);
      setIsManualRefundAmount(false);
    }
  }, [open, refund?.id, refund?.calculatedRefund, refund?.returnFee]);

  // Calculate total from products
  const total = useMemo(() => {
    return products.reduce((sum, product) => sum + product.amount, 0);
  }, [products]);

  // Note: We no longer auto-calculate refund amount from products
  // The refund amount comes from the parent (pre-calculated) and can be manually edited
  // Products are static/read-only, so we don't need to recalculate

  // Product amounts and return fees are now read-only (static)
  // Only refund amount can be edited

  const handleRefundAmountChange = (value: string) => {
    // Remove leading zeros
    let cleanedValue = value.replace(/^0+(?=\d)/, '');
    
    if (cleanedValue === "" || cleanedValue === "." || cleanedValue === "-") {
      setRefundAmount(0);
      setIsManualRefundAmount(true);
      return;
    }
    const numValue = parseFloat(cleanedValue) || 0;
    setRefundAmount(numValue);
    setIsManualRefundAmount(true);
  };

  const handleSave = () => {
    if (onSave) {
      onSave({
        products,
        returnFees,
        refundAmount,
      });
    }
    console.log("Refund details saved:", {
      refundId: refund?.id,
      products,
      returnFees,
      refundAmount,
      total,
    });
    onOpenChange(false);
  };

  if (!refund) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] w-full p-0 gap-0 overflow-hidden">
        <div className="flex h-[85vh]">
          {/* Left Panel - PDF Preview (45%) */}
          <div className="w-[45%] border-r flex flex-col bg-muted/20">
            <div className="flex-1 p-6 min-h-0">
              <div className="h-full border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center bg-background shadow-sm">
                <div className="text-center text-muted-foreground">
                  <p className="font-mono text-sm mb-2 font-medium">PDF Preview</p>
                  <p className="font-mono text-xs">Placeholder for PDF viewer</p>
                </div>
              </div>
            </div>
            <div className="p-6 border-t bg-background flex-shrink-0">
              <div className="space-y-1.5">
                <p className="font-mono text-xs text-muted-foreground">
                  Page {pdfPage} of {pdfTotalPages} pages
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  Pdf name: {pdfName}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Refund Details (55%) */}
          <div className="w-[55%] flex flex-col bg-muted/20">
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              <div className="space-y-8">
                {/* Product Table */}
                <div>
                  <h3 className="font-mono text-xs uppercase tracking-wider mb-4 font-semibold">
                    Products
                  </h3>
                  <div className="rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-mono text-xs uppercase tracking-wider font-semibold">
                            Product name
                          </TableHead>
                          <TableHead className="font-mono text-xs uppercase tracking-wider text-right font-semibold">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="text-sm py-3">
                              {product.name}
                            </TableCell>
                            <TableCell className="text-right py-3">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-medium">€</span>
                                <div className="w-28 h-9 flex items-center justify-end font-mono text-sm text-right border bg-background rounded-md px-3">
                                  <span className="tabular-nums font-medium">
                                    {product.amount.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals Section */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-end items-center gap-6">
                    <Label className="font-mono text-xs uppercase tracking-wider w-36 text-right font-semibold">
                      Total
                    </Label>
                    <div className="flex items-center gap-2 w-36">
                      <span className="text-sm font-medium">€</span>
                      <div className="w-28 h-9 flex items-center justify-end font-mono text-sm text-right border bg-background rounded-md px-3">
                        <span className="tabular-nums font-medium">
                          {total.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-6">
                    <Label className="font-mono text-xs uppercase tracking-wider w-36 text-right font-semibold">
                      Return Fees
                    </Label>
                    <div className="flex items-center gap-2 w-36">
                      <span className="text-sm font-medium">€</span>
                      <div className="w-28 h-9 flex items-center justify-end font-mono text-sm text-right border bg-background rounded-md px-3">
                        <span className="tabular-nums font-medium">
                          {returnFees.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end items-center gap-6 pt-3 border-t">
                    <Label className="font-mono text-xs uppercase tracking-wider w-36 text-right font-semibold">
                      Refund amount
                    </Label>
                    <div className="flex items-center gap-2 w-36">
                      <span className="text-sm font-medium">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={refundAmount.toFixed(2)}
                        onChange={(e) => handleRefundAmountChange(e.target.value)}
                        className="w-28 h-9 font-mono text-sm text-right font-semibold border bg-background focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Buttons */}
            <DialogFooter className="p-6 border-t bg-background">
              <div className="flex items-center gap-3 w-full justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="min-w-[100px]"
                >
                  Close
                </Button>
                <Button 
                  onClick={handleSave}
                  className="min-w-[100px]"
                >
                  Save
                </Button>
              </div>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
