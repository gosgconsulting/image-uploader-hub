/** Keep in sync with Edge Function `shopify-create-refund`. */
export const SHOPIFY_ADMIN_API_VERSION = "2024-10";

/** Admin API calls need the shop hostname only; users sometimes paste a full Admin URL. */
export function normalizeShopDomain(shop: string): string {
  let s = shop
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const stop = s.search(/[/?#]/);
  if (stop !== -1) s = s.slice(0, stop);
  return s;
}
