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

/** Same copy as in enrich error path — used to detect rows that should retry once credentials exist. */
const SHOPIFY_NOT_CONFIGURED_MSG =
  "Configure Shopify shop and Admin API token.";

function needsShopifyEnrichment(r: Refund): boolean {
  if (!r.shopifyNumericOrderId) return false;
  if (r.shopifyFetchStatus === "loading") return true;
  return (
    r.shopifyFetchStatus === "error" &&
    r.shopifyFetchError === SHOPIFY_NOT_CONFIGURED_MSG
  );
}

export function useRefundRecords(
  shopifyShop: string,
  shopifyToken: string,
  shopifyCredentialId: string,
  brandId: string | null
) {
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
    const { data, error } = await fetchRefunds(
      shopifyCredentialId.trim() || null,
      brandId
    );
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
  }, [toast, shopifyCredentialId, brandId]);

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
      const targets = rows.filter(needsShopifyEnrichment);

      if (targets.length === 0) return;

      if (!shop || !token) {
        for (const t of targets) {
          applyRefundPatch(t.id, {
            shopifyFetchStatus: "error",
            shopifyFetchError: SHOPIFY_NOT_CONFIGURED_MSG,
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
            r.shopifyNumericOrderId!,
            r.sheetProductNames
          );
          const name = details.customerName?.trim();
          applyRefundPatch(r.id, {
            shopifyFetchStatus: "ok",
            shopifyProducts: details.products,
            originalAmount: details.originalAmount,
            calculatedRefund: details.calculatedRefund,
            shopifyFetchError: undefined,
            customer: name && name.length > 0 ? name : "N/A",
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

  /** Pick up rows that were imported or loaded before shop/token were ready (OAuth hydrate, etc.). */
  useEffect(() => {
    const shop = shopifyShop.trim();
    const token = shopifyToken.trim();
    if (!shop || !token) return;
    const pending = refunds.filter(needsShopifyEnrichment);
    if (pending.length === 0) return;
    void enrichImportedRefunds(pending);
  }, [shopifyShop, shopifyToken, refunds, enrichImportedRefunds]);

  const handleImported = useCallback(
    async (rows: Refund[]) => {
      const { error } = await insertRefunds(rows, {
        shopifyCredentialId: shopifyCredentialId.trim(),
        shopDomain: shopifyShop.trim(),
        brandId,
      });
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
    [enrichImportedRefunds, toast, shopifyCredentialId, shopifyShop, brandId]
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

  const softDeleteRefund = useCallback(
    (id: string) => {
      const at = new Date().toISOString();
      setRefunds((prev) => prev.filter((r) => r.id !== id));
      void updateRefund(id, { deletedAt: at }).then(({ error }) => {
        if (error) {
          toast({
            title: "Could not remove refund",
            description: error.message,
            variant: "destructive",
          });
          void loadRefunds();
        }
      });
    },
    [toast, loadRefunds]
  );

  return {
    loadError,
    isLoadingList,
    loadRefunds,
    applyRefundPatch,
    softDeleteRefund,
    handleImported,
    filteredAndSortedRefunds,
    statusFilter,
    setStatusFilter,
    dateSort,
    setDateSort,
    handleClearFilters,
  };
}
