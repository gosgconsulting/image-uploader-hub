import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ImportTable,
  parsePreviewImagesJson,
  type ImportListRow,
} from "@/components/ImportTable";
import { NewImportDialog } from "@/components/NewImportDialog";
import { WebhookSettings } from "@/components/WebhookSettings";
import { supabase } from "@/integrations/supabase/client";
import type { DashboardOutletContext } from "@/types/dashboardOutletContext";

function getInitialWebhookUrl(): string {
  const stored = localStorage.getItem("webhook_url");
  if (stored !== null && stored.trim() !== "") return stored.trim();
  const envUrl = import.meta.env.VITE_WEBHOOK_URL;
  if (typeof envUrl === "string" && envUrl.trim() !== "") return envUrl.trim();
  return "";
}

function coerceImageCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export default function ImageUpload() {
  const { importBrandId } = useOutletContext<DashboardOutletContext>();
  const [imports, setImports] = useState<ImportListRow[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => getInitialWebhookUrl());

  const fetchImports = useCallback(async () => {
    if (!importBrandId) {
      setImports([]);
      return;
    }
    const { data, error } = await supabase
      .from("imports_with_list_preview")
      .select("*")
      .eq("brand_id", importBrandId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("fetchImports", error);
      setImports([]);
      return;
    }

    if (!data) {
      setImports([]);
      return;
    }

    setImports(
      data.map((row) => ({
        id: row.id,
        batch_name: row.batch_name,
        status: row.status,
        webhook_url: row.webhook_url,
        created_at: row.created_at,
        image_count: coerceImageCount(row.image_count),
        preview_images: parsePreviewImagesJson(row.preview_images),
      })),
    );
  }, [importBrandId]);

  useEffect(() => {
    fetchImports();
  }, [fetchImports]);

  return (
    <div className="px-8 py-10">
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
          <Button
            size="sm"
            onClick={() => setIsNewOpen(true)}
            disabled={!importBrandId}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Import
          </Button>
        </div>
      </div>

      {!importBrandId ? (
        <Alert className="mb-6 max-w-lg">
          <AlertTitle className="font-mono text-sm">Select a brand</AlertTitle>
          <AlertDescription className="text-xs">
            Choose <span className="font-medium">JIJI Studio</span> (or another brand) in the sidebar
            to view and create image imports for that brand.
          </AlertDescription>
        </Alert>
      ) : null}

      <ImportTable
        imports={imports}
        webhookUrl={webhookUrl}
        onStatusChange={fetchImports}
      />

      <NewImportDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onImportCreated={fetchImports}
        brandId={importBrandId}
      />
    </div>
  );
}
