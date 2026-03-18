import { useState, useMemo, useCallback, useEffect } from "react";
import { DollarSign } from "lucide-react";
import { RefundTable } from "@/components/RefundTable";
import { WebhookSettings } from "@/components/WebhookSettings";
import { RefundFilters, StatusFilter, DateSort } from "@/components/RefundFilters";
import { BulkRefundDialog } from "@/components/BulkRefundDialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { mockRefunds } from "@/refund.mock";
import type { Refund } from "@/refund.mock";
import { calculateRefundAmount } from "@/utils/refundCalculation";

export default function Refund() {
  // Initialize refunds with calculated refund amounts
  const [refunds, setRefunds] = useState<Refund[]>(() => {
    // Calculate refund amounts for all refunds on initialization
    return mockRefunds.map(refund => ({
      ...refund,
      calculatedRefund: calculateRefundAmount(refund.id, refund.returnFee),
    }));
  });
  const [webhookUrl, setWebhookUrl] = useState(
    () => localStorage.getItem("webhook_url") || ""
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(["completed", "processing", "pending", "failed"]);
  const [dateSort, setDateSort] = useState<DateSort>("desc");
  const [selectedRefundIds, setSelectedRefundIds] = useState<Set<string>>(new Set());
  const [bulkRefundDialogOpen, setBulkRefundDialogOpen] = useState(false);
  const [isProcessingBulkRefund, setIsProcessingBulkRefund] = useState(false);
  const { toast } = useToast();

  const handleRefundUpdate = useCallback((id: string, updates: Partial<Refund>) => {
    setRefunds((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const filteredAndSortedRefunds = useMemo(() => {
    let filtered = [...refunds];

    // Apply status filter (always at least one status is selected)
    if (statusFilter.length > 0) {
      filtered = filtered.filter((r) => statusFilter.includes(r.status));
    } else {
      // Fallback: if somehow empty, show all (shouldn't happen due to validation)
      // This ensures we always show something
    }

    // Apply date sort
    if (dateSort !== "none") {
      filtered.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateSort === "desc" ? dateB - dateA : dateA - dateB;
      });
    } else {
      // Default: most recent first
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
    return filteredAndSortedRefunds.filter(r => selectedRefundIds.has(r.id));
  }, [filteredAndSortedRefunds, selectedRefundIds]);

  const handleBulkRefund = useCallback(() => {
    if (selectedRefunds.length === 0) return;
    setBulkRefundDialogOpen(true);
  }, [selectedRefunds]);

  const handleConfirmBulkRefund = useCallback(async () => {
    setIsProcessingBulkRefund(true);
    
    // Process each selected refund
    const processableRefunds = selectedRefunds.filter(r => r.status !== "failed");
    
    for (const refund of processableRefunds) {
      if (refund.status === "pending") {
        handleRefundUpdate(refund.id, { status: "processing" });
      }
      
      // Simulate async processing for each refund
      await new Promise(resolve => setTimeout(resolve, 500));
      handleRefundUpdate(refund.id, { status: "completed" });
    }

    setIsProcessingBulkRefund(false);
    setBulkRefundDialogOpen(false);
    setSelectedRefundIds(new Set());
    
    toast({
      title: "Bulk refund processed",
      description: `Successfully processed ${processableRefunds.length} refund${processableRefunds.length === 1 ? "" : "s"}.`,
    });
  }, [selectedRefunds, handleRefundUpdate, toast]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
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
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkRefund}
              >
                <DollarSign className="h-3.5 w-3.5 mr-1.5" />
                Refund ({selectedRefundIds.size})
              </Button>
            )}
            <RefundFilters
              statusFilter={statusFilter}
              dateSort={dateSort}
              onStatusChange={setStatusFilter}
              onDateSortChange={setDateSort}
              onClearFilters={handleClearFilters}
            />
            <WebhookSettings
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
            />
          </div>
        </div>

        {/* Table */}
        <RefundTable
          refunds={filteredAndSortedRefunds}
          onRefundUpdate={handleRefundUpdate}
          selectedRefundIds={selectedRefundIds}
          onSelectionChange={setSelectedRefundIds}
        />

        {/* Bulk Refund Dialog */}
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