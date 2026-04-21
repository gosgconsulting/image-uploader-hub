import { describe, it, expect } from "vitest";
import { pickParentAndRefundAmount, type ShopifyTxn } from "./shopifyRefundPayload";

describe("pickParentAndRefundAmount", () => {
  it("returns error when desired refund is not positive", () => {
    const tx: ShopifyTxn[] = [
      { id: 1, kind: "sale", status: "success", amount: "100.00", gateway: "bogus" },
    ];
    expect(pickParentAndRefundAmount(tx, 0).ok).toBe(false);
    expect(pickParentAndRefundAmount(tx, -1).ok).toBe(false);
  });

  it("picks sale with partial refund against parent", () => {
    const tx: ShopifyTxn[] = [
      { id: 10, kind: "sale", status: "success", amount: "100.00", gateway: "bogus" },
      { id: 11, kind: "refund", status: "success", amount: "40.00", gateway: "bogus", parent_id: 10 },
    ];
    const r = pickParentAndRefundAmount(tx, 50);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.parentId).toBe(10);
      expect(r.refundAmount).toBe("50.00");
      expect(r.gateway).toBe("bogus");
    }
  });

  it("caps refund to remaining balance", () => {
    const tx: ShopifyTxn[] = [
      { id: 10, kind: "capture", status: "success", amount: "30.00", gateway: "shopify_payments" },
    ];
    const r = pickParentAndRefundAmount(tx, 100);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.refundAmount).toBe("30.00");
    }
  });

  it("prefers capture with largest remaining balance", () => {
    const tx: ShopifyTxn[] = [
      { id: 1, kind: "sale", status: "success", amount: "10.00", gateway: "a" },
      { id: 2, kind: "sale", status: "success", amount: "50.00", gateway: "b" },
    ];
    const r = pickParentAndRefundAmount(tx, 5);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.parentId).toBe(2);
  });
});
