import { describe, expect, it } from "vitest";
import { parseSaveShopifyCredentialsEnv } from "@/lib/shopify-credentials";

describe("parseSaveShopifyCredentialsEnv", () => {
  it("defaults to disabled when undefined or empty", () => {
    expect(parseSaveShopifyCredentialsEnv(undefined)).toBe(false);
    expect(parseSaveShopifyCredentialsEnv("")).toBe(false);
  });

  it("disables for explicit false-ish or unknown values", () => {
    expect(parseSaveShopifyCredentialsEnv("false")).toBe(false);
    expect(parseSaveShopifyCredentialsEnv("0")).toBe(false);
    expect(parseSaveShopifyCredentialsEnv("no")).toBe(false);
    expect(parseSaveShopifyCredentialsEnv("maybe")).toBe(false);
  });

  it("enables for common true tokens", () => {
    expect(parseSaveShopifyCredentialsEnv("true")).toBe(true);
    expect(parseSaveShopifyCredentialsEnv("TRUE")).toBe(true);
    expect(parseSaveShopifyCredentialsEnv("1")).toBe(true);
    expect(parseSaveShopifyCredentialsEnv("yes")).toBe(true);
    expect(parseSaveShopifyCredentialsEnv("on")).toBe(true);
  });
});
