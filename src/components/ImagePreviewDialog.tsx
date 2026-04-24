import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  VirtualImageGrid,
  usePreviewGridColumns,
} from "@/components/VirtualImageGrid";

interface Image {
  id: string;
  file_name: string;
  file_url: string;
}

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: Image[];
  batchName: string;
  loading?: boolean;
}

export function ImagePreviewDialog({
  open,
  onOpenChange,
  images,
  batchName,
  loading = false,
}: ImagePreviewDialogProps) {
  const columns = usePreviewGridColumns();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono">{batchName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-xs font-mono">Loading images…</p>
          </div>
        ) : images.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No images in this import.
          </p>
        ) : (
          <VirtualImageGrid
            items={images}
            columns={columns}
            estimateRowHeight={280}
            scrollClassName="overflow-y-auto min-h-0 max-h-[55vh] mt-4 pr-1"
            gridClassName="gap-3"
            renderCell={(img) => (
              <div className="group relative">
                <div className="aspect-square rounded-md overflow-hidden border bg-muted">
                  <img
                    src={img.file_url}
                    alt={img.file_name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="mt-1.5 text-[11px] font-mono text-muted-foreground truncate">
                  {img.file_name}
                </p>
              </div>
            )}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
