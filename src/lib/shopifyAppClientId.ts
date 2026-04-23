/**
 * Public Shopify app API key for App Bridge (embedded Admin). Must match the app used on Edge
 * (`SHOPIFY_CUSTOM_APP_CLIENT_ID` / `SHOPIFY_CLIENT_ID` and corresponding secret).
 */
export function getShopifyAppClientIdForClient(): string {
  const custom = import.meta.env.VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID?.trim() ?? "";
  if (custom) return custom;
  return import.meta.env.VITE_SHOPIFY_CLIENT_ID?.trim() ?? "";
}
