import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Refund } from "@/types/refund";
import { normalizeShopDomain } from "@/lib/shopifyAdminApi";
import type { Product } from "@/utils/refundCalculation";

type RefundRow = TablesInsert<"refunds">;

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  return [];
}

function asProducts(v: unknown): Product[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: Product[] = [];
  for (const item of v) {
    if (
      item &&
      typeof item === "object" &&
      "id" in item &&
      "name" in item &&
      "amount" in item
    ) {
      const o = item as Record<string, unknown>;
      out.push({
        id: String(o.id),
        name: String(o.name),
        amount: Number(o.amount),
      });
    }
  }
  return out.length ? out : undefined;
}

export function rowToRefund(row: Tables<"refunds">): Refund {
  const status = row.status as Refund["status"];
  const fetchStatus = row.shopify_fetch_status as Refund["shopifyFetchStatus"] | undefined;
  return {
    id: row.id,
    date: row.date,
    source: row.source,
    orderId: row.order_id,
    customer: row.customer,
    skus: asStringArray(row.skus),
    qty: row.qty,
    orderDate: row.order_date,
    originalAmount: Number(row.original_amount),
    returnFee: Number(row.return_fee),
    calculatedRefund: Number(row.calculated_refund),
    reasonOfReturn: row.reason_of_return,
    aiConfidence: Number(row.ai_confidence),
    status: ["completed", "processing", "pending", "failed"].includes(status)
      ? status
      : "pending",
    pdfUrl: row.pdf_url ?? undefined,
    shopifyNumericOrderId: row.shopify_numeric_order_id ?? undefined,
    sheetPageKey: row.sheet_page_key ?? undefined,
    sheetProductNames: asStringArray(row.sheet_product_names),
    shopifyFetchStatus: fetchStatus,
    shopifyProducts: asProducts(row.shopify_products),
    shopifyFetchError: row.shopify_fetch_error ?? undefined,
    shopifyRefundId: row.shopify_refund_id ?? undefined,
    shopifyRefundError: row.shopify_refund_error ?? undefined,
    shopifyRefundAttemptedAt: row.shopify_refund_attempted_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

export function refundToInsert(
  r: Refund,
  scope: { shopifyCredentialId: string; shopDomain: string }
): RefundRow {
  return {
    id: r.id,
    date: r.date,
    source: r.source,
    order_id: r.orderId,
    customer: r.customer,
    skus: r.skus,
    qty: r.qty,
    order_date: r.orderDate,
    original_amount: r.originalAmount,
    return_fee: r.returnFee,
    calculated_refund: r.calculatedRefund,
    reason_of_return: r.reasonOfReturn,
    ai_confidence: r.aiConfidence,
    status: r.status,
    pdf_url: r.pdfUrl ?? null,
    shopify_numeric_order_id: r.shopifyNumericOrderId ?? null,
    sheet_page_key: r.sheetPageKey ?? null,
    sheet_product_names: r.sheetProductNames ?? [],
    shopify_fetch_status: r.shopifyFetchStatus ?? null,
    shopify_products: r.shopifyProducts ?? null,
    shopify_fetch_error: r.shopifyFetchError ?? null,
    shopify_refund_id: r.shopifyRefundId ?? null,
    shopify_refund_error: r.shopifyRefundError ?? null,
    shopify_refund_attempted_at: r.shopifyRefundAttemptedAt ?? null,
    shopify_credential_id: scope.shopifyCredentialId,
    shop_domain: scope.shopDomain,
  };
}

function partialToUpdate(updates: Partial<Refund>): TablesUpdate<"refunds"> {
  const row: TablesUpdate<"refunds"> = {};
  if (updates.date !== undefined) row.date = updates.date;
  if (updates.source !== undefined) row.source = updates.source;
  if (updates.orderId !== undefined) row.order_id = updates.orderId;
  if (updates.customer !== undefined) row.customer = updates.customer;
  if (updates.skus !== undefined) row.skus = updates.skus;
  if (updates.qty !== undefined) row.qty = updates.qty;
  if (updates.orderDate !== undefined) row.order_date = updates.orderDate;
  if (updates.originalAmount !== undefined) row.original_amount = updates.originalAmount;
  if (updates.returnFee !== undefined) row.return_fee = updates.returnFee;
  if (updates.calculatedRefund !== undefined) row.calculated_refund = updates.calculatedRefund;
  if (updates.reasonOfReturn !== undefined) row.reason_of_return = updates.reasonOfReturn;
  if (updates.aiConfidence !== undefined) row.ai_confidence = updates.aiConfidence;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.pdfUrl !== undefined) row.pdf_url = updates.pdfUrl ?? null;
  if (updates.shopifyNumericOrderId !== undefined) {
    row.shopify_numeric_order_id = updates.shopifyNumericOrderId ?? null;
  }
  if (updates.sheetPageKey !== undefined) row.sheet_page_key = updates.sheetPageKey ?? null;
  if (updates.sheetProductNames !== undefined) {
    row.sheet_product_names = updates.sheetProductNames ?? [];
  }
  if (updates.shopifyFetchStatus !== undefined) {
    row.shopify_fetch_status = updates.shopifyFetchStatus ?? null;
  }
  if (updates.shopifyProducts !== undefined) {
    row.shopify_products = updates.shopifyProducts ?? null;
  }
  if (updates.shopifyFetchError !== undefined) {
    row.shopify_fetch_error = updates.shopifyFetchError ?? null;
  }
  if (updates.shopifyRefundId !== undefined) {
    row.shopify_refund_id = updates.shopifyRefundId ?? null;
  }
  if (updates.shopifyRefundError !== undefined) {
    row.shopify_refund_error = updates.shopifyRefundError ?? null;
  }
  if (updates.shopifyRefundAttemptedAt !== undefined) {
    row.shopify_refund_attempted_at = updates.shopifyRefundAttemptedAt ?? null;
  }
  if (updates.deletedAt !== undefined) {
    row.deleted_at = updates.deletedAt ?? null;
  }
  return row;
}

export async function fetchRefunds(
  shopifyCredentialId: string | null
): Promise<{ data: Refund[]; error: Error | null }> {
  const id = shopifyCredentialId?.trim() ?? "";
  if (!id) {
    return { data: [], error: null };
  }

  const { data, error } = await supabase
    .from("refunds")
    .select("*")
    .eq("shopify_credential_id", id)
    .is("deleted_at", null)
    .order("date", { ascending: false });

  if (error) {
    return { data: [], error: new Error(error.message) };
  }
  return {
    data: (data ?? []).map((row) => rowToRefund(row)),
    error: null,
  };
}

export async function insertRefunds(
  rows: Refund[],
  scope: { shopifyCredentialId: string; shopDomain: string }
): Promise<{ error: Error | null }> {
  if (rows.length === 0) return { error: null };
  const credId = scope.shopifyCredentialId.trim();
  const shop = normalizeShopDomain(scope.shopDomain);
  if (!credId) {
    return {
      error: new Error(
        "Sign in and save this store's Shopify connection before importing refunds."
      ),
    };
  }
  if (!shop) {
    return {
      error: new Error("Configure your Shopify shop domain before importing refunds."),
    };
  }
  const payload = rows.map((r) => refundToInsert(r, { shopifyCredentialId: credId, shopDomain: shop }));
  const { error } = await supabase.from("refunds").insert(payload);
  return { error: error ? new Error(error.message) : null };
}

export async function updateRefund(
  id: string,
  updates: Partial<Refund>
): Promise<{ error: Error | null }> {
  const row = partialToUpdate(updates);
  if (Object.keys(row).length === 0) return { error: null };
  const { error } = await supabase.from("refunds").update(row).eq("id", id);
  return { error: error ? new Error(error.message) : null };
}
