import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
}

export function ImagePreviewDialog({ open, onOpenChange, images, batchName }: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-mono">{batchName}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <div className="aspect-square rounded-md overflow-hidden border bg-muted">
                <img
                  src={img.file_url}
                  alt={img.file_name}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="mt-1.5 text-[11px] font-mono text-muted-foreground truncate">
                {img.file_name}
              </p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
