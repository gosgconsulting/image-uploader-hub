/**
 * Module-level queue for browser → Sparti storage uploads.
 *
 * Why this exists: an import of 1000+ images is a 5–15 minute job. We don't want the
 * `New Import` dialog (or even the page route) to be the thing keeping it alive — the
 * user should be able to close the dialog, navigate to other tabs in the app, and watch
 * progress on the imports list. The Promises here are owned by the module, so they
 * outlive any React component lifecycle.
 *
 * Caveat: closing the browser/tab still kills in-flight uploads. The DB rows remain
 * (created up-front by `shopify-import-create`) but the storage objects don't exist for
 * the missing files. A future "resume uploads" pass could find rows whose storage
 * objects 404 and re-upload them; that requires keeping the file blobs in IndexedDB,
 * which we haven't built.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const BUCKET = "shopify-import-images";
const PARALLEL_WORKERS = 8;
/** How long to keep a finished entry visible in the UI after the last byte goes up. */
const FINISHED_TTL_MS = 8000;

export interface UploadEntry {
  importId: string;
  total: number;
  done: number;
  failed: number;
  /** present while uploads are still running; cleared once we drop the entry. */
  startedAt: number;
  finishedAt: number | null;
  /** Most recent per-file error, surfaced to the UI. */
  lastError: string | null;
}

interface InternalEntry extends UploadEntry {
  files: File[];
  uploads: Array<{ path: string; token: string }>;
  cancelled: boolean;
}

const state = new Map<string, InternalEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeUploadQueue(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getUploadEntry(importId: string): UploadEntry | null {
  const e = state.get(importId);
  if (!e) return null;
  return {
    importId: e.importId,
    total: e.total,
    done: e.done,
    failed: e.failed,
    startedAt: e.startedAt,
    finishedAt: e.finishedAt,
    lastError: e.lastError,
  };
}

export function getActiveUploadCount(): number {
  let n = 0;
  for (const e of state.values()) if (e.finishedAt === null) n += 1;
  return n;
}

/**
 * React hook: live upload progress for a single import. Returns null when no upload
 * is tracked for this id (either never started, already cleaned up, or unknown).
 */
export function useImportUploadProgress(
  importId: string | null | undefined,
): UploadEntry | null {
  const [snapshot, setSnapshot] = useState<UploadEntry | null>(() =>
    importId ? getUploadEntry(importId) : null,
  );
  useEffect(() => {
    if (!importId) {
      setSnapshot(null);
      return;
    }
    const update = () => setSnapshot(getUploadEntry(importId));
    update();
    return subscribeUploadQueue(update);
  }, [importId]);
  return snapshot;
}

export function cancelUpload(importId: string): void {
  const e = state.get(importId);
  if (!e) return;
  e.cancelled = true;
}

export function startImportUpload(input: {
  importId: string;
  files: File[];
  uploads: Array<{ path: string; token: string }>;
}): void {
  if (input.files.length !== input.uploads.length) {
    throw new Error(
      `Mismatched files (${input.files.length}) and upload slots (${input.uploads.length})`,
    );
  }
  // If a previous run for this import is still tracked, clear it so the new run owns
  // the slot. The previous Promise's progress writes will be ignored after `cancelled`.
  const prev = state.get(input.importId);
  if (prev) prev.cancelled = true;

  const entry: InternalEntry = {
    importId: input.importId,
    files: input.files,
    uploads: input.uploads,
    total: input.files.length,
    done: 0,
    failed: 0,
    startedAt: Date.now(),
    finishedAt: null,
    lastError: null,
    cancelled: false,
  };
  state.set(input.importId, entry);
  notify();

  void runQueue(entry);
}

async function runQueue(entry: InternalEntry): Promise<void> {
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      if (entry.cancelled) return;
      const i = cursor++;
      if (i >= entry.total) return;
      const file = entry.files[i];
      const slot = entry.uploads[i];
      try {
        const { error } = await supabase.storage
          .from(BUCKET)
          .uploadToSignedUrl(slot.path, slot.token, file);
        if (entry.cancelled) return;
        if (error) {
          entry.failed += 1;
          entry.lastError = error.message ?? "Upload failed";
        } else {
          entry.done += 1;
        }
      } catch (e) {
        if (entry.cancelled) return;
        entry.failed += 1;
        entry.lastError = e instanceof Error ? e.message : String(e);
      }
      notify();
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(PARALLEL_WORKERS, entry.total) },
      worker,
    ),
  );

  if (entry.cancelled) {
    state.delete(entry.importId);
    notify();
    return;
  }

  entry.finishedAt = Date.now();
  notify();

  // Keep the finished entry around briefly so the imports list shows the final state,
  // then drop it. The persistent state is in `shopify_import_images` rows + storage.
  setTimeout(() => {
    const cur = state.get(entry.importId);
    if (cur === entry) {
      state.delete(entry.importId);
      notify();
    }
  }, FINISHED_TTL_MS);
}
