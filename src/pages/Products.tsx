import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { ShoppingBag, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useShopifyConnection } from "@/components/ShopifyConnectionProvider";
import { useToast } from "@/hooks/use-toast";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";
import {
  fetchShopifyProducts,
  syncShopifyProducts,
  type ShopifyProductRow,
} from "@/lib/shopify-products-db";

export default function Products() {
  const { importBrandId } = useOutletContext<DashboardOutletContext>();
  const { shopifyShop } = useShopifyConnection();
  const { toast } = useToast();
  const [products, setProducts] = useState<ShopifyProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await fetchShopifyProducts(importBrandId);
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      setProducts([]);
      return;
    }
    setProducts(data);
  }, [importBrandId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const handleSync = useCallback(async () => {
    if (!importBrandId) return;
    const shop = shopifyShop.trim();
    if (!shop) {
      toast({
        title: "Connect Shopify first",
        description: "Save the brand's Shopify shop domain under API.",
        variant: "destructive",
      });
      return;
    }
    setSyncing(true);
    const result = await syncShopifyProducts({ brandId: importBrandId, shopDomain: shop });
    setSyncing(false);
    if (result.ok === false) {
      toast({
        title: "Sync failed",
        description: result.error,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Products synced",
      description: `${result.synced} synced, ${result.removed} removed${
        result.truncated ? " (truncated — run again)" : ""
      }.`,
    });
    void loadProducts();
  }, [importBrandId, shopifyShop, toast, loadProducts]);

  const lastSync = products
    .map((p) => p.synced_at)
    .sort()
    .pop();

  return (
    <div className="px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-mono font-semibold tracking-tight">Products</h1>
            <p className="text-xs text-muted-foreground">
              Shopify product list cached per brand
              {lastSync ? ` · last sync ${new Date(lastSync).toLocaleString()}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => void handleSync()}
            disabled={!importBrandId || syncing}
          >
            {syncing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            )}
            {syncing ? "Syncing…" : "Sync"}
          </Button>
        </div>
      </div>

      {!importBrandId ? (
        <Alert className="mb-6 max-w-lg">
          <AlertTitle className="font-mono text-sm">Select a brand</AlertTitle>
          <AlertDescription className="text-xs">
            Choose a brand (e.g. <span className="font-medium">Frnch</span>) in the sidebar
            to view its products.
          </AlertDescription>
        </Alert>
      ) : null}

      {loadError ? (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle className="font-mono text-sm">Could not load products</AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{loadError}</span>
            <Button size="sm" variant="outline" onClick={() => void loadProducts()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="font-mono text-xs">Loading products…</span>
        </div>
      ) : products.length > 0 ? (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 font-mono text-xs"></TableHead>
                <TableHead className="font-mono text-xs">Title</TableHead>
                <TableHead className="font-mono text-xs">Handle</TableHead>
                <TableHead className="font-mono text-xs">Type</TableHead>
                <TableHead className="font-mono text-xs">Vendor</TableHead>
                <TableHead className="font-mono text-xs">Status</TableHead>
                <TableHead className="font-mono text-xs text-right">Variants</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.shopify_product_id}>
                  <TableCell>
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="h-9 w-9 rounded object-cover bg-muted"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-9 w-9 rounded bg-muted" />
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {p.handle ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.product_type || "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.vendor || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    <Badge
                      variant={p.status === "active" ? "default" : "secondary"}
                      className="font-mono text-[10px]"
                    >
                      {p.status ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-right">
                    {p.variant_count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : importBrandId && !loadError ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <ShoppingBag className="h-8 w-8" aria-hidden />
          <p className="font-mono text-sm">No products yet.</p>
          <p className="font-mono text-xs">
            Click <span className="font-medium">Sync</span> to import from Shopify.
          </p>
        </div>
      ) : null}
    </div>
  );
}
