/**
 * Create a new Shopify image import on behalf of a brand member.
 *
 * The client cannot insert into `shopify_imports` / `shopify_import_images` or upload to the
 * `shopify-import-images` bucket directly: RLS only permits the brand owner. Sparti grants
 * additional access via `brand_users.auth_user_id`, which RLS doesn't see.
 *
 * Flow:
 *   1. Caller POSTs { brand_id, batch_name, files: [{name, size}] } with their JWT.
 *   2. We authorize (brand owner OR active brand_users row).
 *   3. Service role inserts the import + image rows and creates signed upload URLs.
 *   4. Browser uploads each file via PUT to the signed URLs.
 *
 * Response: { ok, import_id, uploads: [{file_name, path, token, public_url}] }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "shopify-import-images";
const MAX_FILES = 4000;
const MAX_FILE_NAME_LEN = 200;
const BRAND_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function sanitizeFileName(name: string): string {
  // Supabase Storage rejects keys containing non-ASCII (e.g. "PÂLE", "É") and many
  // punctuation characters. The signed upload URL is minted against the path, so a
  // bad key fails at PUT time on the browser. We:
  //   1. Strip path separators and trim whitespace.
  //   2. NFD-decompose then drop combining marks ("PÂLE" -> "PALE", "café" -> "cafe").
  //   3. Replace anything outside a conservative ASCII allow-list with "_".
  //   4. Collapse runs of "_" so the result stays readable.
  let s = name.replace(/[\\/]/g, "_").trim();
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[^A-Za-z0-9._\-()]/g, "_");
  s = s.replace(/_+/g, "_");
  return s.slice(0, MAX_FILE_NAME_LEN);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Missing authorization" }, 401);
  const jwt = authHeader.slice(7);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey) return json({ error: "Server misconfigured" }, 500);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) return json({ error: "Invalid or expired session" }, 401);

  let body: {
    brand_id?: string;
    batch_name?: string;
    files?: Array<{ name?: string; size?: number }>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  if (!BRAND_UUID_RE.test(brandId)) return json({ error: "Invalid brand_id" }, 400);

  const batchName =
    typeof body.batch_name === "string" && body.batch_name.trim()
      ? body.batch_name.trim()
      : "Untitled";

  const rawFiles = Array.isArray(body.files) ? body.files : [];
  if (rawFiles.length === 0) {
    console.warn(
      `[shopify-import-create] no files for brand=${brandId} user=${user.id}`,
    );
    return json({ error: "No files provided" }, 400);
  }
  if (rawFiles.length > MAX_FILES) {
    console.warn(
      `[shopify-import-create] too many files: ${rawFiles.length} (max ${MAX_FILES}) brand=${brandId}`,
    );
    return json({ error: `Too many files (max ${MAX_FILES})` }, 400);
  }
  const files = rawFiles.map((f) => ({
    name: sanitizeFileName(typeof f.name === "string" ? f.name : ""),
    size: typeof f.size === "number" && Number.isFinite(f.size) ? f.size : null,
  }));
  const blankIdx = files.findIndex((f) => !f.name);
  if (blankIdx >= 0) {
    console.warn(
      `[shopify-import-create] blank file name at index ${blankIdx} brand=${brandId}`,
    );
    return json({ error: "Each file requires a name" }, 400);
  }
  console.log(
    `[shopify-import-create] starting import: brand=${brandId} user=${user.id} files=${files.length}`,
  );

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authorize: brand owner OR active brand_users member.
  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .maybeSingle();
  if (brandErr || !brand) return json({ error: "Brand not found" }, 404);

  let allowed = (brand as { user_id?: string }).user_id === user.id;
  if (!allowed) {
    const { data: memberRow } = await admin
      .from("brand_users")
      .select("id")
      .eq("brand_id", brandId)
      .eq("auth_user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    allowed = Boolean(memberRow);
  }
  if (!allowed) return json({ error: "Not allowed for this brand" }, 403);

  // Create the import row.
  const { data: importRow, error: importErr } = await admin
    .from("shopify_imports")
    .insert({ brand_id: brandId, batch_name: batchName })
    .select("id")
    .single();
  if (importErr || !importRow?.id) {
    return json({ error: importErr?.message || "Could not create import" }, 500);
  }
  const importId = importRow.id as string;

  // Generate signed upload URLs + insert image rows. If any step fails, roll back the import.
  const uploads: Array<{ file_name: string; path: string; token: string; public_url: string }> = [];
  const imageRecords: Array<{
    import_id: string;
    brand_id: string;
    file_name: string;
    file_url: string;
    file_size: number | null;
    position: number;
  }> = [];

  try {
    // De-duplicate filenames within one batch by prefixing the index when needed.
    const seen = new Map<string, number>();
    for (let i = 0; i < files.length; i++) {
      const original = files[i].name;
      const dupCount = seen.get(original) ?? 0;
      seen.set(original, dupCount + 1);
      const finalName = dupCount === 0 ? original : `${dupCount}_${original}`;
      // Path convention mirrors the migrated data and the bucket's workspace-scoped RLS:
      // `brands/<brand_id>/<import_id>/<filename>`. Service role bypasses RLS for the
      // signed-URL flow, but keeping the same prefix keeps everything coherent for any
      // future client-side reads that DO go through RLS.
      const path = `brands/${brandId}/${importId}/${finalName}`;

      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path);
      if (signErr || !signed?.token) {
        throw new Error(signErr?.message || "Could not create upload URL");
      }

      const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);

      uploads.push({
        file_name: finalName,
        path,
        token: signed.token,
        public_url: pub.publicUrl,
      });
      imageRecords.push({
        import_id: importId,
        brand_id: brandId,
        file_name: finalName,
        file_url: pub.publicUrl,
        file_size: files[i].size,
        position: i + 1,
      });
    }

    const { error: imgErr } = await admin.from("shopify_import_images").insert(imageRecords);
    if (imgErr) throw new Error(imgErr.message || "Could not insert image rows");
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : String(e);
    console.error(
      `[shopify-import-create] failed during upload prep: ${errMsg} import=${importId}`,
    );
    // Best-effort cleanup so we don't leave orphan import rows.
    await admin.from("shopify_import_images").delete().eq("import_id", importId);
    await admin.from("shopify_imports").delete().eq("id", importId);
    return json({ error: errMsg }, 500);
  }

  return json({ ok: true, import_id: importId, uploads });
});
