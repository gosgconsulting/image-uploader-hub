import * as XLSX from "xlsx";
import type {
  ParsedRefundGroup,
  RefundWorkbookSheetMeta,
  ParseRefundSpreadsheetOptions,
  RefundColumnMapping,
  RefundFieldKey,
} from "@/types/refundSpreadsheet";
import { REFUND_FIELD_KEYS } from "@/types/refundSpreadsheet";
import { forwardFillShopifyOrderColumns } from "@/utils/refundSpreadsheetOrderFill";
import {
  groupNormalizedRowsByOrderId,
  sortParsedRefundGroups,
} from "@/utils/refundSpreadsheetGrouping";
import { extractShopifyNumericOrderId } from "@/utils/refundSpreadsheetOrderIds";

export { extractShopifyNumericOrderId };

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, "_");
}

const PIVOT_HEADER_MARKERS = ["nombre_de_raison_retour"] as const;

function sheetLooksLikePivotSummary(headers: Set<string>): boolean {
  return PIVOT_HEADER_MARKERS.some((m) => headers.has(m));
}

function firstRowHeaderSet(sheet: XLSX.WorkSheet): Set<string> | null {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
  });
  const first = rows[0];
  if (!Array.isArray(first) || first.length === 0) return null;
  return new Set(
    first.map((c) => normalizeHeaderKey(String(c ?? ""))).filter(Boolean)
  );
}

function hasRefundLineItemHeaders(h: Set<string>): boolean {
  const order = h.has("numero_commande") || h.has("numéro_commande") || h.has("lien_shopify");
  const line = h.has("nom_produit") || h.has("page") || h.has("fichier_source");
  return order && line;
}

export function getWorkbookSheetMeta(buffer: ArrayBuffer): RefundWorkbookSheetMeta {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const pivotSheetNames: string[] = [];
  const lineItemSheetNames: string[] = [];

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const headers = firstRowHeaderSet(sheet);
    if (!headers) continue;
    if (sheetLooksLikePivotSummary(headers)) pivotSheetNames.push(name);
    else if (hasRefundLineItemHeaders(headers)) lineItemSheetNames.push(name);
  }

  const pivotSet = new Set(pivotSheetNames);
  const nonPivot = wb.SheetNames.filter((n) => !pivotSet.has(n));
  let suggestedImportNames: string[] =
    lineItemSheetNames.length > 0
      ? lineItemSheetNames
      : nonPivot.length > 0
        ? nonPivot
        : [];

  if (wb.SheetNames.length === 1 && suggestedImportNames.length === 0) {
    suggestedImportNames = [wb.SheetNames[0]];
  }

  return {
    sheetNames: [...wb.SheetNames],
    pivotSheetNames,
    suggestedImportNames,
  };
}

function findRefundImportSheetName(wb: XLSX.WorkBook): string {
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const headers = firstRowHeaderSet(sheet);
    if (!headers) continue;
    if (sheetLooksLikePivotSummary(headers)) continue;
    if (hasRefundLineItemHeaders(headers)) return name;
  }
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const headers = firstRowHeaderSet(sheet);
    if (!headers) continue;
    if (sheetLooksLikePivotSummary(headers)) continue;
    return name;
  }
  const only = wb.SheetNames[0];
  if (!only) throw new Error("No sheet found in file.");
  const onlyHeaders = firstRowHeaderSet(wb.Sheets[only]!);
  if (onlyHeaders && sheetLooksLikePivotSummary(onlyHeaders)) {
    throw new Error("Only pivot/summary sheets found. Add a line-item tab or use CSV.");
  }
  return only;
}

function rowToNormalized(row: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    out[normalizeHeaderKey(k)] = v == null ? "" : String(v).trim();
  }
  return out;
}

function applyColumnMapping(
  rows: Record<string, string>[],
  mapping?: RefundColumnMapping
): void {
  if (!mapping) return;
  for (const row of rows) {
    for (const field of REFUND_FIELD_KEYS) {
      const sourceHeader = mapping[field];
      if (!sourceHeader) continue;
      const sourceKey = normalizeHeaderKey(sourceHeader);
      if (sourceKey === field) continue;
      const value = row[sourceKey];
      if (value !== undefined && value !== "" && !row[field]) {
        row[field] = value;
      }
    }
  }
}

