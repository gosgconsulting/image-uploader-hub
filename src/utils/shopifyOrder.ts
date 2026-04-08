import type { Product } from "@/utils/refundCalculation";
import {
  normalizeShopDomain,
  SHOPIFY_ADMIN_API_VERSION,
} from "@/lib/shopifyAdminApi";
import { supabase } from "@/integrations/supabase/client";
import { adminGetViaProductionProxy } from "@/utils/shopifyAdminProductionProxy";

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

  if (import.meta.env.DEV) {
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
      return {
        ok: false,
        error: `Could not reach Shopify (${msg}). Check the shop domain and your network.`,
      };
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

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return {
      ok: false,
      error: "Sign in to verify your Shopify connection from this app.",
    };
  }

  const proxied = await adminGetViaProductionProxy({
    shopDomain: shopHost,
    kind: "shop",
    adminAccessToken: token,
  });
  if (proxied.ok === false) {
    return { ok: false, error: proxied.error };
  }
  const { shopifyStatus, body: data } = proxied;
  if (shopifyStatus < 200 || shopifyStatus >= 300) {
    const err = data.errors;
    let msg = `Shopify returned ${shopifyStatus}`;
    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") msg = JSON.stringify(err);
    return { ok: false, error: msg };
  }

  return { ok: true };
}

interface ShopifyTaxLine {
  price?: string;
}

interface ShopifyLineItem {
  id: number;
  name: string;
  price: string;
  quantity: number;
  tax_lines?: ShopifyTaxLine[];
}

function sumLineItemTax(li: ShopifyLineItem): number {
  return (li.tax_lines ?? []).reduce(
    (sum, tl) => sum + parseFloat(tl.price || "0"),
    0
  );
}

/** Line total the customer pays for this row: pre-tax + tax when prices exclude tax; else `price`×qty already includes tax. */
function lineItemCustomerTotal(li: ShopifyLineItem, taxesIncluded: boolean): number {
  const qty = li.quantity || 1;
  const linePreTaxOrInclusive = parseFloat(li.price || "0") * qty;
  if (taxesIncluded) return linePreTaxOrInclusive;
  return linePreTaxOrInclusive + sumLineItemTax(li);
}

/** Subset of REST Admin `Order` fields used to show a human-readable customer in the refund list. */
interface ShopifyOrderCustomerShape {
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
  email?: string | null;
  contact_email?: string | null;
  billing_address?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
}

interface ShopifyOrderResponse {
  order?: {
    id: number;
    line_items?: ShopifyLineItem[];
    subtotal_price?: string;
    total_price?: string;
    current_total_price?: string;
    /** When true, line `price` amounts already include tax (do not add `tax_lines` again). */
    taxes_included?: boolean;
    currency?: string;
  } & ShopifyOrderCustomerShape;
}

function customerDisplayNameFromShopifyOrder(
  order: ShopifyOrderCustomerShape
): string | undefined {
  const c = order.customer;
  if (c && typeof c === "object") {
    const fn = (c.first_name ?? "").trim();
    const ln = (c.last_name ?? "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    if (full) return full;
    const em = (c.email ?? "").trim();
    if (em) return em;
  }
  const direct = (order.email ?? order.contact_email ?? "").trim();
  if (direct) return direct;
  const b = order.billing_address;
  if (b && typeof b === "object") {
    const fn = (b.first_name ?? "").trim();
    const ln = (b.last_name ?? "").trim();
    const full = [fn, ln].filter(Boolean).join(" ").trim();
    if (full) return full;
  }
  return undefined;
}

export function lineItemsToProducts(
  lineItems: ShopifyLineItem[],
  taxesIncluded: boolean
): Product[] {
  return lineItems.map((li) => ({
    id: String(li.id),
    name: li.name,
    amount: lineItemCustomerTotal(li, taxesIncluded),
  }));
}

export async function fetchShopifyOrderDetails(
  shop: string,
  adminAccessToken: string,
  numericOrderId: string,
  sheetProductNames?: string[]
): Promise<{
  products: Product[];
  originalAmount: number;
  calculatedRefund: number;
  /** From Shopify order when available (name, else email, else billing name). */
  customerName?: string;
}> {
  const shopHost = normalizeShopDomain(shop);
  const token = adminAccessToken.trim();

  let data: ShopifyOrderResponse & { errors?: unknown };

  if (import.meta.env.DEV) {
    const url = buildOrderUrl(shopHost, numericOrderId);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": adminAccessToken,
        Accept: "application/json",
      },
    });
    data = (await res.json()) as ShopifyOrderResponse & { errors?: unknown };
    if (!res.ok) {
      const err = data.errors;
      let msg = `Shopify error ${res.status}`;
      if (typeof err === "string") msg = err;
      else if (err && typeof err === "object") msg = JSON.stringify(err);
      throw new Error(msg);
    }
  } else {
    const body: {
      shopDomain: string;
      kind: "order";
      orderNumericId: string;
      adminAccessToken?: string;
    } = {
      shopDomain: shopHost,
      kind: "order",
      orderNumericId: numericOrderId,
    };
    if (token) body.adminAccessToken = token;

    const proxied = await adminGetViaProductionProxy(body);
    if (proxied.ok === false) {
      throw new Error(proxied.error);
    }
    const { shopifyStatus, body: json } = proxied;
    data = json as ShopifyOrderResponse & { errors?: unknown };
    if (shopifyStatus < 200 || shopifyStatus >= 300) {
      const err = data.errors;
      let msg = `Shopify error ${shopifyStatus}`;
      if (typeof err === "string") msg = err;
      else if (err && typeof err === "object") msg = JSON.stringify(err);
      throw new Error(msg);
    }
  }

  const order = data.order;
  if (!order) throw new Error("Order not found");

  const lineItems = order.line_items || [];
  const taxesIncluded = Boolean(order.taxes_included);
  let products = lineItemsToProducts(lineItems, taxesIncluded);

  if (sheetProductNames && sheetProductNames.length > 0) {
    const normalizedSheetNames = sheetProductNames.map(n => n.trim().toLowerCase()).filter(Boolean);
    if (normalizedSheetNames.length > 0) {
      const filtered = products.filter(p => {
        const pName = p.name.trim().toLowerCase();
        return normalizedSheetNames.some(sn => pName.includes(sn) || sn.includes(pName));
      });
      if (filtered.length > 0) {
        products = filtered;
      }
    }
  }

  const merchandiseTotalWithTax = products.reduce((sum, p) => sum + p.amount, 0);
  const originalAmount = parseFloat(order.current_total_price || order.total_price || "0");
  const fallbackRefundBase = merchandiseTotalWithTax > 0 ? merchandiseTotalWithTax : originalAmount;
  const returnFee = 3;
  const calculatedRefund = Math.max(0, fallbackRefundBase - returnFee);
  const customerName = customerDisplayNameFromShopifyOrder(order);

  return {
    products,
    originalAmount,
    calculatedRefund,
    ...(customerName ? { customerName } : {}),
  };
}
