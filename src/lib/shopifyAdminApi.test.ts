import { describe, expect, it } from "vitest";
import { normalizeShopDomain } from "./shopifyAdminApi";

describe("normalizeShopDomain", () => {
  it("returns hostname for plain shop domain", () => {
    expect(normalizeShopDomain("  My-Store.myshopify.com ")).toBe("my-store.myshopify.com");
  });

  it("strips https and trailing slash", () => {
    expect(normalizeShopDomain("https://my-store.myshopify.com/")).toBe("my-store.myshopify.com");
  });

  it("drops pasted Admin API path and query so DNS is not given a bogus host", () => {
    expect(
      normalizeShopDomain(
        "0bfrtk-ht.myshopify.com/admin/api/2026-01/products.json?collection_id=527164440852"
      )
    ).toBe("0bfrtk-ht.myshopify.com");
  });
});
