import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const SUPABASE_URL = "https://fkemumodynkaeojrrkbj.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZW11bW9keW5rYWVvanJya2JqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwMzYyOTcsImV4cCI6MjA2MjYxMjI5N30.xI2Hkw7OZIPOR2jwGh8EkSF3p3lEpTYeKKVTGF5G8vM";
const BRAND_ID = "fabdb9e9-def7-4756-bf06-881460314590";
const BATCH_NAME = "Import New";
const SOURCE_DIR = "C:/Users/Oliver/Downloads/frnch-im/RETOUCHES";
const BUCKET = "shopify-import-images";
const PARALLEL = 8;

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
if (!ACCESS_TOKEN) {
  console.error("ACCESS_TOKEN env var required");
  process.exit(1);
}

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

const mimeFor = (name) => {
  const ext = extname(name).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".bmp") return "image/bmp";
  return "application/octet-stream";
};

console.log(`[scan] ${SOURCE_DIR}`);
const entries = await readdir(SOURCE_DIR);
const files = [];
for (const name of entries) {
  if (!IMAGE_EXT.has(extname(name).toLowerCase())) continue;
  const full = join(SOURCE_DIR, name);
  const s = await stat(full);
  if (!s.isFile()) continue;
  files.push({ full, name: basename(full), size: s.size });
}
console.log(`[scan] found ${files.length} image files`);
if (files.length === 0) process.exit(1);

console.log(`[create] POST shopify-import-create  batch_name="${BATCH_NAME}"`);
const createRes = await fetch(`${SUPABASE_URL}/functions/v1/shopify-import-create`, {
  method: "POST",
  headers: {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    brand_id: BRAND_ID,
    batch_name: BATCH_NAME,
    files: files.map((f) => ({ name: f.name, size: f.size })),
  }),
});

const createBody = await createRes.json();
if (!createRes.ok || !createBody?.ok) {
  console.error("[create] failed", createRes.status, createBody);
  process.exit(1);
}
const { import_id, uploads } = createBody;
console.log(`[create] import_id=${import_id}  upload_slots=${uploads.length}`);

let done = 0;
let failed = 0;
const fails = [];
const cursor = { i: 0 };

const uploadOne = async (idx) => {
  const file = files[idx];
  const slot = uploads[idx];
  if (!slot) {
    fails.push({ idx, name: file.name, error: "no slot" });
    failed++;
    return;
  }
  const buf = await readFile(file.full);
  const url = `${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${slot.path}?token=${slot.token}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": mimeFor(slot.file_name),
      "Cache-Control": "max-age=3600",
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    fails.push({ idx, name: file.name, status: res.status, error: text.slice(0, 200) });
    failed++;
  } else {
    done++;
  }
  if ((done + failed) % 25 === 0 || done + failed === files.length) {
    console.log(`[upload] ${done + failed}/${files.length}  ok=${done} fail=${failed}`);
  }
};

const workers = Array.from({ length: PARALLEL }, async () => {
  for (;;) {
    const i = cursor.i++;
    if (i >= files.length) return;
    try {
      await uploadOne(i);
    } catch (e) {
      fails.push({ idx: i, name: files[i].name, error: String(e?.message || e) });
      failed++;
    }
  }
});
await Promise.all(workers);

console.log(`[done] uploaded ${done}  failed ${failed}  import_id=${import_id}`);
if (fails.length) {
  console.log(`[fails] first 10:`);
  for (const f of fails.slice(0, 10)) console.log("  ", f);
}
