import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveCredentialAndVerifyImport } from "./authorizeBrandImport.ts";
import {
  normalizeProductGid,
  validateHttpsPublicImageUrl,
  type ProductImageRow,
} from "./groupAndSortProducts.ts";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";
import {
  prepareImportImages,
  processNextProduct,
  finalizeImport,
} from "./processImport.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-auth",
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

declare const EdgeRuntime:
  | { waitUntil(p: Promise<unknown>): void }
  | undefined;

const INTERNAL_HEADER = "x-internal-auth";

/**
 * Fire-and-forget self invocation. We do NOT await — the goal is to chain the next
 * product's work after the current invocation has returned its response.
 */
function scheduleContinuation(opts: {
  supabaseUrl: string;
  serviceKey: string;
  importId: string;
}): Promise<void> {
  const url = `${opts.supabaseUrl}/functions/v1/shopify-import-media`;
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [INTERNAL_HEADER]: opts.serviceKey,
      // Supabase functions gateway requires *some* Authorization header even when the
      // function has verify_jwt=false; using the service key keeps it consistent.
      Authorization: `Bearer ${opts.serviceKey}`,
    },
    body: JSON.stringify({
      action: "continue",
      import_id: opts.importId,
    }),
  })
    .then(() => undefined)
    .catch((e) => {
      console.error(
        `[shopify-import-media] continuation fetch failed import=${opts.importId}`,
        e,
      );
    });
}

async function handleInternalContinuation(opts: {
  admin: SupabaseClient;
  importId: string;
  supabaseUrl: string;
  serviceKey: string;
}): Promise<Response> {
  const { admin, importId, supabaseUrl, serviceKey } = opts;

  // Resolve shop credentials directly from the import — no user JWT required for
  // continuations because the gateway has already validated our internal token.
  const { data: imp, error: impErr } = await admin
    .from("shopify_imports")
    .select("id, brand_id, status")
    .eq("id", importId)
    .maybeSingle();

  if (impErr || !imp || !imp.brand_id) {
    return json({ ok: false, error: "Import not found" }, 200);
  }

  const { data: cred } = await admin
    .from("shopify_credentials")
    .select("access_token, shop_domain")
    .eq("brand_id", imp.brand_id)
    .maybeSingle();

  if (!cred?.access_token || !cred.shop_domain) {
    await admin
      .from("shopify_imports")
      .update({ status: "failed" })
      .eq("id", importId);
    return json({ ok: false, error: "No Shopify credentials" }, 200);
  }

  const shopDomain = normalizeShopDomain(cred.shop_domain);
  if (!shopDomain.endsWith(".myshopify.com")) {
    await admin
      .from("shopify_imports")
      .update({ status: "failed" })
      .eq("id", importId);
    return json({ ok: false, error: "Invalid shop domain" }, 200);
  }

  const result = await processNextProduct({
    admin,
    importId,
    shopDomain,
    accessToken: cred.access_token as string,
  });

  console.log(
    `[shopify-import-media] continuation import=${importId} product=${result.productGid ?? "none"} ` +
      `succeeded=${result.succeeded} failed=${result.failed} remaining=${result.remainingProducts} done=${result.done}`,
  );

  if (result.done) {
    const finalStatus = await finalizeImport(admin, importId);
    console.log(
      `[shopify-import-media] finalized import=${importId} status=${finalStatus}`,
    );
    return json({ ok: true, done: true, status: finalStatus });
  }

  // More products remain — schedule the next continuation in the background so this
  // invocation can return promptly. Using waitUntil keeps the request alive long enough
  // for the fetch to leave the box, but doesn't wait on the next continuation finishing.
  const next = scheduleContinuation({ supabaseUrl, serviceKey, importId });
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(next);
  } else {
    void next;
  }

  return json({
    ok: true,
    done: false,
    remaining_products: result.remainingProducts,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ success: false, message: "Server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let body: {
    action?: string;
    brand_id?: string;
    import_id?: string;
    products?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 200);
  }

  // ── Internal continuation path: only callable with the service-role token. ──────
  if (body.action === "continue") {
    const internalAuth = req.headers.get(INTERNAL_HEADER);
    if (internalAuth !== serviceKey) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }
    const importId =
      typeof body.import_id === "string" ? body.import_id.trim() : "";
    if (!importId) {
      return json({ ok: false, error: "Missing import_id" }, 200);
    }
    return await handleInternalContinuation({
      admin,
      importId,
      supabaseUrl,
      serviceKey,
    });
  }

  // ── User-initiated kickoff path: validates the user's JWT. ──────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, message: "Missing authorization" }, 401);
  }
  const jwt = authHeader.slice(7);

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  const importId = typeof body.import_id === "string" ? body.import_id.trim() : "";
  const productsRaw = body.products;

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt);

  if (userErr || !user) {
    return json({ success: false, message: "Invalid or expired session. Sign in again." }, 401);
  }

  const cred = await resolveCredentialAndVerifyImport({
    admin,
    userId: user.id,
    brandId,
    importId,
  });

  if (!cred.ok) {
    return json({ success: false, message: cred.error }, 200);
  }

  const rawArr = Array.isArray(productsRaw) ? productsRaw : [];
  const productRows: Array<ProductImageRow & { id: string }> = [];
  for (const el of rawArr) {
    if (!el || typeof el !== "object") continue;
    const o = el as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const gid = normalizeProductGid(o.productid);
    const file_url = validateHttpsPublicImageUrl(o.file_url);
    const file_name = typeof o.file_name === "string" ? o.file_name : "";
    if (!id || !gid || !file_url) continue;
    productRows.push({
      id,
      productid: gid,
      file_url,
      file_name,
      original_file_name:
        typeof o.original_file_name === "string" ? o.original_file_name : undefined,
      productname: typeof o.productname === "string" ? o.productname : undefined,
    });
  }

  if (productRows.length === 0) {
    return json({ success: false, message: "No valid products to upload" }, 200);
  }

  // Sync stage: queue the import + write per-image product mapping. The actual Shopify
  // work happens in chained continuations so no single invocation has to outlive the
  // runtime's wall-clock budget.
  await admin
    .from("shopify_imports")
    .update({ status: "queued" })
    .eq("id", importId);

  const prep = await prepareImportImages(admin, importId, productRows);

  // Kick off the first continuation. waitUntil ensures the fetch makes it out before the
  // worker shuts down.
  const firstContinuation = scheduleContinuation({
    supabaseUrl,
    serviceKey,
    importId,
  });
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(firstContinuation);
  } else {
    void firstContinuation;
  }

  return json({
    accepted: true,
    success: true,
    import_id: importId,
    pending: prep.pendingCount,
    skipped_already_done: prep.skippedAlreadyDoneCount,
  });
});
