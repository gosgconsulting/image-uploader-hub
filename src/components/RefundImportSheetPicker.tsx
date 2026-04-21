import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { RefundWorkbookSheetMeta } from "@/types/refundSpreadsheet";

interface RefundImportSheetPickerProps {
  meta: RefundWorkbookSheetMeta;
  pivotSet: Set<string>;
  selectedSheetNames: Set<string>;
  toggleSheet: (name: string, checked: boolean) => void;
  disabled: boolean;
}

export function RefundImportSheetPicker({
  meta,
  pivotSet,
  selectedSheetNames,
  toggleSheet,
  disabled,
}: RefundImportSheetPickerProps) {
  return (
    <div className="space-y-2">
      <Label className="font-mono text-xs uppercase tracking-wider">Tabs to import</Label>
      <ul className="max-h-44 overflow-y-auto rounded-md border border-border p-2 space-y-2">
        {meta.sheetNames.map((name, idx) => {
          const isPivot = pivotSet.has(name);
          const id = `import-sheet-${idx}`;
          return (
            <li key={`${idx}-${name}`} className="flex items-start gap-2">
              <Checkbox
                id={id}
                checked={selectedSheetNames.has(name)}
                disabled={isPivot || disabled}
                onCheckedChange={(v) => toggleSheet(name, v === true)}
                className="mt-0.5"
              />
              <label
                htmlFor={id}
                className={`text-sm leading-snug cursor-pointer select-none ${
                  isPivot ? "text-muted-foreground cursor-not-allowed" : ""
                }`}
              >
                <span className="font-mono break-all">{name}</span>
                {isPivot && (
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Pivot summary — cannot be imported
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
