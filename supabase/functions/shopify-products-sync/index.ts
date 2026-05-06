import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";
import { resolveRefundAccessToken } from "../shopify-create-refund/resolveRefundAccessToken.ts";

const SHOPIFY_API_VERSION = "2026-04";
const PAGE_LIMIT = 250;
const MAX_PAGES = 40; // hard ceiling: 10k products per sync

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function isAllowedMyshopifyHost(host: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host);
}

type ShopifyProduct = {
  id: number;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  updated_at: string;
  image?: { src?: string } | null;
  images?: Array<{ src?: string }>;
  variants?: Array<unknown>;
};

type ProductRow = {
  brand_id: string;
  shopify_product_id: string;
  title: string;
  handle: string | null;
  status: string | null;
  vendor: string | null;
  product_type: string | null;
  variant_count: number;
  image_url: string | null;
  shopify_updated_at: string | null;
  synced_at: string;
};

/** Shopify cursor pagination uses Link header: <url>; rel="next". */
function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const p of parts) {
    const m = p.match(/<([^>]+)>;\s*rel="next"/);
    if (m) return m[1];
  }
  return null;
}

function toRow(brandId: string, p: ShopifyProduct, syncedAt: string): ProductRow {
  const image =
    p.image?.src ?? (Array.isArray(p.images) ? p.images[0]?.src ?? null : null);
  return {
    brand_id: brandId,
    shopify_product_id: String(p.id),
    title: p.title ?? "",
    handle: p.handle ?? null,
    status: p.status ?? null,
    vendor: p.vendor ?? null,
    product_type: p.product_type ?? null,
    variant_count: Array.isArray(p.variants) ? p.variants.length : 0,
    image_url: image ?? null,
    shopify_updated_at: p.updated_at ?? null,
    synced_at: syncedAt,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }
  const jwt = authHeader.slice(7);

  let body: { shopDomain?: string; brandId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain : "";
  const brandId = typeof body.brandId === "string" ? body.brandId.trim() : "";
  const normalizedShop = normalizeShopDomain(shopDomain);

  if (!normalizedShop || !isAllowedMyshopifyHost(normalizedShop)) {
    return json({ error: "Invalid or unsupported shop domain" }, 400);
  }
  if (!brandId) {
    return json({ error: "brandId is required" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfigured" }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey);

  // Verify caller is authenticated and has access to this brand
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt);
  if (userErr || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .maybeSingle();
  if (brandErr || !brand) {
    return json({ error: "Brand not found" }, 404);
  }
  let allowed = brand.user_id === user.id;
  if (!allowed) {
    const { data: mem } = await admin
      .from("brand_members")
      .select("brand_id")
      .eq("brand_id", brandId)
      .eq("member_user_id", user.id)
      .maybeSingle();
    allowed = !!mem;
  }
  if (!allowed) {
    return json({ error: "Forbidden" }, 403);
  }

  const resolved = await resolveRefundAccessToken(admin, jwt, normalizedShop);
  if (!resolved.ok) {
    return json({ error: resolved.error }, resolved.status);
  }
  const accessToken = resolved.accessToken;

  // Paginated REST fetch via Link header cursor
  let url:
    | string
    | null = `https://${normalizedShop}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=${PAGE_LIMIT}`;
  let pages = 0;
  let total = 0;
  const syncedAt = new Date().toISOString();
  const seenIds = new Set<string>();

  while (url && pages < MAX_PAGES) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return json({ error: `Could not reach Shopify (${msg})` }, 502);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return json({ error: `Shopify ${res.status}: ${text}` }, 502);
    }
    const payload = (await res.json().catch(() => ({}))) as {
      products?: ShopifyProduct[];
    };
    const list = Array.isArray(payload.products) ? payload.products : [];
    if (list.length > 0) {
      const rows = list.map((p) => toRow(brandId, p, syncedAt));
      for (const r of rows) seenIds.add(r.shopify_product_id);
      const { error: upErr } = await admin
        .from("shopify_products")
        .upsert(rows, { onConflict: "brand_id,shopify_product_id" });
      if (upErr) {
        return json({ error: `Upsert failed: ${upErr.message}` }, 500);
      }
      total += rows.length;
    }
    pages += 1;
    url = parseNextLink(res.headers.get("link"));
  }

  // Remove products that no longer exist in Shopify (cleanup stale rows for this brand)
  let removed = 0;
  if (seenIds.size > 0) {
    const ids = Array.from(seenIds);
    // Delete in batches; Postgres handles large IN lists but keep payload size sane
    const CHUNK = 500;
    for (let i = 0; i < ids.length; i += CHUNK) {
      // Each loop deletes anything NOT in this chunk; do a single overall delete instead
      // (single delete with NOT IN on the full list)
      if (i > 0) break;
    }
    const { error: delErr, count } = await admin
      .from("shopify_products")
      .delete({ count: "exact" })
      .eq("brand_id", brandId)
      .not("shopify_product_id", "in", `(${ids.map((id) => `"${id}"`).join(",")})`);
    if (!delErr && typeof count === "number") removed = count;
  }

  return json({
    ok: true,
    pages,
    synced: total,
    removed,
    truncated: pages >= MAX_PAGES,
  });
});
