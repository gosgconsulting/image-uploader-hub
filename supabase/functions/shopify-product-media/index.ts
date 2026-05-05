/**
 * Fetch existing product media (images) from Shopify Admin for a list of product IDs.
 *
 * Used by the import results modal to show users what's already on a product before
 * appending new uploads — imports do NOT replace existing media.
 *
 * POST { brand_id, product_ids: [gid|numeric] } -> { ok, products: { [productId]: { images: [{src, alt, position}] } } }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MAX_PRODUCT_IDS = 50; // bounded to keep one query reasonable

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BRAND_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function toGid(id: string): string {
  const t = id.trim();
  if (t.startsWith("gid://shopify/Product/")) return t;
  if (/^\d+$/.test(t)) return `gid://shopify/Product/${t}`;
  return t; // pass through unrecognized — Shopify will reject if invalid
}

const NODES_QUERY = `query GetProductsMedia($ids: [ID!]!) {
  nodes(ids: $ids) {
    __typename
    ... on Product {
      id
      title
      featuredImage { url altText }
      images(first: 50) { nodes { id url altText } }
    }
  }
}`;

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

  let body: { brand_id?: string; product_ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  if (!BRAND_UUID_RE.test(brandId)) return json({ error: "Invalid brand_id" }, 400);

  const rawIds = Array.isArray(body.product_ids) ? body.product_ids : [];
  const productIds = Array.from(
    new Set(
      rawIds
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length > 0),
    ),
  ).slice(0, MAX_PRODUCT_IDS);
  if (productIds.length === 0) return json({ ok: true, products: {} });

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authorize: brand owner OR active brand_users member.
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

  // Resolve Shopify creds for the brand.
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

  const gids = productIds.map(toGid);
  let shopRes: Response;
  try {
    shopRes = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": cred.access_token as string,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: NODES_QUERY, variables: { ids: gids } }),
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return json({ error: `Could not reach Shopify (${msg})` }, 502);
  }
  if (!shopRes.ok) {
    return json({ error: `Shopify ${shopRes.status}` }, 502);
  }

  type Node = {
    __typename: string;
    id?: string;
    title?: string;
    featuredImage?: { url: string; altText: string | null } | null;
    images?: { nodes: Array<{ id: string; url: string; altText: string | null }> };
  };
  const data = (await shopRes.json().catch(() => ({}))) as {
    data?: { nodes?: Array<Node | null> };
    errors?: unknown;
  };

  const products: Record<
    string,
    {
      title: string | null;
      featured_image: { url: string; alt: string | null } | null;
      gallery: Array<{ id: string; url: string; alt: string | null }>;
    }
  > = {};

  for (const node of data.data?.nodes ?? []) {
    if (!node || node.__typename !== "Product" || !node.id) continue;
    const featured = node.featuredImage
      ? { url: node.featuredImage.url, alt: node.featuredImage.altText }
      : null;
    const gallery = (node.images?.nodes ?? []).map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.altText,
    }));
    products[node.id] = { title: node.title ?? null, featured_image: featured, gallery };
  }

  return json({ ok: true, products });
});
