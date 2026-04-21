import { useState, useMemo, useEffect, type ReactNode } from "react";
import { format } from "date-fns";
import { X, DollarSign, Loader2, Trash2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Refund } from "@/types/refund";
import { EditRefundDialog } from "@/components/EditRefundDialog";
import { ViewPdfDialog } from "@/components/ViewPdfDialog";
import { RefundDetailsModal } from "@/components/RefundDetailsModal";
import { useToast } from "@/hooks/use-toast";
import {
  invokeProcessShopifyRefunds,
  resolveRefundAuthBearer,
} from "@/lib/processShopifyRefunds";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface RefundTableProps {
  refunds: Refund[];
  onRefundUpdate: (id: string, updates: Partial<Refund>) => void;
  onRefundSoftDelete: (id: string) => void;
  /** Used with the Shopify refund edge function (same shop as saved credentials). */
  shopDomain: string;
  embeddedHost: string | null;
  reloadRefunds: () => void;
  selectedRefundIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

/** Spreadsheet import uses this pattern for the customer column before Shopify enrichment. */
const SHEET_CUSTOMER_PRODUCT_PLACEHOLDER = /^\d+\s+product\(s\)$/i;

function customerDisplayForTable(refund: Refund): { value: string; muted: boolean } {
  const raw = refund.customer?.trim() ?? "";
  const isMissing =
    !raw ||
    raw === "—" ||
    raw === "N/A" ||
    SHEET_CUSTOMER_PRODUCT_PLACEHOLDER.test(raw);
  if (isMissing) return { value: "N/A", muted: true };
  return { value: raw, muted: false };
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

export function RefundTable({ 
  refunds, 
  onRefundUpdate,
  onRefundSoftDelete,
  shopDomain,
  embeddedHost,
  reloadRefunds,
  selectedRefundIds = new Set(),
  onSelectionChange,
}: RefundTableProps) {
  const [deleteConfirmRefund, setDeleteConfirmRefund] = useState<Refund | null>(null);
  const [editRefund, setEditRefund] = useState<Refund | null>(null);
  const [previewRefund, setPreviewRefund] = useState<Refund | null>(null);
  const [refundDetailsModalOpen, setRefundDetailsModalOpen] = useState(false);
  const [selectedRefundForDetails, setSelectedRefundForDetails] = useState<Refund | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Internal state if parent doesn't manage selection
  const [internalSelected, setInternalSelected] = useState<Set<string>>(new Set());
  const selectedIds = onSelectionChange ? selectedRefundIds : internalSelected;
  const setSelectedIds = onSelectionChange 
    ? onSelectionChange 
    : (ids: Set<string>) => setInternalSelected(ids);

  // Calculate selectable refunds (exclude failed status)
  const selectableRefunds = useMemo(() => {
    return refunds.filter(r => r.status !== "failed");
  }, [refunds]);
  
  const selectableRefundIds = useMemo(() => {
    return new Set(selectableRefunds.map(r => r.id));
  }, [selectableRefunds]);

  // Calculate select-all state (only for selectable refunds)
  const selectedCount = selectedIds.size;
  const allSelected = selectableRefunds.length > 0 && selectedCount === selectableRefunds.length;
  const someSelected = selectedCount > 0 && selectedCount < selectableRefunds.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(selectableRefundIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleRowSelect = (refundId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(refundId);
    } else {
      newSelected.delete(refundId);
    }
    setSelectedIds(newSelected);
  };

  // Removed manual ref for select-all Checkbox; Radix supports 'indeterminate' via the 'checked' prop.

  // Remove failed refunds from selection if they're selected
  useEffect(() => {
    const failedRefundIds = new Set(
      refunds.filter(r => r.status === "failed").map(r => r.id)
    );
    
    if (failedRefundIds.size > 0) {
      const hasFailedSelected = Array.from(selectedIds).some(id => failedRefundIds.has(id));
      if (hasFailedSelected) {
        const cleanedSelection = new Set(selectedIds);
        failedRefundIds.forEach(id => cleanedSelection.delete(id));
        if (cleanedSelection.size !== selectedIds.size) {
          setSelectedIds(cleanedSelection);
        }
      }
    }
  }, [refunds, selectedIds, setSelectedIds]);

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
    if (refund.shopifyRefundId) {
      toast({
        title: "Already refunded in Shopify",
        description: `Order ${refund.orderId} already has a Shopify refund id.`,
      });
      return;
    }
    if (refund.shopifyFetchStatus !== "ok") {
      toast({
        title: "Could not load Shopify order",
        description:
          refund.shopifyFetchError ||
          "Wait for order details to load, or check Shopify API settings.",
        variant: "destructive",
      });
      return;
    }

    const promotedToProcessing = refund.status === "pending";
    setProcessingId(refund.id);
    if (promotedToProcessing) {
      onRefundUpdate(refund.id, { status: "processing" });
    }

    const authBearer = await resolveRefundAuthBearer(embeddedHost);
    if (!authBearer) {
      if (promotedToProcessing) {
        onRefundUpdate(refund.id, { status: "pending" });
      }
      setProcessingId(null);
      toast({
        title: "Authentication required",
        description: embeddedHost?.trim()
          ? "Could not get a Shopify session token. Reload the app from Shopify Admin, or sign in with credentials saved for this shop."
          : "Sign in with credentials saved for this shop, or open the app embedded in Shopify Admin.",
        variant: "destructive",
      });
      return;
    }

    const shop = shopDomain.trim();
    if (!shop) {
      if (promotedToProcessing) {
        onRefundUpdate(refund.id, { status: "pending" });
      }
      setProcessingId(null);
      toast({
        title: "Shop domain missing",
        description: "Open Shopify API settings and save your shop domain.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await invokeProcessShopifyRefunds(shop, [refund.id], {
      authorizationBearer: authBearer,
    });

    if (error) {
      if (promotedToProcessing) {
        onRefundUpdate(refund.id, { status: "pending" });
      }
      setProcessingId(null);
      toast({
        title: "Refund request failed",
        description: error.message,
        variant: "destructive",
      });
      void reloadRefunds();
      return;
    }

    const row = data?.results?.[0];
    setProcessingId(null);
    void reloadRefunds();

    if (!row) {
      toast({
        title: "Refund request failed",
        description: "No result from server.",
        variant: "destructive",
      });
      return;
    }

    if (!row.ok && !row.skipped) {
      toast({
        title: "Refund failed",
        description: row.error ?? "Unknown error",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: row.skipped ? "Already processed" : "Refund processed",
      description: row.skipped
        ? `Order ${refund.orderId} already has a Shopify refund.`
        : `Refund ${refund.orderId} was sent to Shopify successfully.`,
    });
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
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => {
                    const isChecked = checked === true;
                    const newSelected = new Set<string>();
                    if (isChecked) {
                      // Use the provided refunds list for selecting all
                      refunds.forEach((r) => newSelected.add(r.id));
                    }
                    setSelectedIds(newSelected);
                  }}
                  aria-label="Select all"
                />
              </TableHead>
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
                Order Amount
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Refund Amount
              </TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider">
                Reason of Return
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
            {refunds.map((refund) => {
              const isFailed = refund.status === "failed";
              let customerCellContent: ReactNode;
              if (refund.shopifyFetchStatus === "loading") {
                customerCellContent = (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    …
                  </span>
                );
              } else if (refund.shopifyFetchStatus === "error") {
                customerCellContent = (
                  <span className="text-destructive text-[11px]">—</span>
                );
              } else {
                const { value, muted } = customerDisplayForTable(refund);
                customerCellContent = muted ? (
                  <span className="text-muted-foreground">{value}</span>
                ) : (
                  value
                );
              }
              return (
              <TableRow key={refund.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(refund.id)}
                    onCheckedChange={(checked) => handleRowSelect(refund.id, checked as boolean)}
                    disabled={isFailed}
                    aria-label={`Select refund ${refund.orderId}`}
                  />
                </TableCell>
                <TableCell 
                  className="font-mono text-xs cursor-pointer hover:text-primary transition-colors"
                  onClick={() => setPreviewRefund(refund)}
                >
                  {refund.orderId}
                </TableCell>
                <TableCell className="text-sm font-mono text-xs">
                  {refund.source}
                </TableCell>
                <TableCell className="text-sm">{customerCellContent}</TableCell>
                <TableCell className="font-mono text-xs">
                  {format(new Date(refund.orderDate), "MMM dd, yyyy")}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {refund.shopifyFetchStatus === "loading" ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      …
                    </span>
                  ) : refund.shopifyFetchStatus === "error" ? (
                    <span className="text-destructive text-[11px]">—</span>
                  ) : (
                    `€${refund.originalAmount.toFixed(2)}`
                  )}
                </TableCell>
                <TableCell
                  className="font-mono text-xs tabular-nums cursor-pointer hover:text-primary transition-colors"
                  onClick={() => {
                    if (refund.shopifyFetchStatus === "loading") return;
                    if (refund.shopifyFetchStatus === "error") {
                      toast({
                        title: "Could not load Shopify order",
                        description:
                          refund.shopifyFetchError ||
                          "Check Shopify API settings and the order id in your file.",
                        variant: "destructive",
                      });
                      return;
                    }
                    setSelectedRefundForDetails(refund);
                    setRefundDetailsModalOpen(true);
                  }}
                >
                  {refund.shopifyFetchStatus === "loading" ? (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      …
                    </span>
                  ) : refund.shopifyFetchStatus === "error" ? (
                    <span className="text-destructive text-[11px]">—</span>
                  ) : (
                    `€${refund.calculatedRefund.toFixed(2)}`
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {refund.reasonOfReturn}
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
                          onClick={() => void handleRefund(refund)}
                          disabled={
                            refund.status === "failed" ||
                            processingId === refund.id ||
                            !!refund.shopifyRefundId
                          }
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Refund</TooltipContent>
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
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteConfirmRefund(refund)}
                          aria-label={`Remove refund ${refund.orderId} from list`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove from list</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
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

      <ViewPdfDialog
        open={!!previewRefund}
        onOpenChange={() => setPreviewRefund(null)}
        pdfUrl={previewRefund?.pdfUrl || ""}
      />

      <RefundDetailsModal
        open={refundDetailsModalOpen}
        onOpenChange={setRefundDetailsModalOpen}
        refund={selectedRefundForDetails}
        onSave={(data) => {
          if (selectedRefundForDetails) {
            // Update refund with new calculated refund amount
            onRefundUpdate(selectedRefundForDetails.id, {
              calculatedRefund: data.refundAmount,
              returnFee: -data.returnFees,
              shopifyProducts: data.products,
            });
            toast({
              title: "Refund details updated",
              description: `Refund ${selectedRefundForDetails.orderId} has been updated.`,
            });
          }
        }}
      />

      <AlertDialog
        open={!!deleteConfirmRefund}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmRefund(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-base">
              Remove this refund from the list?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmRefund ? (
                <>
                  Order{" "}
                  <span className="font-mono text-foreground">
                    {deleteConfirmRefund.orderId}
                  </span>{" "}
                  will be hidden from this list. The record is kept in the database (soft delete).
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirmRefund) {
                  onRefundSoftDelete(deleteConfirmRefund.id);
                  toast({
                    title: "Refund removed",
                    description: `Order ${deleteConfirmRefund.orderId} is no longer shown in your list.`,
                  });
                }
                setDeleteConfirmRefund(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}