import { useState, useEffect } from "react";
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
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && pdfUrl) {
      setHasError(false);
      setIsLoading(true);
    } else if (open && !pdfUrl) {
      setHasError(true);
      setIsLoading(false);
    }
  }, [open, pdfUrl]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  // Use PDF.js viewer for full PDF viewing experience
  const getPdfViewerUrl = () => {
    if (!pdfUrl) return "";
    // Encode the PDF URL and use PDF.js viewer
    const encodedUrl = encodeURIComponent(pdfUrl);
    return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodedUrl}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="font-mono">Refund PDF Preview</DialogTitle>
        </DialogHeader>
        <div className="mt-4 w-full h-[65vh] border rounded-md overflow-hidden relative">
          {!pdfUrl ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="font-mono text-sm">No PDF available</p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <p className="font-mono text-sm mb-2">Unable to load PDF</p>
              <p className="font-mono text-xs text-muted-foreground/70 text-center mb-4">
                The PDF file may be unavailable, the link is invalid, or the file is not a valid PDF.
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline font-mono"
              >
                Try opening in new tab →
              </a>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                  <p className="font-mono text-sm text-muted-foreground">Loading PDF...</p>
                </div>
              )}
              <iframe
                src={getPdfViewerUrl()}
                className="w-full h-full border-0"
                title="PDF Preview"
                onError={handleIframeError}
                onLoad={handleIframeLoad}
              />
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
