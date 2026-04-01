import * as XLSX from "xlsx";
import type { Refund } from "@/types/refund";

export interface ParsedRefundGroup {
  pageKey: string;
  orderIdDisplay: string;
  provenance: string;
  orderDateIso: string;
  reason: string;
  productNames: string[];
  numericOrderId: string | null;
  fichierSource: string;
}

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

function rowToNormalized(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeHeaderKey(k)] = v == null ? "" : String(v).trim();
  }
  return out;
}

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

function parseCellDate(val: unknown): string {
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }
  if (typeof val === "number" && val > 20000 && val < 80000) {
    const utc = Math.round((val - 25569) * 86400 * 1000);
    const d = new Date(utc);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(val ?? "").trim();
  if (!s) return new Date().toISOString().slice(0, 10);
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function getField(r: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== "") return r[k];
  }
  return "";
}

export function parseRefundSpreadsheetBuffer(buffer: ArrayBuffer): ParsedRefundGroup[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("No sheet found in file.");
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  if (rawRows.length === 0) throw new Error("No data rows in file.");

  const normalized = rawRows.map(rowToNormalized);

  const groups = new Map<string, Record<string, string>[]>();
  for (const r of normalized) {
    const pageKey = getField(r, "page", "page_") || "1";
    if (!groups.has(pageKey)) groups.set(pageKey, []);
    groups.get(pageKey)!.push(r);
  }

  const result: ParsedRefundGroup[] = [];
  for (const [pageKey, rows] of groups) {
    let orderIdDisplay = "";
    let provenance = "";
    let orderDateRaw: unknown = "";
    let reason = "";
    let numericOrderId: string | null = null;
    let fichierSource = "";
    let lien = "";
    const productNames: string[] = [];

    for (const r of rows) {
      if (!orderIdDisplay) orderIdDisplay = getField(r, "numero_commande", "numéro_commande");
      if (!provenance) provenance = getField(r, "provenance");
      if (!orderDateRaw) orderDateRaw = r.date ?? "";
      if (!reason) reason = getField(r, "raison_retour");
      if (!fichierSource) fichierSource = getField(r, "fichier_source", "fichiers_source");
      if (!lien) lien = getField(r, "lien_shopify");
      const nom = getField(r, "nom_produit");
      if (nom) productNames.push(nom);
    }

    if (!numericOrderId) {
      numericOrderId = extractShopifyNumericOrderId(orderIdDisplay, lien);
    }

    const orderDateIso = parseCellDate(orderDateRaw);

    result.push({
      pageKey,
      orderIdDisplay: orderIdDisplay || `Page ${pageKey}`,
      provenance: provenance || "—",
      orderDateIso,
      reason: reason || "—",
      productNames,
      numericOrderId,
      fichierSource,
    });
  }

  result.sort((a, b) => {
    const na = parseInt(a.pageKey, 10);
    const nb = parseInt(b.pageKey, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return a.pageKey.localeCompare(b.pageKey, undefined, { numeric: true });
  });

  return result;
}

export function groupsToRefundRows(
  groups: ParsedRefundGroup[],
  pdfObjectUrl?: string | null
): Refund[] {
  const now = new Date().toISOString();
  return groups.map((g) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `imp-${g.pageKey}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const qty = Math.max(1, g.productNames.length);
    const base: Refund = {
      id,
      date: now,
      source: g.provenance,
      orderId: g.orderIdDisplay,
      customer: g.productNames.length ? `${g.productNames.length} product(s)` : "—",
      skus: [],
      qty,
      orderDate: g.orderDateIso,
      originalAmount: 0,
      returnFee: -3,
      calculatedRefund: 0,
      reasonOfReturn: g.reason,
      aiConfidence: 1,
      status: "pending",
      pdfUrl: pdfObjectUrl || undefined,
      shopifyNumericOrderId: g.numericOrderId || undefined,
      sheetPageKey: g.pageKey,
      sheetProductNames: g.productNames,
      shopifyFetchStatus: g.numericOrderId ? "loading" : "error",
      shopifyFetchError: g.numericOrderId ? undefined : "No Shopify order id in sheet",
    };
    return base;
  });
}
