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

export interface RefundWorkbookSheetMeta {
  sheetNames: string[];
  pivotSheetNames: string[];
  suggestedImportNames: string[];
}

export const REFUND_FIELD_KEYS = [
  "numero_commande",
  "provenance",
  "date",
  "nom_produit",
  "raison_retour",
  "lien_shopify",
] as const;

export type RefundFieldKey = (typeof REFUND_FIELD_KEYS)[number];

export type RefundColumnMapping = Partial<Record<RefundFieldKey, string>>;

export interface ParseRefundSpreadsheetOptions {
  sheetNames?: string[];
  columnMapping?: RefundColumnMapping;
}
