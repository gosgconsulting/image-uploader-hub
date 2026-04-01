/** Keep in sync with Edge Function `shopify-create-refund`. */
export const SHOPIFY_ADMIN_API_VERSION = "2024-10";

export function normalizeShopDomain(shop: string): string {
  return shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}
