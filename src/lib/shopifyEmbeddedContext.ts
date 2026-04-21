import { normalizeShopDomain } from "@/lib/shopifyAdminApi";

/**
 * When the Refund page loads inside Shopify Admin (embedded app), the URL includes
 * `shop` plus `host` (base64) and often `embedded=1`. Use that shop as the active store
 * so merchants do not need to open Shopify API settings.
 */
export function shopDomainFromEmbeddedAppSearch(
  params: URLSearchParams
): string | null {
  const shopRaw = params.get("shop");
  if (!shopRaw) return null;
  const normalized = normalizeShopDomain(shopRaw);
  if (!normalized) return null;
  const hasHost = Boolean(params.get("host")?.trim());
  const embedded = params.get("embedded") === "1";
  if (!hasHost && !embedded) return null;
  return normalized;
}
