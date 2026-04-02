import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportTable } from "@/components/ImportTable";
import { NewImportDialog } from "@/components/NewImportDialog";
import { WebhookSettings } from "@/components/WebhookSettings";
import { supabase } from "@/integrations/supabase/client";

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

const SHOPIFY_CLAIM_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function Index() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (searchParams.has("shopify_oauth")) {
      navigate({ pathname: "/refund", search: `?${searchParams.toString()}` }, { replace: true });
      return;
    }
    const claim = searchParams.get("shopify_claim")?.trim() ?? "";
    const shop = searchParams.get("shop")?.trim() ?? "";
    if (claim && shop && SHOPIFY_CLAIM_UUID_RE.test(claim)) {
      navigate({ pathname: "/refund", search: `?${searchParams.toString()}` }, { replace: true });
    }
  }, [searchParams, navigate]);

  const [imports, setImports] = useState<Import[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(
    () => localStorage.getItem("webhook_url") || ""
  );

  const fetchImports = useCallback(async () => {
    const { data } = await supabase
      .from("imports")
      .select("*, import_images(id, file_name, file_url)")
      .order("created_at", { ascending: false });

    if (data) setImports(data as Import[]);
  }, []);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
              <Package className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-mono font-semibold tracking-tight">Image Imports</h1>
              <p className="text-xs text-muted-foreground">
                Upload and push product images to your store
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <WebhookSettings
              webhookUrl={webhookUrl}
              onWebhookUrlChange={setWebhookUrl}
            />
            <Button size="sm" onClick={() => setIsNewOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Import
            </Button>
          </div>
        </div>

        {/* Table */}
        <ImportTable
          imports={imports}
          webhookUrl={webhookUrl}
          onStatusChange={fetchImports}
        />
      </div>

      <NewImportDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onImportCreated={fetchImports}
      />
    </div>
  );
}
