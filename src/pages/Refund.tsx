import { useState, useMemo, useCallback, useEffect } from "react";
import { DollarSign, Plus, Loader2 } from "lucide-react";
import { RefundTable } from "@/components/RefundTable";
import { ShopifySettings } from "@/components/ShopifySettings";
import { RefundImportDialog } from "@/components/RefundImportDialog";
import { RefundFilters, StatusFilter, DateSort } from "@/components/RefundFilters";
import { BulkRefundDialog } from "@/components/BulkRefundDialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import type { Refund } from "@/types/refund";
import {
  fetchRefunds,
  insertRefunds,
  updateRefund,
} from "@/lib/refund-db";
import { fetchShopifyOrderDetails } from "@/utils/shopifyOrder";

export default function Refund() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [shopifyShop, setShopifyShop] = useState(
    () => localStorage.getItem("shopify_shop") || ""
  );
  const [shopifyToken, setShopifyToken] = useState(
    () => localStorage.getItem("shopify_admin_token") || ""
  );
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>([
    "completed",
    "processing",
    "pending",
    "failed",
  ]);
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const [selectedRefundIds, setSelectedRefundIds] = useState<Set<string>>(new Set());
  const [bulkRefundDialogOpen, setBulkRefundDialogOpen] = useState(false);
  const [isProcessingBulkRefund, setIsProcessingBulkRefund] = useState(false);
  const { toast } = useToast();

  const loadRefunds = useCallback(async () => {
    setIsLoadingList(true);
    setLoadError(null);
    const { data, error } = await fetchRefunds();
    setIsLoadingList(false);
    if (error) {
      setLoadError(error.message);
      toast({
        title: "Could not load refunds",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRefunds(data);
  }, [toast]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  const applyRefundPatch = useCallback(
    (id: string, updates: Partial<Refund>) => {
      setRefunds((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      void updateRefund(id, updates).then(({ error }) => {
        if (error) {
          toast({
            title: "Could not save changes",
            description: error.message,
            variant: "destructive",
          });
          void loadRefunds();
        }
      });
    },
    [toast, loadRefunds]
  );

  const enrichImportedRefunds = useCallback(
    async (rows: Refund[]) => {
      const shop = shopifyShop.trim();
      const token = shopifyToken.trim();
      const targets = rows.filter(
        (r) => r.shopifyFetchStatus === "loading" && r.shopifyNumericOrderId
      );

      if (targets.length === 0) return;

      if (!shop || !token) {
        for (const t of targets) {
          applyRefundPatch(t.id, {
            shopifyFetchStatus: "error",
            shopifyFetchError: "Configure Shopify shop and Admin API token.",
          });
        }
        toast({
          title: "Shopify not configured",
          description: "Open Shopify API settings and save your shop domain and token.",
          variant: "destructive",
        });
        return;
      }

      for (const r of targets) {
        try {
          const details = await fetchShopifyOrderDetails(
            shop,
            token,
            r.shopifyNumericOrderId!
          );
          applyRefundPatch(r.id, {
            shopifyFetchStatus: "ok",
            shopifyProducts: details.products,
            originalAmount: details.originalAmount,
            calculatedRefund: details.calculatedRefund,
            shopifyFetchError: undefined,
          });
        } catch (e) {
          const message = e instanceof Error ? e.message : "Request failed";
          applyRefundPatch(r.id, {
            shopifyFetchStatus: "error",
            shopifyFetchError: message,
          });
        }
      }
    },
    [shopifyShop, shopifyToken, toast, applyRefundPatch]
  );

  const handleImported = useCallback(
    async (rows: Refund[]) => {
      const { error } = await insertRefunds(rows);
      if (error) {
        toast({
          title: "Could not save import",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
      setRefunds((prev) => [...rows, ...prev]);
      void enrichImportedRefunds(rows);
    },
    [enrichImportedRefunds, toast]
  );

  const filteredAndSortedRefunds = useMemo(() => {
    let filtered = [...refunds];

    if (statusFilter.length > 0) {
      filtered = filtered.filter((r) => statusFilter.includes(r.status));
    }

    if (dateSort !== "none") {
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateSort === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else {
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
    }

    return filtered;
  }, [refunds, statusFilter, dateSort]);

  const handleClearFilters = useCallback(() => {
    setStatusFilter(["completed", "processing", "pending", "failed"]);
    setDateSort("desc");
  }, []);

  const selectedRefunds = useMemo(() => {
    return filteredAndSortedRefunds.filter((r) => selectedRefundIds.has(r.id));
  }, [filteredAndSortedRefunds, selectedRefundIds]);

  const handleBulkRefund = useCallback(() => {
    if (selectedRefunds.length === 0) return;
    setBulkRefundDialogOpen(true);
  }, [selectedRefunds]);

  const handleConfirmBulkRefund = useCallback(async () => {
    setIsProcessingBulkRefund(true);

    const processableRefunds = selectedRefunds.filter((r) => r.status !== "failed");

    for (const refund of processableRefunds) {
      if (refund.status === "pending") {
        setRefunds((prev) =>
          prev.map((r) =>
            r.id === refund.id ? { ...r, status: "processing" as const } : r
          )
        );
        const { error: e1 } = await updateRefund(refund.id, { status: "processing" });
        if (e1) {
          toast({
            title: "Bulk refund failed",
            description: e1.message,
            variant: "destructive",
          });
          setIsProcessingBulkRefund(false);
          void loadRefunds();
          return;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      setRefunds((prev) =>
        prev.map((r) =>
          r.id === refund.id ? { ...r, status: "completed" as const } : r
        )
      );
      const { error: e2 } = await updateRefund(refund.id, { status: "completed" });
      if (e2) {
        toast({
          title: "Bulk refund failed",
          description: e2.message,
          variant: "destructive",
        });
        setIsProcessingBulkRefund(false);
        void loadRefunds();
        return;
      }
    }

    setIsProcessingBulkRefund(false);
    setBulkRefundDialogOpen(false);
    setSelectedRefundIds(new Set());

    toast({
      title: "Bulk refund processed",
      description: `Successfully processed ${processableRefunds.length} refund${processableRefunds.length === 1 ? "" : "s"}.`,
    });
  }, [selectedRefunds, toast, loadRefunds]);

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
