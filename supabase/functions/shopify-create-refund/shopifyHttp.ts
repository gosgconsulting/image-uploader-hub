import type { ShopifyTxn } from "./refundLogic.ts";

export async function shopifyJson(
  shopHost: string,
  path: string,
  accessToken: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url = `https://${shopHost}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "X-Shopify-Access-Token": accessToken,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string>),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

export function formatShopifyError(data: Record<string, unknown>, status: number): string {
  const errors = data.errors;
  if (typeof errors === "string") return `Shopify ${status}: ${errors}`;
  if (errors && typeof errors === "object") return `Shopify ${status}: ${JSON.stringify(errors)}`;
  return `Shopify error ${status}`;
}

export function normalizeTransactions(raw: unknown): ShopifyTxn[] {
  if (!Array.isArray(raw)) return [];
  const out: ShopifyTxn[] = [];
  for (const t of raw) {
    if (!t || typeof t !== "object") continue;
    const o = t as Record<string, unknown>;
    const id = Number(o.id);
    if (!Number.isFinite(id)) continue;
    out.push({
      id,
      kind: String(o.kind || ""),
      status: String(o.status || ""),
      amount: String(o.amount ?? "0"),
      gateway: String(o.gateway || ""),
      parent_id: o.parent_id == null ? null : Number(o.parent_id),
    });
  }
  return out;
}
