import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch every `shopify_import_images` row for an import, paginating around the
 * PostgREST default page cap (1000 by default). Use whenever an import may have
 * more than 1000 images — the cap silently truncates without an error otherwise.
 *
 * Pass the same `select` and order you'd use directly; the caller decides the
 * shape of the returned rows.
 */
export async function fetchAllImportImageRows<T = unknown>(
  supabase: SupabaseClient,
  opts: {
    importId: string;
    select: string;
    /** Defaults to ordering by created_at ascending — match the original UX. */
    orderBy?: { column: string; ascending: boolean };
    pageSize?: number;
    /** When set, only rows whose status is in this list are returned. */
    statusFilter?: string[];
  },
): Promise<{ ok: true; rows: T[] } | { ok: false; error: string }> {
  const order = opts.orderBy ?? { column: "created_at", ascending: true };
  const PAGE = opts.pageSize ?? 1000;
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("shopify_import_images")
      .select(opts.select)
      .eq("import_id", opts.importId)
      .order(order.column, { ascending: order.ascending })
      .range(from, from + PAGE - 1);
    if (opts.statusFilter && opts.statusFilter.length > 0) {
      q = q.in("status", opts.statusFilter);
    }
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    const batch = (data ?? []) as T[];
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  return { ok: true, rows: all };
}
