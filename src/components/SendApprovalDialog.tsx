import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

interface ImportImage {
  id: string;
  file_name: string;
  file_url: string;
}

interface Import {
  id: string;
  batch_name: string | null;
  status: string;
  webhook_url: string | null;
  created_at: string;
  import_images: ImportImage[];
}

export interface WebhookProduct {
  id: string;
  file_name: string;
  file_url: string;
  productid: string;
  productname: string;
}

interface MappedProduct {
  shopify_product_name: string;
  sku: string;
  productid: string;
  images: { file_name: string; file_url: string }[];
}

interface SendApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imp: Import | null;
  onApprove: (imp: Import, products: WebhookProduct[]) => void;
  isSending: boolean;
}

const MAP_DATA_WEBHOOK_URL =
  "https://n8n-main-instance-production-8d68.up.railway.app/webhook/mapdata";

export function SendApprovalDialog({
  open,
  onOpenChange,
  imp,
  onApprove,
  isSending,
}: SendApprovalDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mappedProducts, setMappedProducts] = useState<MappedProduct[]>([]);
  const [rawProducts, setRawProducts] = useState<WebhookProduct[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open || !imp) {
      setMappedProducts([]);
      setRawProducts([]);
      return;
    }

    const fetchMapData = async () => {
      setLoading(true);
      try {
        const response = await fetch(MAP_DATA_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            import_id: imp.id,
            batch_name: imp.batch_name,
            status: imp.status,
            webhook_url: imp.webhook_url,
            created_at: imp.created_at,
            images: imp.import_images.map((img) => ({
              id: img.id,
              file_name: img.file_name,
              file_url: img.file_url,
            })),
          }),
        });

        const data = await response.json();
        const { filtered, grouped } = parseWebhookResponse(data);

        setRawProducts(filtered);

        if (grouped.length > 0) {
          setMappedProducts(grouped);
        } else {
          setMappedProducts(buildFallbackProducts(imp));
        }
      } catch {
        toast({
          title: "Failed to fetch product data",
          description: "Using placeholder data instead.",
          variant: "destructive",
        });
        setRawProducts([]);
        setMappedProducts(buildFallbackProducts(imp));
      } finally {
        setLoading(false);
      }
    };

    fetchMapData();
  }, [open, imp?.id]);

  if (!imp) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">
            Review & Send — {imp.batch_name || "Untitled"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-3" />
            <p className="text-sm font-mono">Fetching product data…</p>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">
                      Shopify Product Name
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">
                      SKU
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">
                      Feature Image
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase tracking-wider">
                      Gallery
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedProducts.map((product, index) => {
                    console.log('product',product);
                    
                    const featureImage = product.images[0] || null;
                    const galleryImages = product.images.slice(1);

                    return (
                      <TableRow key={index}>
                        <TableCell className="text-sm font-medium max-w-[200px]">
                          <span className="line-clamp-2">
                            {product.shopify_product_name}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {product.sku}
                        </TableCell>
                        <TableCell>
                          {featureImage ? (
                            <div className="h-14 w-14 rounded border bg-muted overflow-hidden">
                              <img
                                src={featureImage.file_url}
                                alt={featureImage.file_name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              None
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {galleryImages.length > 0 ? (
                            <div className="flex -space-x-2">
                              {galleryImages.slice(0, 4).map((img, i) => (
                                <div
                                  key={i}
                                  className="h-10 w-10 rounded border-2 border-card bg-muted overflow-hidden"
                                >
                                  <img
                                    src={img.file_url}
                                    alt={img.file_name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                              {galleryImages.length > 4 && (
                                <div className="h-10 w-10 rounded border-2 border-card bg-muted flex items-center justify-center">
                                  <span className="text-[10px] font-mono text-muted-foreground">
                                    +{galleryImages.length - 4}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              None
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter className="pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onApprove(imp, rawProducts)}
            disabled={isSending || loading}
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending…
              </>
            ) : (
              `Approve & Send (${mappedProducts.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function parseWebhookResponse(data: unknown): {
  filtered: WebhookProduct[];
  grouped: MappedProduct[];
} {
  try {
    // Response shape: { products: [...] } OR [{ products: [...] }]
    const raw = data as any;
    let products: WebhookProduct[] = [];

    if (Array.isArray(raw?.products)) {
      products = raw.products;
    } else if (Array.isArray(raw) && Array.isArray(raw[0]?.products)) {
      products = raw[0].products;
    }

    // Filter out items that don't have a productid
    const filtered = products.filter((p) => p.productid);

    if (filtered.length === 0) return { filtered: [], grouped: [] };

    // Group by productid so each unique product becomes one table row
    const groupedMap = new Map<string, WebhookProduct[]>();
    for (const item of filtered) {
      const key = item.productid;
      if (!groupedMap.has(key)) groupedMap.set(key, []);
      groupedMap.get(key)!.push(item);
    }

    const grouped = Array.from(groupedMap.values()).map((group) => ({
      shopify_product_name: group[0].productname,
      sku: group[0].file_name,
      productid: group[0].productid,
      images: group.map((p) => ({
        file_name: p.file_name,
        file_url: p.file_url,
      })),
    }));

    return { filtered, grouped };
  } catch {
    return { filtered: [], grouped: [] };
  }
}

function buildFallbackProducts(imp: Import): MappedProduct[] {
  return [
    {
      shopify_product_name: imp.batch_name || "Untitled Product",
      sku: `SKU-${imp.id.slice(0, 6).toUpperCase()}`,
      productid: "",
      images: imp.import_images.map((img) => ({
        file_name: img.file_name,
        file_url: img.file_url,
      })),
    },
  ];
}
