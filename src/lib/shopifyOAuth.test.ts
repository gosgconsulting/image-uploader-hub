import { describe, expect, it } from "vitest";
import { parseShopifyOAuthEnabledEnv } from "./shopifyOAuth";

describe("parseShopifyOAuthEnabledEnv", () => {
  it("treats unset as false", () => {
    expect(parseShopifyOAuthEnabledEnv(undefined)).toBe(false);
    expect(parseShopifyOAuthEnabledEnv("")).toBe(false);
  });

  it("accepts common truthy strings", () => {
    expect(parseShopifyOAuthEnabledEnv("true")).toBe(true);
    expect(parseShopifyOAuthEnabledEnv("TRUE")).toBe(true);
    expect(parseShopifyOAuthEnabledEnv("1")).toBe(true);
    expect(parseShopifyOAuthEnabledEnv("yes")).toBe(true);
    expect(parseShopifyOAuthEnabledEnv("on")).toBe(true);
  });

  it("rejects other values", () => {
    expect(parseShopifyOAuthEnabledEnv("false")).toBe(false);
    expect(parseShopifyOAuthEnabledEnv("maybe")).toBe(false);
  });
});
