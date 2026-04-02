import { useState, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Refund } from "@/types/refund";
import { invokeProcessShopifyRefunds } from "@/lib/processShopifyRefunds";
import { supabase } from "@/integrations/supabase/client";
import { fetchEmbeddedShopifySessionToken } from "@/lib/shopifyEmbeddedSessionToken";

export function useRefundBulkSelection(
  filteredAndSortedRefunds: Refund[],
  shopifyShop: string,
  loadRefunds: () => Promise<void>,
  options?: { embeddedHost: string | null }
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

    const host = options?.embeddedHost?.trim() ?? "";
    let authBearer: string | undefined;
    if (host) {
      const shopifySession = await fetchEmbeddedShopifySessionToken(host);
      if (shopifySession) authBearer = shopifySession;
    }
    if (!authBearer && session?.access_token) {
      authBearer = session.access_token;
    }

    if (!authBearer) {
      toast({
        title: "Authentication required",
        description: host
          ? "Could not get a Shopify session token. Reload the app from Shopify Admin, or sign in here with credentials saved for this shop."
          : "Bulk Shopify refunds need a signed-in user with credentials saved for this shop, or open the app embedded in Shopify Admin.",
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
      toProcess.map((r) => r.id),
      { authorizationBearer: authBearer }
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
  }, [selectedRefunds, shopifyShop, toast, loadRefunds, options?.embeddedHost]);

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
