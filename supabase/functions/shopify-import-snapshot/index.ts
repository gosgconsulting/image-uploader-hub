/**
 * Snapshot the current Shopify media of every product touched by an import,
 * BEFORE any productCreateMedia / productDeleteMedia call runs. Stores into
 * `shopify_import_snapshots` so a later restore can re-add the URLs.
 *
 * POST { brand_id, import_id, product_ids } -> { ok, snapshots: number }
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";

const SHOPIFY_API_VERSION = "2026-04";
const NODES_PER_QUERY = 50;
const MAX_PRODUCTS = 500;

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

function toGid(id: string): string {
  const t = id.trim();
  if (t.startsWith("gid://shopify/Product/")) return t;
  if (/^\d+$/.test(t)) return `gid://shopify/Product/${t}`;
  return t;
}

const NODES_QUERY = `query SnapshotProducts($ids: [ID!]!) {
  nodes(ids: $ids) {
    __typename
    ... on Product {
      id
      title
      featuredImage { url altText }
      images(first: 100) { nodes { id url altText } }
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

  let body: { brand_id?: string; import_id?: string; product_ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  const importId = typeof body.import_id === "string" ? body.import_id.trim() : "";
  if (!UUID_RE.test(brandId)) return json({ error: "Invalid brand_id" }, 400);
  if (!UUID_RE.test(importId)) return json({ error: "Invalid import_id" }, 400);

  const rawIds = Array.isArray(body.product_ids) ? body.product_ids : [];
  const productIds = Array.from(
    new Set(
      rawIds
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter((v) => v.length > 0),
    ),
  ).slice(0, MAX_PRODUCTS);
  if (productIds.length === 0) return json({ ok: true, snapshots: 0 });

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

  // Confirm import belongs to this brand.
  const { data: imp } = await admin
    .from("shopify_imports")
    .select("id, brand_id")
    .eq("id", importId)
    .maybeSingle();
  if (!imp || (imp as { brand_id?: string }).brand_id !== brandId) {
    return json({ error: "Import not found for this brand" }, 404);
  }

  // Resolve Shopify creds.
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

  // Fetch in chunks of 50.
  type Node = {
    __typename: string;
    id?: string;
    title?: string;
    featuredImage?: { url: string; altText: string | null } | null;
    images?: { nodes: Array<{ id: string; url: string; altText: string | null }> };
  };

  const inserts: Array<Record<string, unknown>> = [];
  const gids = productIds.map(toGid);

  for (let i = 0; i < gids.length; i += NODES_PER_QUERY) {
    const chunk = gids.slice(i, i + NODES_PER_QUERY);
    let res: Response;
    try {
      res = await fetch(
        `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
        {
          method: "POST",
          headers: {
            "X-Shopify-Access-Token": cred.access_token as string,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query: NODES_QUERY, variables: { ids: chunk } }),
        },
      );
    } catch (e) {
      return json(
        { error: `Could not reach Shopify (${e instanceof Error ? e.message : "network"})` },
        502,
      );
    }
    if (!res.ok) return json({ error: `Shopify ${res.status}` }, 502);
    const data = (await res.json().catch(() => ({}))) as {
      data?: { nodes?: Array<Node | null> };
    };
    for (const node of data.data?.nodes ?? []) {
      if (!node || node.__typename !== "Product" || !node.id) continue;
      const featured = node.featuredImage ?? null;
      const gallery = (node.images?.nodes ?? []).map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.altText,
      }));
      inserts.push({
        import_id: importId,
        brand_id: brandId,
        shopify_product_id: node.id,
        shopify_product_name: node.title ?? null,
        featured_image_url: featured?.url ?? null,
        featured_image_alt: featured?.altText ?? null,
        gallery,
      });
    }
  }

  if (inserts.length === 0) return json({ ok: true, snapshots: 0 });

  const { error: insErr } = await admin.from("shopify_import_snapshots").insert(inserts);
  if (insErr) return json({ error: insErr.message }, 500);

  return json({ ok: true, snapshots: inserts.length });
});
