import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useShopifyLiveConnectionTest } from "./useShopifyLiveConnectionTest";

vi.mock("@/utils/shopifyOrder", () => ({
  testShopifyAdminConnection: vi.fn(),
}));

import { testShopifyAdminConnection } from "@/utils/shopifyOrder";

describe("useShopifyLiveConnectionTest", () => {
  beforeEach(() => {
    vi.mocked(testShopifyAdminConnection).mockReset();
  });

  it("stays idle when shop or token is missing", () => {
    const { result } = renderHook(() => useShopifyLiveConnectionTest("", ""));
    expect(result.current.shopifyLiveConnectionStatus).toBe("idle");
    expect(result.current.shopifyLiveConnectionError).toBeNull();
  });

  it("ends in ok when Shopify ping succeeds", async () => {
    vi.mocked(testShopifyAdminConnection).mockResolvedValue({ ok: true });
    const { result } = renderHook(() =>
      useShopifyLiveConnectionTest("store.myshopify.com", "shpat_x")
    );
    await waitFor(() => {
      expect(result.current.shopifyLiveConnectionStatus).toBe("ok");
    });
    expect(result.current.shopifyLiveConnectionError).toBeNull();
    expect(testShopifyAdminConnection).toHaveBeenCalledWith("store.myshopify.com", "shpat_x");
  });

  it("ends in failed when Shopify ping fails", async () => {
    vi.mocked(testShopifyAdminConnection).mockResolvedValue({
      ok: false,
      error: "401",
    });
    const { result } = renderHook(() =>
      useShopifyLiveConnectionTest("store.myshopify.com", "shpat_x")
    );
    await waitFor(() => {
      expect(result.current.shopifyLiveConnectionStatus).toBe("failed");
    });
    expect(result.current.shopifyLiveConnectionError).toBe("401");
  });
});
