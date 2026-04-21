/** Parse Shopify Admin order id from export link or `#TAG / 123...` style commande cell. */
export function extractShopifyNumericOrderId(
  numeroCommande: string,
  lienShopify: string
): string | null {
  const fromLink = lienShopify.match(/\/orders\/(\d+)/);
  if (fromLink) return fromLink[1];
  const parts = numeroCommande.split("/");
  const last = parts[parts.length - 1]?.trim();
  if (last && /^\d+$/.test(last)) return last;
  const m = numeroCommande.match(/(\d{10,})/);
  return m ? m[1] : null;
}
