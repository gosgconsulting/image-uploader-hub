import { supabase } from "@/integrations/supabase/client";

export type ProcessRefundItemResult = {
  id: string;
  ok: boolean;
  skipped?: boolean;
  shopifyRefundId?: string;
  error?: string;
};

export type ProcessRefundsResponse = {
  results: ProcessRefundItemResult[];
};

export async function invokeProcessShopifyRefunds(
  shopDomain: string,
  refundIds: string[]
): Promise<{ data: ProcessRefundsResponse | null; error: Error | null }> {
  const trimmed = shopDomain.trim();
  if (!trimmed) {
    return { data: null, error: new Error("Shop domain is required") };
  }
  if (refundIds.length === 0) {
    return { data: null, error: new Error("No refunds selected") };
  }

  const { data, error } = await supabase.functions.invoke<ProcessRefundsResponse>(
    "shopify-create-refund",
    { body: { shopDomain: trimmed, refundIds } }
  );

  if (error) {
    return { data: null, error: new Error(error.message) };
  }
  if (!data || !Array.isArray(data.results)) {
    return { data: null, error: new Error("Invalid response from refund function") };
  }
  return { data, error: null };
}
