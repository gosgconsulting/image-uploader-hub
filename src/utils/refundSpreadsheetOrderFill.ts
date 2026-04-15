/**
 * Exports like Shopify retours often repeat the same order on one "page": column D
 * (`numero_commande`) is filled on the first line only; blank rows inherit the previous
 * line's order (and usually the same `lien_shopify`). Carry-forward resets when `page`
 * changes so we never attach page-1's order to page-2 rows.
 */
function getField(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== "") return r[k];
  }
  return "";
}

export function forwardFillShopifyOrderColumns(
  rows: Record<string, string>[]
): void {
  let lastNum = "";
  let lastLien = "";
  let prevPage = "";

  for (const r of rows) {
    const rawPage = getField(r, "page", "page_") || "";
    if (prevPage !== "" && rawPage !== "" && rawPage !== prevPage) {
      lastNum = "";
      lastLien = "";
    }
    if (rawPage !== "") prevPage = rawPage;

    const num = getField(r, "numero_commande", "numéro_commande");
    const lien = getField(r, "lien_shopify");
    if (num) {
      lastNum = num;
    } else if (lastNum) {
      r["numero_commande"] = lastNum;
    }
    if (lien) {
      lastLien = lien;
    } else if (lastLien) {
      r["lien_shopify"] = lastLien;
    }
  }
}
