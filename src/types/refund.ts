import type { Product } from "@/utils/refundCalculation";

export type ShopifyFetchStatus = "idle" | "loading" | "ok" | "error";

export type RefundStatus = "completed" | "processing" | "pending" | "failed";

export interface Refund {
  id: string;
  date: string;
  source: string;
  orderId: string;
  customer: string;
  skus: string[];
  qty: number;
  orderDate: string;
  originalAmount: number;
  returnFee: number;
  calculatedRefund: number;
  reasonOfReturn: string;
  aiConfidence: number;
  status: RefundStatus;
  pdfUrl?: string;
  shopifyNumericOrderId?: string;
  sheetPageKey?: string;
  sheetProductNames?: string[];
  shopifyFetchStatus?: ShopifyFetchStatus;
  shopifyProducts?: Product[];
  shopifyFetchError?: string;
  shopifyRefundId?: string;
  shopifyRefundError?: string;
  shopifyRefundAttemptedAt?: string;
}
