/** Keep in sync with Edge Function `shopify-create-refund`. */
export const SHOPIFY_ADMIN_API_VERSION = "2026-04";

/** REST/GraphQL path after the version segment, e.g. `graphql.json` or `shop.json`. */
export function buildShopifyAdminApiUrl(
  shopHost: string,
  pathAfterVersion: string,
): string {
  const normalizedHost = normalizeShopDomain(shopHost);
  const rel = pathAfterVersion.startsWith("/")
    ? pathAfterVersion
    : `/${pathAfterVersion}`;
  const p = `/admin/api/${SHOPIFY_ADMIN_API_VERSION}${rel}`;
  if (import.meta.env.DEV) {
    return `/shopify-proxy/${encodeURIComponent(normalizedHost)}${p}`;
  }
  return `https://${normalizedHost}${p}`;
}

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
