/**
 * Recompress staged import images that haven't been pushed to Shopify yet.
 *
 * Scope: rows in `shopify_import_images` with `shopify_media_id IS NULL` — i.e.
 * the images we *want to import* but haven't yet. Images that already landed on
 * Shopify are left alone; replacing the storage blob wouldn't update the copy
 * Shopify already cached, and Shopify accepted them at their original size, so
 * touching them here only risks drift.
 *
 * Why client-side: the existing resize pipeline (`image-resize.ts`) runs in the
 * browser using Canvas/OffscreenCanvas. Re-implementing that server-side in Deno
 * means pulling in WASM image libs and fighting edge-function timeouts, so we just
 * download the file, re-encode it locally, and overwrite the storage object.
 *
 * The storage path is derived from `file_url` so the public URL stays valid after
 * the upsert — the next send-to-Shopify run pulls the smaller payload.
 */

import { supabase } from "@/integrations/supabase/client";
import { fetchAllImportImageRows } from "@/lib/fetch-all-import-images";
import { resizeImageForShopify } from "@/lib/image-resize";

const STORAGE_BUCKET = "shopify-import-images";
const PATH_MARKER = `/${STORAGE_BUCKET}/`;
/** Default threshold above which we bother running the recompress. */
const DEFAULT_MIN_SIZE_BYTES = 1_000_000; // 1 MB

interface ImportImageRow {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  shopify_media_id: string | null;
}

export interface CompressItemResult {
  id: string;
  name: string;
  oldSize: number;
  newSize: number;
  ok: boolean;
  skipped?: "small" | "no-path" | "no-shrink" | "decode-failed";
  error?: string;
}

export interface CompressProgress {
  done: number;
  total: number;
  currentName: string;
}

export interface CompressSummary {
  total: number;
  processed: number;
  skipped: number;
  failed: number;
  bytesSaved: number;
}

export interface CompressOptions {
  /** Don't touch images already at or below this size. Defaults to 1 MB. */
  minSizeBytes?: number;
  /** Number of in-flight downloads + encodes. Defaults to 3. */
  concurrency?: number;
  onProgress?: (p: CompressProgress) => void;
  onItem?: (r: CompressItemResult) => void;
  abortSignal?: AbortSignal;
}

