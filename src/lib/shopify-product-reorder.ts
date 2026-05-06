import { supabase } from "@/integrations/supabase/client";

export type ReorderMedia = {
  id: string;
  alt: string | null;
  url: string | null;
  position: number;
  /** Color matched to the product's color option (Color/Couleur), null if unknown. */
  color?: string | null;
};

export type ReorderResult = {
  product_id: string;
  title?: string | null;
  moved: number;
  /** The Shopify option name treated as color, null when the product has none. */
  color_option?: string | null;
  /** "named" if Shopify's option was Color/Couleur/etc; "auto" if picked by score. */
  color_option_source?: "named" | "auto" | null;
  /** Color values in variant order — drives the grouping shown in the preview. */
  color_values?: string[] | null;
  /** Variant.image pins applied (apply mode) or planned (dry run). */
  variants_updated?: number;
  variant_updates_planned?: number;
  /**
   * Per-variant gallery associations: how many media-variant attachments were
   * appended (so each color variant only shows its own images on the storefront)
   * and how many wrong-color attachments were detached.
   */
  variant_media_appended?: number;
  variant_media_appends_planned?: number;
  variant_media_detached?: number;
  variant_media_detaches_planned?: number;
  /**
   * How many duplicate media items will be (or were) deleted from the product
   * to clean up filename collisions left over from prior re-imports.
   */
  media_deleted?: number;
  media_deletions_planned?: number;
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
