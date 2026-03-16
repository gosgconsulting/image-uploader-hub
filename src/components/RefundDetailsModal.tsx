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

interface Product {
  id: string;
  name: string;
  amount: number;
}

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

// Sample product pool
const PRODUCT_POOL = [
  "Manteau DELPHINA Bleu electrique - XS / BLEU ELECTRIQUE",
  "Gilet MANILA Rose pale - S / ROSE PALE",
  "Manteau DELPHINA Bleu electrique - S / BLEU ELECTRIQUE",
  "Pull CAMELIA Gris - S / GRIS",
  "Robe OEILLET Noir - XS / NOIR",
  "Veste PREVERT Noir - S / NOIR",
  "Veste PREVERT Kaki - XS / KAKI",
  "Veste PREVERT Kaki - S / KAKI",
  "Manteau MATHELINE Vert foret",
  "Jupe NASSIA Chocolat - L / CHOCOLAT",
  "Pull DIAMOND Rouge - S / ROUGE",
  "Pull DIAMOND Gris - S / GRIS",
  "Robe DIANELLA Fuchsia - M / FUCHSIA",
  "Top DONNA Noir - M / NOIR",
  "Blouse MISTIGRI Geo flowers - XS / GEO FLOWERS",
  "Jean GAYNOR Bleu jean - 25 / BLEU-JEAN",
  "Cardigan MORAND Rouge - S / ROUGE",
  "Chemise RAVEN Noir - M / NOIR",
  "Pull MYOSOTIS Bleu jean - M / BLEU JEAN",
  "Blouse BOLDO Marron glace - S / MARRON GLACE",
  "Jean SUKI Bleu nuit - 26 / BLEU NUIT",
  "Robe SIL Rouge - XS / ROUGE",
  "Veste PREVERT Noir - XL / NOIR",
  "Combi-pantalon ALYA Lilas - S / LILAS",
  "Veste PREVERT Marron glace - M / MARRON GLACE",
  "Jean PRUNELLA Bleu marine - 27 / BLEU MARINE",
  "Pantalon AUSTEN Lilas - S / LILAS",
  "Blouse CHOUPETTE Rouge - M / ROUGE",
  "Trench HALIMI Bordeaux - XS / BORDEAUX",
  "Manteau NEMORALIS Beige",
  "Veste PREVEST Marron glace",
  "Pantalon HORTENSIS Beige",
  "Pull TRIOLET Marron glace",
];

// Seeded random number generator for consistent products
function seededRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Generate consistent products based on refund ID (so same refund always gets same products)
function generateRandomProducts(count: number = 5, refundId: string): Product[] {
  // Use refund ID as seed for consistent generation
  const seed = refundId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = seededRandom(seed);
  
  // Shuffle products consistently based on seed
  const shuffled = [...PRODUCT_POOL].sort((a, b) => {
    const hashA = a.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hashB = b.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hashA + seed) % 1000 - (hashB + seed) % 1000;
  });
  
  return shuffled.slice(0, count).map((name, index) => {
    // Generate consistent amount based on seed and index
    const amountSeed = seed + index * 1000;
    const amountRandom = seededRandom(amountSeed);
    const amount = Math.round((amountRandom() * 150 + 50) * 100) / 100; // Random between 50-200
    return {
      id: `product-${index + 1}`,
      name,
      amount,
    };
  });
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
      // Generate consistent products based on refund ID
      const generatedProducts = generateRandomProducts(5, refund.id);
      setProducts(generatedProducts);
      setReturnFees(Math.abs(refund.returnFee));
      
      // Use the refund amount from the table as the source of truth
      const targetRefundAmount = refund.calculatedRefund;
      
      // Calculate what the total should be: refundAmount - returnFees
      const targetTotal = targetRefundAmount - Math.abs(refund.returnFee);
      
      // Calculate current total from generated products
      const currentTotal = generatedProducts.reduce((sum, p) => sum + p.amount, 0);
      
      // Adjust the last product to make the total match the target
      // This ensures the refund amount matches what's in the table
      if (generatedProducts.length > 0 && Math.abs(currentTotal - targetTotal) > 0.01) {
        const adjustment = targetTotal - currentTotal;
        const adjustedProducts = [...generatedProducts];
        const lastProduct = adjustedProducts[adjustedProducts.length - 1];
        adjustedProducts[adjustedProducts.length - 1] = {
          ...lastProduct,
          amount: Math.max(0.01, lastProduct.amount + adjustment), // Ensure at least 0.01
        };
        setProducts(adjustedProducts);
      } else {
        setProducts(generatedProducts);
      }
      
      // Use the refund amount from the table (this is the source of truth)
      setRefundAmount(targetRefundAmount);
      // Start with auto-calculation enabled
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

  // Auto-calculate refund amount if not manually edited (only after initialization)
  useEffect(() => {
    if (!isManualRefundAmount && products.length > 0 && isInitialized) {
      const calculated = total + returnFees;
      setRefundAmount(calculated);
    }
  }, [total, returnFees, isManualRefundAmount, products.length, isInitialized]);

  const handleProductAmountChange = (productId: string, value: string) => {
    // Remove leading zeros
    let cleanedValue = value.replace(/^0+(?=\d)/, '');
    
    if (cleanedValue === "" || cleanedValue === "." || cleanedValue === "-") {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, amount: 0 } : p))
      );
      return;
    }
    const numValue = parseFloat(cleanedValue) || 0;
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, amount: numValue } : p))
    );
  };

  const handleReturnFeesChange = (value: string) => {
    // Remove all leading zeros except for "0" or "0."
    let cleanedValue = value;
    if (cleanedValue.length > 1) {
      // Remove leading zeros but keep single "0" or "0."
      cleanedValue = cleanedValue.replace(/^0+(?=\d)/, '');
    }
    
    // Allow typing - accept any valid number input
    if (cleanedValue === "" || cleanedValue === "." || cleanedValue === "-") {
      setReturnFees(0);
      return;
    }
    const numValue = parseFloat(cleanedValue);
    if (!isNaN(numValue) && numValue >= 0) {
      setReturnFees(numValue);
    } else if (cleanedValue === "") {
      setReturnFees(0);
    }
  };

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