/** Pull "<importId>/<filename>" out of a Supabase public URL. */
export function extractStoragePath(url: string): string | null {
  const idx = url.indexOf(PATH_MARKER);
  if (idx === -1) return null;
  // Strip query/hash if any. Decode percent-escapes — storage API takes raw paths.
  const tail = url.slice(idx + PATH_MARKER.length).split(/[?#]/)[0];
  if (!tail) return null;
  try {
    return decodeURIComponent(tail);
  } catch {
    return tail;
  }
}

/**
 * Download a stored object as a Blob.
 *
 * Storage layout in this app is heterogeneous:
 *   - Old uploads:    `<importId>/<filename>`
 *   - New uploads:    `brands/<brandId>/<importId>/<filename>` (shopify-import-create)
 *
 * Two failure modes we hit in practice:
 *   1. `Invalid key` — the path contains non-ASCII characters in a Unicode form
 *      Supabase normalises differently than the browser did at upload time
 *      (NFC vs NFD; e.g. "Â" can be Â or A + ̂). We retry with both.
 *   2. `Object not found` — the row's `file_url` got out of sync with the
 *      object actually stored. We list the parent folder and try to find the
 *      file by its case-insensitive basename match.
 *
 * Final fallback: fetch the public URL directly (with a re-encoded basename).
 */
async function downloadStorageObject(
  path: string,
  publicUrl: string,
): Promise<Blob> {
  // 1. Try every Unicode normalization of the path via the Storage API.
  const candidates = unicodeVariants(path);
  let storageErr = "storage download failed";
  for (const candidate of candidates) {
    const apiResult = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(candidate);
    if (!apiResult.error && apiResult.data) return apiResult.data;
    if (apiResult.error?.message) storageErr = apiResult.error.message;
  }

  // 2. Object-not-found — list the parent folder and look for a basename match.
  if (/not found/i.test(storageErr)) {
    const found = await findByBasename(path);
    if (found) {
      const r = await supabase.storage.from(STORAGE_BUCKET).download(found);
      if (!r.error && r.data) return r.data;
    }
  }

  // 3. Public URL as stored in the DB.
  try {
    const r = await fetch(publicUrl, { cache: "no-store" });
    if (r.ok) return await r.blob();
    // 4. Re-encode the basename and retry — older rows can hold partially-encoded URLs.
    const reEncoded = reEncodeUrlBasename(publicUrl);
    if (reEncoded && reEncoded !== publicUrl) {
      const r2 = await fetch(reEncoded, { cache: "no-store" });
      if (r2.ok) return await r2.blob();
      throw new Error(
        `fetch failed (${r.status}, retry ${r2.status}); storage: ${storageErr}`,
      );
    }
    throw new Error(`fetch failed (${r.status}); storage: ${storageErr}`);
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(`download failed; storage: ${storageErr}`);
  }
}

/**
 * Return the input string normalised in NFC, NFD, and the original form. Order
 * matters — NFC is the most common on-disk representation, so we try it first.
 * Duplicates are collapsed.
 */
function unicodeVariants(s: string): string[] {
  const out = new Set<string>();
  out.add(s);
  try {
    out.add(s.normalize("NFC"));
  } catch {
    /* normalize unsupported, fall through */
  }
  try {
    out.add(s.normalize("NFD"));
  } catch {
    /* same */
  }
  return [...out];
}

/**
 * List the parent directory of `path` and return the actual stored key whose
 * basename matches (case-insensitive, after Unicode-normalising both sides).
 * Returns null if no match exists or the listing fails.
 */
async function findByBasename(path: string): Promise<string | null> {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash === -1) return null;
  const folder = path.slice(0, lastSlash);
  const basename = path.slice(lastSlash + 1);
  const target = normalizeForCompare(basename);

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .list(folder, { limit: 1000 });
  if (error || !data) return null;

  for (const entry of data) {
    if (!entry?.name) continue;
    if (normalizeForCompare(entry.name) === target) {
      return `${folder}/${entry.name}`;
    }
  }
  return null;
}

function normalizeForCompare(s: string): string {
  let n = s;
  try {
    n = n.normalize("NFC");
  } catch {
    /* leave as-is */
  }
  return n.toLowerCase();
}

/** Re-encode just the last path segment of a URL using encodeURIComponent. */
function reEncodeUrlBasename(url: string): string | null {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/");
    const last = segments.pop();
    if (!last) return null;
    let decoded = last;
    try {
      decoded = decodeURIComponent(last);
    } catch {
      /* keep raw */
    }
    segments.push(encodeURIComponent(decoded));
    u.pathname = segments.join("/");
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Count how many *not-yet-imported* images are above `minSizeBytes`.
 *
 * `total` is the count of pending rows (no `shopify_media_id`), not the whole
 * import — already-on-Shopify images are out of scope for compression.
 */
export async function countOversizeImages(
  importId: string,
  minSizeBytes: number = DEFAULT_MIN_SIZE_BYTES,
): Promise<{ ok: true; total: number; oversized: number } | { ok: false; error: string }> {
  const result = await fetchAllImportImageRows<{
    id: string;
    file_size: number | null;
    shopify_media_id: string | null;
  }>(supabase, {
    importId,
    select: "id, file_size, shopify_media_id",
  });
  if (!result.ok) return { ok: false, error: result.error };
  const pending = result.rows.filter((r) => !r.shopify_media_id);
  const oversized = pending.filter(
    (r) => (r.file_size ?? 0) > minSizeBytes,
  ).length;
  return { ok: true, total: pending.length, oversized };
}

/**
 * Compress every oversized image we still need to import (i.e. pending rows
 * with no `shopify_media_id`) in place. Existing public URLs are preserved
 * (upsert to the same storage key), so the queued send-to-Shopify run picks
 * up the smaller payload without any other plumbing change.
 */
export async function compressImportImages(
  importId: string,
  opts: CompressOptions = {},
): Promise<CompressSummary> {
  const minSize = opts.minSizeBytes ?? DEFAULT_MIN_SIZE_BYTES;
  const concurrency = Math.max(1, opts.concurrency ?? 3);

  const result = await fetchAllImportImageRows<ImportImageRow>(supabase, {
    importId,
    select: "id, file_name, file_url, file_size, shopify_media_id",
  });
  if (!result.ok) {
    throw new Error(`Could not load images: ${result.error}`);
  }

  const targets = result.rows.filter(
    (r) =>
      r.file_url &&
      !r.shopify_media_id &&
      (r.file_size ?? 0) > minSize,
  );

  const summary: CompressSummary = {
    total: targets.length,
    processed: 0,
    skipped: 0,
    failed: 0,
    bytesSaved: 0,
  };

  if (targets.length === 0) return summary;

  let cursor = 0;
  let done = 0;

  const worker = async () => {
    for (;;) {
      if (opts.abortSignal?.aborted) return;
      const i = cursor++;
      if (i >= targets.length) return;
      const row = targets[i];
      const oldSize = row.file_size ?? 0;
      let result: CompressItemResult = {
        id: row.id,
        name: row.file_name,
        oldSize,
        newSize: oldSize,
        ok: false,
      };
      try {
        const path = extractStoragePath(row.file_url);
        if (!path) {
          result = { ...result, ok: true, skipped: "no-path" };
          summary.skipped++;
        } else {
          // Use the Storage API directly — raw path, no URL-encoding pitfalls
          // for filenames with accents/diacritics ("CRÈME", "ROSE-PÂLE", etc.).
          const blob = await downloadStorageObject(path, row.file_url);
          const file = new File(
            [blob],
            row.file_name || "image.jpg",
            { type: blob.type || "image/jpeg" },
          );

          // Force compression even though the file was already on storage.
          const resized = await resizeImageForShopify(file, {
            // Always run through the canvas pipeline so the no-op skip path
            // (small JPEG) doesn't short-circuit when we explicitly asked.
            skipBelowBytes: 0,
          });

          if (!resized.resized || resized.finalSize >= oldSize) {
            // Browser couldn't decode it (HEIC etc.) or the recompress
            // came out larger — leave the original on storage untouched.
            result = {
              ...result,
              ok: true,
              skipped: !resized.resized ? "decode-failed" : "no-shrink",
            };
            summary.skipped++;
          } else {
            const { error: upErr } = await supabase.storage
              .from(STORAGE_BUCKET)
              .upload(path, resized.file, {
                upsert: true,
                contentType: "image/jpeg",
              });
            if (upErr) throw upErr;

            const { error: dbErr } = await supabase
              .from("shopify_import_images")
              .update({
                file_size: resized.finalSize,
                // Filename may have changed extension (.png → .jpg). Keep DB in sync
                // so reorder / mapping logic still works.
                file_name: resized.file.name,
              })
              .eq("id", row.id);
            if (dbErr) throw dbErr;

            summary.processed++;
            summary.bytesSaved += oldSize - resized.finalSize;
            result = {
              ...result,
              ok: true,
              newSize: resized.finalSize,
              name: resized.file.name,
            };
          }
        }
      } catch (err) {
        summary.failed++;
        result = {
          ...result,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      } finally {
        done++;
        opts.onItem?.(result);
        opts.onProgress?.({
          done,
          total: targets.length,
          currentName: row.file_name,
        });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, worker),
  );

  return summary;
}
