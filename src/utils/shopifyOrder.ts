import type { Product } from "@/utils/refundCalculation";
import {
  normalizeShopDomain,
  SHOPIFY_ADMIN_API_VERSION,
} from "@/lib/shopifyAdminApi";

const SHOPIFY_API_VERSION = SHOPIFY_ADMIN_API_VERSION;

/** Path after API version, e.g. `/shop.json` or `/orders/123.json`. */
function buildAdminApiUrl(shopHost: string, pathAfterVersion: string): string {
  const rel = pathAfterVersion.startsWith("/") ? pathAfterVersion : `/${pathAfterVersion}`;
  const path = `/admin/api/${SHOPIFY_API_VERSION}${rel}`;
  if (import.meta.env.DEV) {
    return `/shopify-proxy/${encodeURIComponent(shopHost)}${path}`;
  }
  return `https://${shopHost}${path}`;
}

function buildOrderUrl(shopHost: string, numericOrderId: string): string {
  return buildAdminApiUrl(shopHost, `/orders/${numericOrderId}.json`);
}

export type ShopifyConnectionResult =
  | { ok: true }
  | { ok: false; error: string };

/** Lightweight Admin API check (GET shop) before persisting credentials. */
export async function testShopifyAdminConnection(
  shop: string,
  adminAccessToken: string
): Promise<ShopifyConnectionResult> {
  const shopHost = normalizeShopDomain(shop);
  if (!shopHost) {
    return { ok: false, error: "Enter your shop domain." };
  }
  const token = adminAccessToken.trim();
  if (!token) {
    return { ok: false, error: "Enter your Admin API access token." };
  }

  const url = buildAdminApiUrl(shopHost, "/shop.json");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": token,
        Accept: "application/json",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: `Could not reach Shopify (${msg}). Check the shop domain and your network.` };
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    errors?: unknown;
  };

  if (!res.ok) {
    const err = data.errors;
    let msg = `Shopify returned ${res.status}`;
    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") msg = JSON.stringify(err);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

interface ShopifyLineItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
}

interface ShopifyOrderResponse {
  order?: {
    id: number;
    line_items?: ShopifyLineItem[];
    subtotal_price?: string;
    total_price?: string;
    currency?: string;
  };
}

export function lineItemsToProducts(lineItems: ShopifyLineItem[]): Product[] {
  return lineItems.map((li) => ({
    id: String(li.id),
    name: li.name,
    amount: parseFloat(li.price || "0") * (li.quantity || 1),
  }));
}

export async function fetchShopifyOrderDetails(
  shop: string,
  adminAccessToken: string,
  numericOrderId: string
): Promise<{
  products: Product[];
  originalAmount: number;
  calculatedRefund: number;
}> {
  const shopHost = normalizeShopDomain(shop);
  const url = buildOrderUrl(shopHost, numericOrderId);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Shopify-Access-Token": adminAccessToken,
      Accept: "application/json",
    },
  });

  const data = (await res.json()) as ShopifyOrderResponse & { errors?: unknown };

  if (!res.ok) {
    const err = data.errors;
    let msg = `Shopify error ${res.status}`;
    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") msg = JSON.stringify(err);
    throw new Error(msg);
  }

  const order = data.order;
  if (!order) throw new Error("Order not found");

  const lineItems = order.line_items || [];
  const products = lineItemsToProducts(lineItems);
  const subtotal = parseFloat(order.subtotal_price || order.total_price || "0");
  const returnFee = 3;
  const calculatedRefund = Math.max(0, subtotal - returnFee);

  return {
    products,
    originalAmount: subtotal,
    calculatedRefund,
  };
}
