import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { DollarSign, Plus, Loader2 } from "lucide-react";
import { RefundTable } from "@/components/RefundTable";
import { ShopifySettings } from "@/components/ShopifySettings";
import { RefundImportDialog } from "@/components/RefundImportDialog";
import { RefundFilters } from "@/components/RefundFilters";
import { BulkRefundDialog } from "@/components/BulkRefundDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRefundShopifySession } from "@/pages/refund/useRefundShopifySession";
import { useRefundRecords } from "@/pages/refund/useRefundRecords";
import { useRefundBulkSelection } from "@/pages/refund/useRefundBulkSelection";

export default function Refund() {
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log(
      JSON.stringify({
        source: "[refund-page]",
        event: "refund_mount",
        current_url: typeof window !== "undefined" ? window.location.href : null,
        search_from_router: searchParams.toString(),
      })
    );
  }, [searchParams]);
  const {
    shopifyShop,
    setShopifyShop,
    shopifyToken,
    setShopifyToken,
    shopifyConnectionId,
    handleShopifyAfterSave,
    shopifyEmbeddedContextActive,
    shopifyLiveConnectionStatus,
    shopifyLiveConnectionError,
    shopifyClaimBusy,
    shopifyLinkSignInHintShop,
  } = useRefundShopifySession();

  const embeddedHost = shopifyEmbeddedContextActive
    ? searchParams.get("host")
    : null;

  const needsManualShopifySettings =
    !shopifyEmbeddedContextActive || !shopifyToken.trim();

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
  } = useRefundBulkSelection(filteredAndSortedRefunds, shopifyShop, loadRefunds, {
    embeddedHost,
  });

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
            {needsManualShopifySettings ? (
              <ShopifySettings
                shop={shopifyShop}
                adminAccessToken={shopifyToken}
                onShopChange={setShopifyShop}
                onAdminTokenChange={setShopifyToken}
                onAfterSave={handleShopifyAfterSave}
                liveConnectionStatus={shopifyLiveConnectionStatus}
                liveConnectionError={shopifyLiveConnectionError}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-xs max-w-[min(280px,40vw)] truncate"
                  title={
                    shopifyConnectionId
                      ? `${shopifyShop} · connection ${shopifyConnectionId}`
                      : shopifyShop || undefined
                  }
                >
                  {shopifyShop || "Store"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {shopifyClaimBusy ? (
          <Alert className="mb-6 border-primary/40 bg-primary/5">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <AlertTitle className="font-mono text-sm">Linking Shopify</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              Verifying your account and saving this store&apos;s connection for server-side refunds.
            </AlertDescription>
          </Alert>
        ) : null}

        {!shopifyClaimBusy && shopifyLinkSignInHintShop ? (
          <Alert className="mb-6">
            <AlertTitle className="font-mono text-sm">Shopify install not saved to the server yet</AlertTitle>
            <AlertDescription className="text-sm text-muted-foreground">
              OAuth data for{" "}
              <span className="font-mono text-foreground">{shopifyLinkSignInHintShop}</span> is only
              stored in this browser. Saving it for server-side refunds needs an authenticated session
              in this browser—if this deployment does not use app login, use{" "}
              <span className="text-foreground">Shopify settings</span> and paste your Admin API token
              instead (local only without a session). When a session is available, reload this page
              and linking will complete automatically.
            </AlertDescription>
          </Alert>
        ) : null}

        {shopifyLiveConnectionStatus === "failed" && shopifyLiveConnectionError ? (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle className="font-mono text-sm">Shopify Admin API check failed</AlertTitle>
            <AlertDescription className="text-sm">{shopifyLiveConnectionError}</AlertDescription>
          </Alert>
        ) : null}

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
