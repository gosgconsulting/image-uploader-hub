import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Refund } from "@/types/refund";
import { invokeProcessShopifyRefunds } from "@/lib/processShopifyRefunds";
import { supabase } from "@/integrations/supabase/client";

export function useRefundBulkSelection(
  filteredAndSortedRefunds: Refund[],
  shopifyShop: string,
  loadRefunds: () => Promise<void>
) {
  const [selectedRefundIds, setSelectedRefundIds] = useState<Set<string>>(
    new Set()
  );
  const [bulkRefundDialogOpen, setBulkRefundDialogOpen] = useState(false);
  const [isProcessingBulkRefund, setIsProcessingBulkRefund] = useState(false);
  const { toast } = useToast();

  const selectedRefunds = useMemo(() => {
    return filteredAndSortedRefunds.filter((r) =>
      selectedRefundIds.has(r.id)
    );
  }, [filteredAndSortedRefunds, selectedRefundIds]);

  const handleBulkRefund = useCallback(() => {
    if (selectedRefunds.length === 0) return;
    setBulkRefundDialogOpen(true);
  }, [selectedRefunds]);

  const handleConfirmBulkRefund = useCallback(async () => {
    setIsProcessingBulkRefund(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      toast({
        title: "Sign in required",
        description:
          "Bulk Shopify refunds need a signed-in user with credentials saved for this shop.",
        variant: "destructive",
      });
      setIsProcessingBulkRefund(false);
      return;
    }

    const shop = shopifyShop.trim();
    if (!shop) {
      toast({
        title: "Shop domain missing",
        description: "Open Shopify API settings and save your shop domain.",
        variant: "destructive",
      });
      setIsProcessingBulkRefund(false);
      return;
    }

    const toProcess = selectedRefunds.filter((r) => !r.shopifyRefundId);
    if (toProcess.length === 0) {
      toast({
        title: "Nothing to process",
        description: "Selected rows already have a Shopify refund id.",
      });
      setIsProcessingBulkRefund(false);
      setBulkRefundDialogOpen(false);
      return;
    }

    const { data, error } = await invokeProcessShopifyRefunds(
      shop,
      toProcess.map((r) => r.id)
    );

    if (error) {
      toast({
        title: "Refund request failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessingBulkRefund(false);
      void loadRefunds();
      return;
    }

    const results = data?.results ?? [];
    const failed = results.filter((r) => !r.ok && !r.skipped);
    const okCount = results.filter((r) => r.ok).length;

    setIsProcessingBulkRefund(false);
    setBulkRefundDialogOpen(false);
    setSelectedRefundIds(new Set());
    void loadRefunds();

    if (failed.length > 0) {
      toast({
        title: "Some refunds failed",
        description: failed
          .map((f) => `${f.id}: ${f.error ?? "error"}`)
          .join(" · "),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Shopify refunds processed",
      description: `Completed or skipped ${okCount} of ${results.length} request(s). Refresh the list if needed.`,
    });
  }, [selectedRefunds, shopifyShop, toast, loadRefunds]);

  return {
    selectedRefundIds,
    setSelectedRefundIds,
    bulkRefundDialogOpen,
    setBulkRefundDialogOpen,
    isProcessingBulkRefund,
    selectedRefunds,
    handleBulkRefund,
    handleConfirmBulkRefund,
  };
}
