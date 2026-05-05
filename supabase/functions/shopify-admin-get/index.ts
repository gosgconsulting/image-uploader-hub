import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveCredentialsForShopifySessionJwt } from "../_shared/resolveShopifyPartnerAppDb.ts";
import { normalizeShopDomain } from "../shopify-create-refund/refundLogic.ts";
import { resolveRefundAccessToken } from "../shopify-create-refund/resolveRefundAccessToken.ts";
import { verifyShopifySessionToken } from "../shopify-create-refund/verifyShopifySessionToken.ts";

const SHOPIFY_API_VERSION = "2026-04";

const GET_PRODUCT_BY_REFERENCE_PARENT = `query getProductByReferenceParent($query: String!) {
  products(first: 10, query: $query) {
    edges {
      node {
        id
        title
        metafield(namespace: "custom", key: "referenceparent") {
          value
        }
        variants(first: 10) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
}`;

/** Mirrors client: prefix search on custom.referenceparent metafield. */
function shopifyReferenceParentSearchToken(referenceParent: string): string {
  const s = referenceParent.trim();
  if (!s) return "";
  const token = /[\s:"]/.test(s) ? JSON.stringify(s) : s;
  return `metafields.custom.referenceparent:${token}*`;
}

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

/** Admin API host must be a myshopify.com subdomain (avoids open proxy / SSRF). */
function isAllowedMyshopifyHost(host: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host);
}

function jwtHeaderAlg(bearer: string): string | null {
  try {
    const first = bearer.trim().split(".")[0];
    const json = JSON.parse(atob(first.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json?.alg === "string" ? json.alg : null;
  } catch {
    return null;
  }
}

/**
 * When the client sends a Shopify Admin token in the body, still require a caller identity:
 * project anon JWT (unsigned-in SPA), Supabase user JWT, or Shopify session JWT for this shop.
 */
async function authorizeBodyTokenCaller(
  admin: ReturnType<typeof createClient>,
  anonKey: string,
  jwt: string,
  normalizedShop: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const t = jwt.trim();
  if (t && t === anonKey.trim()) {
    return { ok: true };
  }

  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt);
  if (!userErr && user) {
    return { ok: true };
  }

  if (jwtHeaderAlg(jwt) === "HS256") {
    const { clientId, clientSecret } = await resolveCredentialsForShopifySessionJwt(
      admin,
      normalizedShop,
      jwt
    );
    if (!clientId || !clientSecret) {
      return { ok: false, status: 500, error: "Server misconfigured for Shopify session tokens" };
    }
    const session = await verifyShopifySessionToken(jwt, clientId, clientSecret);
    if (!session.ok) {
      return { ok: false, status: 401, error: session.error };
    }
    if (session.shopDomain !== normalizedShop) {
      return {
        ok: false,
        status: 403,
        error: "Session token shop does not match shopDomain in request",
      };
    }
    return { ok: true };
  }

  return { ok: false, status: 401, error: "Invalid or expired session" };
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

  let body: {
    shopDomain?: string;
    kind?: string;
    orderNumericId?: string;
    adminAccessToken?: string;
    referenceParent?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  const orderNumericId =
    typeof body.orderNumericId === "string" ? body.orderNumericId : "";
  const bodyToken =
    typeof body.adminAccessToken === "string" ? body.adminAccessToken.trim() : "";

  const normalizedShop = normalizeShopDomain(shopDomain);
  if (!normalizedShop || !isAllowedMyshopifyHost(normalizedShop)) {
    return json({ error: "Invalid or unsupported shop domain" }, 400);
  }

  let path: string | null = null;
  let graphqlPayload: string | null = null;

  if (kind === "shop") {
    path = `/admin/api/${SHOPIFY_API_VERSION}/shop.json`;
  } else if (kind === "order") {
    if (!/^\d+$/.test(orderNumericId)) {
      return json({ error: "orderNumericId must be digits only" }, 400);
    }
    path = `/admin/api/${SHOPIFY_API_VERSION}/orders/${orderNumericId}.json`;
  } else if (kind === "product_by_reference_parent") {
    const refRaw = typeof body.referenceParent === "string" ? body.referenceParent : "";
    const searchQuery = shopifyReferenceParentSearchToken(refRaw);
    if (!searchQuery) {
      return json(
        { error: "referenceParent is required for product_by_reference_parent" },
        400,
      );
    }
    graphqlPayload = JSON.stringify({
      query: GET_PRODUCT_BY_REFERENCE_PARENT,
      variables: { query: searchQuery },
    });
  } else {
    return json(
      {
        error:
          "kind must be shop, order, or product_by_reference_parent",
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  let accessToken: string;
  if (bodyToken.length > 0) {
    if (!anonKey) {
      return json({ error: "Server misconfigured" }, 500);
    }
    const authz = await authorizeBodyTokenCaller(admin, anonKey, jwt, normalizedShop);
    if (authz.ok === false) {
      return json({ error: authz.error }, authz.status);
    }
    accessToken = bodyToken;
  } else {
    const resolved = await resolveRefundAccessToken(admin, jwt, normalizedShop);
    if (!resolved.ok) {
      return json({ error: resolved.error }, resolved.status);
    }
    accessToken = resolved.accessToken;
  }

  let shopRes: Response;
  try {
    if (graphqlPayload !== null) {
      const gqlUrl = `https://${normalizedShop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
      shopRes = await fetch(gqlUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: graphqlPayload,
      });
    } else if (path !== null) {
      const url = `https://${normalizedShop}${path}`;
      shopRes = await fetch(url, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
        },
      });
    } else {
      return json({ error: "Invalid request shape" }, 500);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return json({ error: `Could not reach Shopify (${msg})` }, 502);
  }

  const data = (await shopRes.json().catch(() => ({}))) as Record<string, unknown>;

  return json({
    shopifyStatus: shopRes.status,
    body: data,
  });
});
