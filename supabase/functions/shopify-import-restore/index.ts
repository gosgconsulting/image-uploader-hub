/**
 * Restore Shopify product media from a previously-taken snapshot batch.
 *
 * Re-uploads the saved image URLs as productCreateMedia. Does NOT delete current media —
 * the caller chose this. Marks each restored snapshot row's `restored_at`.
 *
 * Caveat: URLs in the snapshot are Shopify CDN URLs from before the bad import. If the
 * media was deleted, those URLs may 404. We attempt anyway and report what worked.
 *
 * POST { brand_id, import_id } -> { ok, restored: number, failed: number, errors: [...] }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MEDIA_BATCH = 20;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const ADD_MEDIA = `mutation AddMedia($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { id status }
    mediaUserErrors { field message }
  }
}`;

type SnapshotRow = {
  id: string;
  shopify_product_id: string;
  shopify_product_name: string | null;
  featured_image_url: string | null;
  featured_image_alt: string | null;
  gallery: Array<{ id?: string; url: string; alt: string | null }>;
};

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

  let body: { brand_id?: string; import_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  const importId = typeof body.import_id === "string" ? body.import_id.trim() : "";
  if (!UUID_RE.test(brandId)) return json({ error: "Invalid brand_id" }, 400);
  if (!UUID_RE.test(importId)) return json({ error: "Invalid import_id" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authorize.
  const { data: brand } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .maybeSingle();
  if (!brand) return json({ error: "Brand not found" }, 404);
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

  // Load all snapshot rows for this import.
  const { data: snaps, error: snapErr } = await admin
    .from("shopify_import_snapshots")
    .select(
      "id, shopify_product_id, shopify_product_name, featured_image_url, featured_image_alt, gallery",
    )
    .eq("import_id", importId)
    .eq("brand_id", brandId);
  if (snapErr) return json({ error: snapErr.message }, 500);
  const snapshots = (snaps ?? []) as SnapshotRow[];
  if (snapshots.length === 0) {
    return json({ error: "No snapshot found for this import" }, 404);
  }

  // Resolve creds.
  const { data: cred } = await admin
    .from("shopify_credentials")
    .select("access_token, shop_domain")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!cred?.access_token || !(cred as { shop_domain?: string }).shop_domain) {
    return json({ error: "No Shopify credentials saved for this brand" }, 400);
  }
  const shopDomain = normalizeShopDomain((cred as { shop_domain: string }).shop_domain);
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shopDomain)) {
    return json({ error: "Invalid Shopify shop domain" }, 400);
  }
  const gqlUrl = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const accessToken = cred.access_token as string;

  let restored = 0;
  let failed = 0;
  const errors: Array<{ product_id: string; message: string }> = [];

  for (const snap of snapshots) {
    // Featured image goes first so Shopify uses it as featured (first uploaded becomes featured
    // when the product has none).
    const urls: Array<{ src: string; alt: string | null }> = [];
    if (snap.featured_image_url) {
      urls.push({ src: snap.featured_image_url, alt: snap.featured_image_alt });
    }
    for (const g of snap.gallery ?? []) {
      if (!g?.url || g.url === snap.featured_image_url) continue;
      urls.push({ src: g.url, alt: g.alt ?? null });
    }
    if (urls.length === 0) continue;

    let productSucceeded = false;
    let lastError = "";
    for (let i = 0; i < urls.length; i += MEDIA_BATCH) {
      const chunk = urls.slice(i, i + MEDIA_BATCH);
      const payload = {
        query: ADD_MEDIA,
        variables: {
          productId: snap.shopify_product_id,
          media: chunk.map((u) => ({
            mediaContentType: "IMAGE" as const,
            originalSource: u.src,
            alt: u.alt ?? "",
          })),
        },
      };
      let res: Response;
      try {
        res = await fetch(gqlUrl, {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": accessToken,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      } catch (e) {
        lastError = e instanceof Error ? e.message : "network";
        break;
      }
      if (!res.ok) {
        lastError = `Shopify ${res.status}`;
        break;
      }
      const data = (await res.json().catch(() => ({}))) as {
        data?: {
          productCreateMedia?: {
            media?: unknown[];
            mediaUserErrors?: Array<{ message?: string }>;
          };
        };
        errors?: Array<{ message?: string }>;
      };
      if (data.errors?.length) {
        lastError = data.errors.map((e) => e.message ?? "").join("; ") || "GraphQL error";
        break;
      }
      const userErrors = data.data?.productCreateMedia?.mediaUserErrors ?? [];
      if (userErrors.length > 0) {
        lastError = userErrors.map((e) => e.message ?? "").join("; ") || "Media error";
        // Don't break on user errors — Shopify often reports per-asset and the rest succeed.
      }
      productSucceeded = true;
    }

    if (productSucceeded && !lastError) {
      restored += 1;
      await admin
        .from("shopify_import_snapshots")
        .update({ restored_at: new Date().toISOString() })
        .eq("id", snap.id);
    } else if (productSucceeded) {
      restored += 1;
      errors.push({ product_id: snap.shopify_product_id, message: lastError });
      await admin
        .from("shopify_import_snapshots")
        .update({ restored_at: new Date().toISOString() })
        .eq("id", snap.id);
    } else {
      failed += 1;
      errors.push({ product_id: snap.shopify_product_id, message: lastError });
    }
  }

  return json({ ok: true, restored, failed, errors });
});
