import { describe, expect, it } from "vitest";
import { shopDomainFromEmbeddedAppSearch } from "./shopifyEmbeddedContext";

describe("shopDomainFromEmbeddedAppSearch", () => {
  it("returns normalized shop when embedded=1", () => {
    const p = new URLSearchParams(
      "embedded=1&shop=0bfrtk-ht.myshopify.com&host=abc"
    );
    expect(shopDomainFromEmbeddedAppSearch(p)).toBe("0bfrtk-ht.myshopify.com");
  });

  it("returns normalized shop when host is present (typical Admin embed)", () => {
    const p = new URLSearchParams("shop=My-Store.myshopify.com&host=YWRtaW4");
    expect(shopDomainFromEmbeddedAppSearch(p)).toBe("my-store.myshopify.com");
  });

  it("returns null without host or embedded flag", () => {
    const p = new URLSearchParams("shop=foo.myshopify.com");
    expect(shopDomainFromEmbeddedAppSearch(p)).toBeNull();
  });

  it("returns null when shop is missing", () => {
    const p = new URLSearchParams("embedded=1&host=x");
    expect(shopDomainFromEmbeddedAppSearch(p)).toBeNull();
  });
});
