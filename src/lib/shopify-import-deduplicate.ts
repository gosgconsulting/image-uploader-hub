import { supabase } from "@/integrations/supabase/client";

export type DedupReasonCode =
  | "color_not_in_variants"
  | "duplicate_filename"
  | "ref_mismatch"
  | "unparseable_filename";

export type DedupCandidate = {
  product_id: string;
  product_title: string;
  media_id: string;
  filename: string;
  url: string | null;
  detected_color: string | null;
  reason_code: DedupReasonCode;
  reason: string;
  /** Anthropic confidence 0..1 when AI review ran. */
  confidence?: number;
};

export type DedupScanResponse =
  | {
      ok: true;
      processed: number;
      ai_reviewed: boolean;
      candidates: DedupCandidate[];
      message?: string;
    }
  | { ok: false; error: string };

export type DedupApplyResponse =
  | {
      ok: true;
      deleted: number;
      orphan_media_ids: string[];
      errors: Array<{ product_id: string; error: string }>;
    }
  | { ok: false; error: string };

async function authedInvoke<T>(
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { data: null, error: "You must be signed in." };

  const { data, error } = await supabase.functions.invoke<T>(
    "shopify-import-deduplicate",
    {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    },
  );
  if (error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx instanceof Response) {
      try {
        const parsed = await ctx.clone().json();
        if (parsed?.error) return { data: null, error: parsed.error };
      } catch {
        /* fall through */
      }
    }
    return { data: null, error: error.message };
  }
  return { data: data ?? null, error: null };
}

export async function scanImportForDuplicates(
  brandId: string,
  importId: string,
): Promise<DedupScanResponse> {
  const { data, error } = await authedInvoke<{
    ok?: boolean;
    error?: string;
    processed?: number;
    ai_reviewed?: boolean;
    candidates?: DedupCandidate[];
    message?: string;
  }>({ brand_id: brandId, import_id: importId, dry_run: true });

  if (error) return { ok: false, error };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Scan failed" };
  return {
    ok: true,
    processed: data.processed ?? 0,
    ai_reviewed: data.ai_reviewed ?? false,
    candidates: data.candidates ?? [],
    message: data.message,
  };
}

export async function applyDeduplicate(
  brandId: string,
  importId: string,
  mediaIds: string[],
): Promise<DedupApplyResponse> {
  const { data, error } = await authedInvoke<{
    ok?: boolean;
    error?: string;
    deleted?: number;
    orphan_media_ids?: string[];
    errors?: Array<{ product_id: string; error: string }>;
  }>({
    brand_id: brandId,
    import_id: importId,
    dry_run: false,
    media_ids: mediaIds,
  });

  if (error) return { ok: false, error };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Apply failed" };
  return {
    ok: true,
    deleted: data.deleted ?? 0,
    orphan_media_ids: data.orphan_media_ids ?? [],
    errors: data.errors ?? [],
  };
}
