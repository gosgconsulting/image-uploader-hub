import createApp from "@shopify/app-bridge";
import { getSessionToken } from "@shopify/app-bridge/utilities";
import { getShopifyAppClientIdForClient } from "@/lib/shopifyAppClientId";

let cachedApp: ReturnType<typeof createApp> | null = null;
let cacheKey = "";

/**
 * Returns a fresh Shopify session token (~1 min TTL) for embedded Admin requests.
 * Requires `VITE_SHOPIFY_CLIENT_ID` or `VITE_SHOPIFY_CUSTOM_APP_CLIENT_ID` and the `host` query param.
 */
export async function fetchEmbeddedShopifySessionToken(host: string): Promise<string | null> {
  const apiKey = getShopifyAppClientIdForClient();
  const h = host.trim();
  if (!apiKey || !h) return null;

  const key = `${apiKey}:${h}`;
  if (!cachedApp || cacheKey !== key) {
    cachedApp = createApp({ apiKey, host: h });
    cacheKey = key;
  }

  try {
    return await getSessionToken(cachedApp);
  } catch {
    return null;
  }
}
