import { useState, useMemo, useCallback, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import type { Refund } from "@/types/refund";
import {
  fetchRefunds,
  insertRefunds,
  updateRefund,
} from "@/lib/refund-db";
import { fetchShopifyOrderDetails } from "@/utils/shopifyOrder";
import {
  type StatusFilter,
  type DateSort,
} from "@/components/RefundFilters";

const DEFAULT_STATUS_FILTER: StatusFilter = [
  "completed",
  "processing",
  "pending",
  "failed",
];

export function useRefundRecords(shopifyShop: string, shopifyToken: string) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(DEFAULT_STATUS_FILTER);
  const [dateSort, setDateSort] = useState<DateSort>("desc");
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
          description:
            "Open Shopify API settings and save your shop domain and token.",
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
    setStatusFilter(DEFAULT_STATUS_FILTER);
    setDateSort("desc");
  }, []);

  return {
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
  };
}
