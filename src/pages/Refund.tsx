import { useState } from "react";
import { DollarSign, Plus, Loader2 } from "lucide-react";
import { RefundTable } from "@/components/RefundTable";
import { ShopifySettings } from "@/components/ShopifySettings";
import { RefundImportDialog } from "@/components/RefundImportDialog";
import { RefundFilters } from "@/components/RefundFilters";
import { BulkRefundDialog } from "@/components/BulkRefundDialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRefundShopifySession } from "@/pages/refund/useRefundShopifySession";
import { useRefundRecords } from "@/pages/refund/useRefundRecords";
import { useRefundBulkSelection } from "@/pages/refund/useRefundBulkSelection";

export default function Refund() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    handleShopifyAfterSave,
  } = useRefundShopifySession();

  const {
    loadError,
    isLoadingList,
    loadRefunds,
    applyRefundPatch,
    handleImported,
    filteredAndSortedRefunds,
    statusFilter,
    setStatusFilter,
    dateSort,
    setDateSort,
    handleClearFilters,
  } = useRefundRecords(shopifyShop, shopifyToken);

  const {
    selectedRefundIds,
    setSelectedRefundIds,
    bulkRefundDialogOpen,
    setBulkRefundDialogOpen,
    isProcessingBulkRefund,
    selectedRefunds,
    handleBulkRefund,
    handleConfirmBulkRefund,
  } = useRefundBulkSelection(
    filteredAndSortedRefunds,
    shopifyShop,
    loadRefunds
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-mono font-semibold tracking-tight">Refund</h1>
              <p className="text-xs text-muted-foreground">
                Manage refund requests and approvals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedRefundIds.size > 0 && (
              <Button variant="default" size="sm" onClick={handleBulkRefund}>
                <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                Refund ({selectedRefundIds.size})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New import
            </Button>
            <RefundFilters
              statusFilter={statusFilter}
              dateSort={dateSort}
              onStatusChange={setStatusFilter}
              onDateSortChange={setDateSort}
              onClearFilters={handleClearFilters}
            />
            <ShopifySettings
              shop={shopifyShop}
              adminAccessToken={shopifyToken}
              onShopChange={setShopifyShop}
              onAdminTokenChange={setShopifyToken}
              onAfterSave={handleShopifyAfterSave}
            />
          </div>
        </div>

        {loadError && !isLoadingList && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="font-mono text-sm">Database error</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-sm">{loadError}</span>
              <Button size="sm" variant="outline" onClick={() => void loadRefunds()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {isLoadingList ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
            <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            <p className="font-mono text-sm">Loading refunds…</p>
          </div>
        ) : (
          <RefundTable
            refunds={filteredAndSortedRefunds}
            onRefundUpdate={applyRefundPatch}
            selectedRefundIds={selectedRefundIds}
            onSelectionChange={setSelectedRefundIds}
          />
        )}

        <RefundImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImported={handleImported}
        />

        <BulkRefundDialog
          open={bulkRefundDialogOpen}
          onOpenChange={setBulkRefundDialogOpen}
          selectedRefunds={selectedRefunds}
          onConfirm={handleConfirmBulkRefund}
          isProcessing={isProcessingBulkRefund}
        />
      </div>
    </div>
  );
}