const REFUND_FIELD_HEADER_ALIASES: Record<RefundFieldKey, string[]> = {
  numero_commande: [
    "numero_commande",
    "numéro_commande",
    "numero_de_commande",
    "n_commande",
    "n°_commande",
    "order_id",
    "orderid",
    "order_number",
    "order#",
    "order",
  ],
  provenance: [
    "provenance",
    "source",
    "source_of_order",
    "source_du_commande",
    "origine",
    "marketplace",
    "channel",
  ],
  date: [
    "date",
    "order_date",
    "date_commande",
    "date_de_commande",
    "date_de_la_commande",
    "purchase_date",
  ],
  nom_produit: [
    "nom_produit",
    "product_name",
    "product",
    "produit",
    "libelle",
    "libellé",
    "item_name",
    "item",
  ],
  raison_retour: [
    "raison_retour",
    "reason",
    "reason_of_return",
    "return_reason",
    "motif",
    "motif_retour",
    "raison",
  ],
  lien_shopify: [
    "lien_shopify",
    "shopify_link",
    "shopify_url",
    "link",
    "url",
    "lien",
  ],
};

function autoMatchField(
  field: RefundFieldKey,
  normalizedHeaders: string[]
): string | undefined {
  const aliases = REFUND_FIELD_HEADER_ALIASES[field];
  for (const alias of aliases) {
    const hit = normalizedHeaders.find((h) => h === alias);
    if (hit) return hit;
  }
  for (const alias of aliases) {
    const hit = normalizedHeaders.find(
      (h) => h.includes(alias) || alias.includes(h)
    );
    if (hit) return hit;
  }
  return undefined;
}

export function autoMapRefundColumns(
  rawHeaders: string[]
): RefundColumnMapping {
  const normalized = rawHeaders.map(normalizeHeaderKey).filter(Boolean);
  const mapping: RefundColumnMapping = {};
  for (const field of REFUND_FIELD_KEYS) {
    const match = autoMatchField(field, normalized);
    if (match) mapping[field] = match;
  }
  return mapping;
}

export function getRefundSheetHeaders(
  buffer: ArrayBuffer,
  sheetNames?: string[]
): string[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const targetNames =
    sheetNames && sheetNames.length > 0
      ? sheetNames.filter((n) => wb.Sheets[n])
      : [findRefundImportSheetName(wb)];
  const seen = new Set<string>();
  const headers: string[] = [];
  for (const name of targetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
    });
    const first = rows[0];
    if (!Array.isArray(first)) continue;
    for (const cell of first) {
      const raw = String(cell ?? "").trim();
      if (!raw) continue;
      const key = normalizeHeaderKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      headers.push(raw);
    }
  }
  return headers;
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

function parseGroupsFromSheet(
  sheet: XLSX.WorkSheet,
  pageKeyPrefix: string | null,
  mapping?: RefundColumnMapping
): ParsedRefundGroup[] {
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: true,
  });
  if (rawRows.length === 0) throw new Error("No data rows in sheet.");

  const normalized = rawRows.map(rowToNormalized);
  applyColumnMapping(normalized, mapping);
  forwardFillShopifyOrderColumns(normalized);

  const groups = groupNormalizedRowsByOrderId(normalized, pageKeyPrefix);

  const result: ParsedRefundGroup[] = [];
  for (const [groupKey, rows] of groups) {
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

    const pageKey =
      numericOrderId != null
        ? `${pageKeyPrefix ?? ""}${numericOrderId}`
        : groupKey;

    const orderDateIso = parseCellDate(orderDateRaw);

    result.push({
      pageKey,
      orderIdDisplay: orderIdDisplay || `Order ${pageKey}`,
      provenance: provenance || "—",
      orderDateIso,
      reason: reason || "—",
      productNames,
      numericOrderId,
      fichierSource,
    });
  }

  sortParsedRefundGroups(result);

  return result;
}

export function parseRefundSpreadsheetBuffer(
  buffer: ArrayBuffer,
  options?: ParseRefundSpreadsheetOptions
): ParsedRefundGroup[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const requested = (options?.sheetNames ?? []).filter(Boolean);
  const uniqueOrdered: string[] = [];
  const seen = new Set<string>();
  for (const n of requested) {
    if (!seen.has(n)) {
      seen.add(n);
      uniqueOrdered.push(n);
    }
  }

  const mapping = options?.columnMapping;

  if (uniqueOrdered.length === 0) {
    const sheetName = findRefundImportSheetName(wb);
    const sheet = wb.Sheets[sheetName];
    if (!sheet) throw new Error(`Sheet "${sheetName}" is missing from file.`);
    return parseGroupsFromSheet(sheet, null, mapping);
  }

  const multi = uniqueOrdered.length > 1;
  const merged: ParsedRefundGroup[] = [];
  for (const name of uniqueOrdered) {
    const sheet = wb.Sheets[name];
    if (!sheet) throw new Error(`Sheet "${name}" not found in file.`);
    const prefix = multi ? `${name} · ` : null;
    merged.push(...parseGroupsFromSheet(sheet, prefix, mapping));
  }
  sortParsedRefundGroups(merged);
  return merged;
}
