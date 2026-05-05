import { supabase } from "@/integrations/supabase/client";

export type ReorderMedia = {
  id: string;
  alt: string | null;
  url: string | null;
  position: number;
};

export type ReorderResult = {
  product_id: string;
  title?: string | null;
  moved: number;
  error?: string;
  current?: ReorderMedia[];
  proposed?: ReorderMedia[];
};

export type ReorderResponse =
  | {
      ok: true;
      dry_run: boolean;
      processed: number;
      results: ReorderResult[];
      message?: string;
    }
  | { ok: false; error: string };

export async function reorderImportMedia(
  brandId: string,
  importId: string,
  options?: { dryRun?: boolean },
): Promise<ReorderResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "You must be signed in." };

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    error?: string;
    dry_run?: boolean;
    processed?: number;
    results?: ReorderResult[];
    message?: string;
  }>("shopify-product-media-reorder", {
    body: {
      brand_id: brandId,
      import_id: importId,
      dry_run: options?.dryRun === true,
    },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx instanceof Response) {
      try {
        const body = await ctx.clone().json();
        if (body?.error) return { ok: false, error: body.error };
      } catch {
        /* fall through */
      }
    }
    return { ok: false, error: error.message };
  }
  if (!data?.ok) return { ok: false, error: data?.error ?? "Reorder failed" };
  return {
    ok: true,
    dry_run: data.dry_run ?? false,
    processed: data.processed ?? 0,
    results: data.results ?? [],
    message: data.message,
  };
}
