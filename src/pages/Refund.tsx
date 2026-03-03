import { useState, useMemo, useCallback } from "react";
import { DollarSign } from "lucide-react";
import { RefundTable } from "@/components/RefundTable";
import { WebhookSettings } from "@/components/WebhookSettings";
import { RefundFilters, StatusFilter, DateSort } from "@/components/RefundFilters";
import { mockRefunds, Refund } from "@/refund.mock";

export default function Refund() {
  const [refunds, setRefunds] = useState<Refund[]>(mockRefunds);
  const [webhookUrl, setWebhookUrl] = useState(
    () => localStorage.getItem("webhook_url") || ""
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(["completed", "processing", "pending", "failed"]);
  const [dateSort, setDateSort] = useState<DateSort>("desc");

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
        />
      </div>
    </div>
  );
}
