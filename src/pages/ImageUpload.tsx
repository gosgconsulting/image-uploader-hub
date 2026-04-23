import { useState, useEffect, useCallback } from "react";
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

function getInitialWebhookUrl(): string {
  const stored = localStorage.getItem("webhook_url");
  if (stored !== null && stored.trim() !== "") return stored.trim();
  const envUrl = import.meta.env.VITE_WEBHOOK_URL;
  if (typeof envUrl === "string" && envUrl.trim() !== "") return envUrl.trim();
  return "";
}

export default function ImageUpload() {
  const [imports, setImports] = useState<Import[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(() => getInitialWebhookUrl());

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
          <Button size="sm" onClick={() => setIsNewOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Import
          </Button>
        </div>
      </div>

      <ImportTable
        imports={imports}
        webhookUrl={webhookUrl}
        onStatusChange={fetchImports}
      />

      <NewImportDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        onImportCreated={fetchImports}
      />
    </div>
  );
}
