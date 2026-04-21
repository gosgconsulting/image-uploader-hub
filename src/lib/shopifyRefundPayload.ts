/**
 * Pure helpers for Shopify refund REST payloads.
 * Edge Function duplicates this logic; keep behavior aligned when changing.
 */

export interface ShopifyTxn {
  id: number;
  kind: string;
  status: string;
  amount: string;
  gateway: string;
  parent_id?: number | null;
}

function parseAmount(s: string | undefined): number {
  const n = parseFloat(s || "0");
  return Number.isFinite(n) ? n : 0;
}

function refundedAgainstParent(transactions: ShopifyTxn[], parentId: number): number {
  return transactions
    .filter(
      (t) =>
        t.kind === "refund" &&
        t.status === "success" &&
        Number(t.parent_id) === parentId
    )
    .reduce((sum, t) => sum + parseAmount(t.amount), 0);
}

export type PickRefundParentResult =
  | { ok: true; parentId: number; gateway: string; refundAmount: string }
  | { ok: false; error: string };

/**
 * Picks a successful sale/capture with the largest remaining refundable balance
 * and refunds min(desiredRefund, remaining).
 */
export function pickParentAndRefundAmount(
  transactions: ShopifyTxn[],
  desiredRefund: number
): PickRefundParentResult {
  if (!Number.isFinite(desiredRefund) || desiredRefund <= 0) {
    return { ok: false, error: "Refund amount must be positive" };
  }

  const parents = transactions.filter(
    (t) =>
      (t.kind === "sale" || t.kind === "capture") &&
      t.status === "success" &&
      typeof t.id === "number"
  );

  if (parents.length === 0) {
    return { ok: false, error: "No successful sale or capture transaction on order" };
  }

  type Candidate = { parentId: number; gateway: string; remaining: number };
  const candidates: Candidate[] = [];

  for (const p of parents) {
    const gross = parseAmount(p.amount);
    const already = refundedAgainstParent(transactions, p.id);
    const remaining = Math.max(0, gross - already);
    if (remaining > 0) {
      candidates.push({
        parentId: p.id,
        gateway: p.gateway || "unknown",
        remaining,
      });
    }
  }

  if (candidates.length === 0) {
    return { ok: false, error: "No refundable balance left on order transactions" };
  }

  candidates.sort((a, b) => b.remaining - a.remaining);
  const best = candidates[0];
  const raw = Math.min(desiredRefund, best.remaining);
  const refundAmount = raw.toFixed(2);

  return {
    ok: true,
    parentId: best.parentId,
    gateway: best.gateway,
    refundAmount,
  };
}
