import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  REFUND_FIELD_KEYS,
  type RefundColumnMapping,
  type RefundFieldKey,
} from "@/types/refundSpreadsheet";

const FIELD_LABELS: Record<RefundFieldKey, { label: string; required: boolean; hint: string }> = {
  numero_commande: { label: "Order ID", required: true, hint: "numero_commande" },
  provenance: { label: "Source of Order", required: false, hint: "provenance" },
  date: { label: "Order Date", required: false, hint: "date" },
  nom_produit: { label: "Product Name", required: false, hint: "nom_produit" },
  raison_retour: { label: "Reason of Return", required: false, hint: "raison_retour" },
  lien_shopify: { label: "Shopify Link", required: false, hint: "lien_shopify" },
};

const NONE_VALUE = "__none__";

interface RefundImportMappingProps {
  headers: string[];
  mapping: RefundColumnMapping;
  autoMapping: RefundColumnMapping;
  onChange: (next: RefundColumnMapping) => void;
  disabled?: boolean;
}

export function RefundImportMapping({
  headers,
  mapping,
  autoMapping,
  onChange,
  disabled,
}: RefundImportMappingProps) {
  const setField = (field: RefundFieldKey, value: string) => {
    const next: RefundColumnMapping = { ...mapping };
    if (value === NONE_VALUE) {
      delete next[field];
    } else {
      next[field] = value;
    }
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Map your file's columns to our fields. Auto-detected matches are filled in;
        adjust any unmapped or wrong fields with the dropdowns.
      </p>

      <div className="rounded-md border divide-y">
        <div className="grid grid-cols-[1fr_1fr] gap-3 px-3 py-2 bg-muted/50">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Our field
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Source column
          </span>
        </div>

        {REFUND_FIELD_KEYS.map((field) => {
          const meta = FIELD_LABELS[field];
          const current = mapping[field];
          const auto = autoMapping[field];
          const isAuto = current && auto && current === auto;
          const isMissing = meta.required && !current;
          return (
            <div
              key={field}
              className="grid grid-cols-[1fr_1fr] gap-3 px-3 py-2 items-center"
            >
              <div className="space-y-0.5">
                <Label className="font-mono text-xs flex items-center gap-1.5">
                  {meta.label}
                  {meta.required && <span className="text-destructive">*</span>}
                  {isAuto && (
                    <CheckCircle2
                      className="h-3 w-3 text-emerald-500"
                      aria-label="Auto-mapped"
                    />
                  )}
                  {isMissing && (
                    <AlertCircle
                      className="h-3 w-3 text-destructive"
                      aria-label="Required"
                    />
                  )}
                </Label>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {meta.hint}
                </p>
              </div>
              <Select
                value={current ?? NONE_VALUE}
                onValueChange={(v) => setField(field, v)}
                disabled={disabled}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="— Not mapped —" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE} className="text-xs italic">
                    — Not mapped —
                  </SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h} className="text-xs font-mono">
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
