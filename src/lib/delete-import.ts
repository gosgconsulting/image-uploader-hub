import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const BUCKET = "shopify-import-images";
const LIST_PAGE = 1000;
const REMOVE_BATCH = 100;

/**
 * Removes all objects under `importId/` in storage, then deletes the import row
 * (import_images rows cascade). Storage must be cleared first so blobs are not
 * left orphaned if the DB delete succeeds.
 */
export async function deleteImportWithStorage(
  client: SupabaseClient<Database>,
  importId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const paths: string[] = [];
  let offset = 0;
  for (;;) {
    const { data: files, error: listError } = await client.storage
      .from(BUCKET)
      .list(importId, { limit: LIST_PAGE, offset });

    if (listError) {
      return { ok: false, message: listError.message };
    }
    if (!files?.length) {
      break;
    }
    for (const file of files) {
      if (file.name) {
        paths.push(`${importId}/${file.name}`);
      }
    }
    if (files.length < LIST_PAGE) {
      break;
    }
    offset += LIST_PAGE;
  }

  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const chunk = paths.slice(i, i + REMOVE_BATCH);
    const { error: removeError } = await client.storage.from(BUCKET).remove(chunk);
    if (removeError) {
      return { ok: false, message: removeError.message };
    }
  }

  const { error: dbError } = await client.from("shopify_imports").delete().eq("id", importId);
  if (dbError) {
    return { ok: false, message: dbError.message };
  }

  return { ok: true };
}
