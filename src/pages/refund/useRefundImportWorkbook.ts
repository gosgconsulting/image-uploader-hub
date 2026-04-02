import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { getWorkbookSheetMeta } from "@/utils/parseRefundSpreadsheet";
import type { RefundWorkbookSheetMeta } from "@/types/refundSpreadsheet";

export function useRefundImportWorkbook(sheetFile: File | null) {
  const [meta, setMeta] = useState<RefundWorkbookSheetMeta | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selectedSheetNames, setSelectedSheetNames] = useState<Set<string>>(
    () => new Set()
  );
  const { toast } = useToast();

  useEffect(() => {
    if (!sheetFile) {
      setMeta(null);
      setSelectedSheetNames(new Set());
      return;
    }

    let cancelled = false;
    setScanning(true);

    void sheetFile.arrayBuffer().then((buffer) => {
      if (cancelled) return;
      try {
        const m = getWorkbookSheetMeta(buffer);
        setMeta(m);
        setSelectedSheetNames(new Set(m.suggestedImportNames));
      } catch (e) {
        setMeta(null);
        setSelectedSheetNames(new Set());
        toast({
          title: "Could not read workbook",
          description: e instanceof Error ? e.message : "Invalid Excel file.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setScanning(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [sheetFile, toast]);

  const pivotSet = useMemo(
    () => new Set(meta?.pivotSheetNames ?? []),
    [meta?.pivotSheetNames]
  );

  const toggleSheet = useCallback(
    (name: string, checked: boolean) => {
      if (pivotSet.has(name)) return;
      setSelectedSheetNames((prev) => {
        const next = new Set(prev);
        if (checked) next.add(name);
        else next.delete(name);
        return next;
      });
    },
    [pivotSet]
  );

  const namesToImport = useMemo(() => {
    if (!meta) return [];
    if (meta.sheetNames.length <= 1) return [...meta.sheetNames];
    return [...selectedSheetNames];
  }, [meta, selectedSheetNames]);

  const showSheetPicker = Boolean(meta && meta.sheetNames.length > 1);

  return {
    meta,
    scanning,
    pivotSet,
    selectedSheetNames,
    toggleSheet,
    namesToImport,
    showSheetPicker,
  };
}
