import { supabase } from "@/integrations/supabase/client";

export type SnapshotRow = {
  id: string;
  import_id: string;
  brand_id: string;
  shopify_product_id: string;
  shopify_product_name: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  gallery: Array<{ id?: string; url: string; alt: string | null }>;
  created_at: string;
  restored_at: string | null;
};

export async function takeImportSnapshot(args: {
  brandId: string;
  importId: string;
  productIds: string[];
}): Promise<{ ok: true; snapshots: number } | { ok: false; error: string }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    snapshots?: number;
  }>("shopify-import-snapshot", {
    body: {
      brand_id: args.brandId,
      import_id: args.importId,
      product_ids: args.productIds,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Snapshot failed" };
  return { ok: true, snapshots: data.snapshots ?? 0 };
}

export async function listImportSnapshots(
  importId: string,
): Promise<{ ok: true; snapshots: SnapshotRow[] } | { ok: false; error: string }> {
  // RLS allows brand owner / active brand_user to read their own snapshots, so we can hit
  // the table directly without going through an Edge Function.
  const { data, error } = await supabase
    .from("shopify_import_snapshots")
    .select(
      "id, import_id, brand_id, shopify_product_id, shopify_product_name, featured_image_url, featured_image_alt, gallery, created_at, restored_at",
    )
    .eq("import_id", importId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, snapshots: (data ?? []) as unknown as SnapshotRow[] };
}

export async function restoreImportSnapshot(args: {
  brandId: string;
  importId: string;
}): Promise<
  | { ok: true; restored: number; failed: number; errors: Array<{ product_id: string; message: string }> }
  | { ok: false; error: string }
> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    restored?: number;
    failed?: number;
    errors?: Array<{ product_id: string; message: string }>;
  }>("shopify-import-restore", {
    body: { brand_id: args.brandId, import_id: args.importId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Restore failed" };
  return {
    ok: true,
    restored: data.restored ?? 0,
    failed: data.failed ?? 0,
    errors: data.errors ?? [],
  };
}
