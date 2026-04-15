import type { ParsedRefundGroup } from "@/types/refundSpreadsheet";
import { extractShopifyNumericOrderId } from "@/utils/refundSpreadsheetOrderIds";

function getField(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== "") return r[k];
  }
  return "";
}

/** Stable key: one Shopify numeric order id ⇒ one group (multiple `nom_produit` rows). */
export function rowOrderGroupKey(
  r: Record<string, string>,
  pageKeyPrefix: string | null
): string {
  const num = getField(r, "numero_commande", "numéro_commande");
  const lien = getField(r, "lien_shopify");
  const nid = extractShopifyNumericOrderId(num, lien);
  const prefix = pageKeyPrefix ?? "";
  if (nid) return `${prefix}oid:${nid}`;
  const rawPage = getField(r, "page", "page_") || "1";
  return `${prefix}fb:p${rawPage}:${num}\u001f${lien}`;
}

export function groupNormalizedRowsByOrderId(
  normalized: Record<string, string>[],
  pageKeyPrefix: string | null
): Map<string, Record<string, string>[]> {
  const groups = new Map<string, Record<string, string>[]>();
  for (const r of normalized) {
    const key = rowOrderGroupKey(r, pageKeyPrefix);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }
  return groups;
}

export function sortParsedRefundGroups(groups: ParsedRefundGroup[]): void {
  groups.sort((a, b) => {
    const na = a.numericOrderId;
    const nb = b.numericOrderId;
    if (na && nb) {
      const cmp = BigInt(na) < BigInt(nb) ? -1 : BigInt(na) > BigInt(nb) ? 1 : 0;
      if (cmp !== 0) return cmp;
      return a.pageKey.localeCompare(b.pageKey);
    }
    return a.pageKey.localeCompare(b.pageKey, undefined, { numeric: true });
  });
}
