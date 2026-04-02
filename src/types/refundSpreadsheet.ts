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

export interface ParseRefundSpreadsheetOptions {
  sheetNames?: string[];
}
