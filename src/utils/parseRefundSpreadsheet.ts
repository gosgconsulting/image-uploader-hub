import type { Refund } from "@/types/refund";
import type {
  ParsedRefundGroup,
  ParseRefundSpreadsheetOptions,
} from "@/types/refundSpreadsheet";
import {
  parseRefundSpreadsheetBuffer as parseWorkbookBuffer,
  extractShopifyNumericOrderId as extractNumericOrderId,
  getWorkbookSheetMeta,
} from "@/utils/refundSpreadsheetWorkbook";

export type {
  ParsedRefundGroup,
  RefundWorkbookSheetMeta,
  ParseRefundSpreadsheetOptions,
} from "@/types/refundSpreadsheet";
export { getWorkbookSheetMeta };

export const extractShopifyNumericOrderId = extractNumericOrderId;

export function parseRefundSpreadsheetBuffer(
  buffer: ArrayBuffer,
  options?: ParseRefundSpreadsheetOptions
): ParsedRefundGroup[] {
  return parseWorkbookBuffer(buffer, options);
}

export function groupsToRefundRows(
  groups: ParsedRefundGroup[],
  pdfObjectUrl?: string | null
): Refund[] {
  const now = new Date().toISOString();
  return groups.map((g) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `imp-${g.pageKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const qty = Math.max(1, g.productNames.length);
    const base: Refund = {
      id,
      date: now,
      source: g.provenance,
      orderId: g.orderIdDisplay,
      customer: g.productNames.length ? `${g.productNames.length} product(s)` : "—",
      skus: [],
      qty,
      orderDate: g.orderDateIso,
      originalAmount: 0,
      returnFee: -3,
      calculatedRefund: 0,
      reasonOfReturn: g.reason,
      aiConfidence: 1,
      status: "pending",
      pdfUrl: pdfObjectUrl || undefined,
      shopifyNumericOrderId: g.numericOrderId || undefined,
      sheetPageKey: g.pageKey,
      sheetProductNames: g.productNames,
      shopifyFetchStatus: g.numericOrderId ? "loading" : "error",
      shopifyFetchError: g.numericOrderId ? undefined : "No Shopify order id in sheet",
    };
    return base;
  });
}
