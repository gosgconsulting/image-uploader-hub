import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ViewPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfUrl: string;
}

export function ViewPdfDialog({ open, onOpenChange, pdfUrl }: ViewPdfDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-mono">Refund PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4 w-full h-[70vh] border rounded-md overflow-hidden">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="font-mono text-sm">No PDF available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
