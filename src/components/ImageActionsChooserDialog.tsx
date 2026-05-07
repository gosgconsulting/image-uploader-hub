import { Sparkles, ArrowDownToLine, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ImageAction = "deduplicate" | "reorder-position";

interface ImageActionsChooserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string | null;
  onPick: (action: ImageAction) => void;
}

export function ImageActionsChooserDialog({
  open,
  onOpenChange,
  batchName,
  onPick,
}: ImageActionsChooserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Image actions — {batchName || "Import"}
          </DialogTitle>
          <DialogDescription>
            Pick a follow-up action to run against the products this import is
            attached to.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 py-2">
          <button
            type="button"
            onClick={() => onPick("deduplicate")}
            className="group flex items-start gap-3 rounded-md border bg-card p-4 text-left hover:border-foreground/40 hover:bg-muted/40 transition-colors"
          >
            <div className="mt-0.5 rounded-md border bg-background p-2">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm">Deduplicate</div>
              <div className="text-xs text-muted-foreground">
                Scan each product and flag misattributed media — wrong-color
                photos, duplicates, files belonging to a different product.
                Optional Claude review via the project's LLM Gateway.
              </div>
            </div>
            <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-foreground" />
          </button>

          <button
            type="button"
            onClick={() => onPick("reorder-position")}
            className="group flex items-start gap-3 rounded-md border bg-card p-4 text-left hover:border-foreground/40 hover:bg-muted/40 transition-colors"
          >
            <div className="mt-0.5 rounded-md border bg-background p-2">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm">Reorder position</div>
              <div className="text-xs text-muted-foreground">
                Move this batch's images to the start or end of each product's
                gallery. Internal 1-2-3 / front-then-back order is preserved
                inside the batch.
              </div>
            </div>
            <ChevronRight className="h-4 w-4 mt-1 text-muted-foreground group-hover:text-foreground" />
          </button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
