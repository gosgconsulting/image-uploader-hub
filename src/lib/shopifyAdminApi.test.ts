import { describe, expect, it } from "vitest";
import {
  buildShopifyAdminApiUrl,
  normalizeShopDomain,
} from "./shopifyAdminApi";

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
        "0bfrtk-ht.myshopify.com/admin/api/2026-04/products.json?collection_id=527164440852"
      )
    ).toBe("0bfrtk-ht.myshopify.com");
  });
});

describe("buildShopifyAdminApiUrl", () => {
  it("uses the Vite dev proxy path when import.meta.env.DEV is true", () => {
    const u = buildShopifyAdminApiUrl("store.myshopify.com", "graphql.json");
    if (import.meta.env.DEV) {
      expect(u).toBe(
        "/shopify-proxy/store.myshopify.com/admin/api/2026-04/graphql.json",
      );
    } else {
      expect(u).toBe(
        "https://store.myshopify.com/admin/api/2026-04/graphql.json",
      );
    }
  });

  it("accepts path with leading slash", () => {
    const u = buildShopifyAdminApiUrl("store.myshopify.com", "/shop.json");
    if (import.meta.env.DEV) {
      expect(u).toBe(
        "/shopify-proxy/store.myshopify.com/admin/api/2026-04/shop.json",
      );
    } else {
      expect(u).toBe("https://store.myshopify.com/admin/api/2026-04/shop.json");
    }
  });
});
