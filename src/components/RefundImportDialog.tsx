import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RefundImportSheetPicker } from "@/components/RefundImportSheetPicker";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Refund } from "@/types/refund";
import {
  parseRefundSpreadsheetBuffer,
  groupsToRefundRows,
} from "@/utils/parseRefundSpreadsheet";
import { useRefundImportWorkbook } from "@/pages/refund/useRefundImportWorkbook";

interface RefundImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (rows: Refund[]) => void | Promise<void>;
}

const ACCEPT_SHEET =
  ".csv,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv";

function isSpreadsheetFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".csv") ||
    n.endsWith(".xlsx") ||
    n.endsWith(".xls") ||
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
export function RefundImportDialog({
  open,
  onOpenChange,
  onImported,
}: RefundImportDialogProps) {
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const {
    meta,
    scanning,
    pivotSet,
    selectedSheetNames,
    toggleSheet,
    namesToImport,
    showSheetPicker,
  } = useRefundImportWorkbook(sheetFile);

  const reset = useCallback(() => {
    setSheetFile(null);
    setPdfFile(null);
    setBusy(false);
  }, []);

  const handleClose = (val: boolean) => {
    if (!busy) {
      onOpenChange(val);
      if (!val) reset();
    }
  };

  const handleSubmit = async () => {
    if (!sheetFile) {
      toast({
        title: "Spreadsheet required",
        description: "Upload an Excel or CSV file.",
        variant: "destructive",
      });
      return;
    }
    if (namesToImport.length === 0) {
      toast({
        title: "Select at least one tab",
        description: "Choose which worksheet(s) to import.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const buffer = await sheetFile.arrayBuffer();
      const groups = parseRefundSpreadsheetBuffer(buffer, {
        sheetNames: namesToImport,
      });
      let pdfUrl: string | undefined;
      if (pdfFile) {
        const safe =
          pdfFile.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200) || "document.pdf";
        const path = `${crypto.randomUUID()}-${safe}`;
        const { error: uploadError } = await supabase.storage
          .from("refund-pdfs")
          .upload(path, pdfFile, {
            contentType: pdfFile.type || "application/pdf",
            upsert: false,
          });
        if (uploadError) {
          throw new Error(uploadError.message);
        }
        const { data: urlData } = supabase.storage.from("refund-pdfs").getPublicUrl(path);
        pdfUrl = urlData.publicUrl;
      }
      const rows = groupsToRefundRows(groups, pdfUrl);
      await onImported(rows);
      toast({
        title: "Import added",
        description: `${rows.length} row(s) from spreadsheet (grouped by page).`,
      });
      onOpenChange(false);
      reset();
    } catch (e) {
      toast({
        title: "Could not read file",
        description: e instanceof Error ? e.message : "Invalid spreadsheet.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const importDisabled =
    busy || !sheetFile || scanning || namesToImport.length === 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono">New import</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel or CSV <span className="text-destructive">*</span>
            </Label>
            <input
              type="file"
              accept={ACCEPT_SHEET}
              className="text-sm w-full file:mr-3 file:rounded file:border file:bg-muted file:px-2 file:py-1"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && isSpreadsheetFile(f)) setSheetFile(f);
                else if (f) {
                  toast({
                    title: "Wrong file type",
                    description: "Use .csv, .xlsx, or .xls.",
                    variant: "destructive",
                  });
                }
              }}
            />
            {sheetFile && (
              <p className="text-xs text-muted-foreground font-mono">{sheetFile.name}</p>
            )}
            {scanning && (
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
                Reading tabs…
              </p>
            )}
          </div>

          {showSheetPicker && meta && (
            <RefundImportSheetPicker
              meta={meta}
              pivotSet={pivotSet}
              selectedSheetNames={selectedSheetNames}
              toggleSheet={toggleSheet}
              disabled={busy}
            />
          )}

          <div className="space-y-2">
            <Label className="font-mono text-xs uppercase tracking-wider flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              PDF <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <input
              type="file"
              accept=".pdf,application/pdf"
              className="text-sm w-full file:mr-3 file:rounded file:border file:bg-muted file:px-2 file:py-1"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f && isPdfFile(f)) setPdfFile(f);
                else if (f) {
                  toast({
                    title: "Wrong file type",
                    description: "Use a PDF file.",
                    variant: "destructive",
                  });
                }
              }}
            />
            {pdfFile && (
              <p className="text-xs text-muted-foreground font-mono">{pdfFile.name}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Pick tabs when there are several; pivot sheets are disabled. Multiple tabs merge;{" "}
            <span className="font-mono">page</span> is prefixed by tab. Columns:{" "}
            <span className="font-mono">numero_commande</span>, <span className="font-mono">provenance</span>,{" "}
            <span className="font-mono">date</span>, <span className="font-mono">nom_produit</span>,{" "}
            <span className="font-mono">raison_retour</span>, <span className="font-mono">lien_shopify</span>.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={importDisabled}>
            {busy ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5 mr-2" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
