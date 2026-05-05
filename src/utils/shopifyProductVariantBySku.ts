import { supabase } from "@/integrations/supabase/client";
import {
  buildShopifyAdminApiUrl,
  normalizeShopDomain,
} from "@/lib/shopifyAdminApi";

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

/** Admin search: metafields.custom.referenceparent + prefix wildcard (see Shopify query syntax). */
function shopifyReferenceParentSearchToken(referenceParent: string): string {
  const s = referenceParent.trim();
  if (!s) return "";
  const token = /[\s:"]/.test(s) ? JSON.stringify(s) : s;
  return `metafields.custom.referenceparent:${token}*`;
}

export type ShopifyProductByReferenceHit = {
  productId: string;
  title: string;
};

function numericProductIdFromGid(gid: string): string | null {
  const m = gid.match(/\/Product\/(\d+)\s*$/);
  return m?.[1] ?? null;
}

function parseGetProductByReferenceBody(
  json: Record<string, unknown>,
  preferredRef?: string,
): ShopifyProductByReferenceHit | null {
  const gqlErrors = json.errors;
  if (Array.isArray(gqlErrors) && gqlErrors.length > 0) return null;

  const data = json.data as Record<string, unknown> | undefined;
  const products = data?.products as
    | { edges?: Array<{ node?: Record<string, unknown> }> }
    | undefined;
  const edges = products?.edges ?? [];
  if (edges.length === 0) return null;

  const nodes = edges
    .map((e) => e?.node)
    .filter((n): n is Record<string, unknown> => Boolean(n));

  const want = preferredRef?.trim().toLowerCase();
  let node = nodes[0];
  if (want) {
    const exact = nodes.find((n) => {
      const mf = n.metafield as { value?: string } | null | undefined;
      return String(mf?.value ?? "").trim().toLowerCase() === want;
    });
    if (exact) node = exact;
  }

  const id = String(node.id ?? "");
  const title = node.title;
  const numericId = numericProductIdFromGid(id);
  if (!numericId || title == null) return null;

  return { productId: numericId, title: String(title) };
}

async function functionsAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};

  const expMs = (session.expires_at ?? 0) * 1000;
  if (expMs < Date.now() + 120_000) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session?.access_token) {
      return { Authorization: `Bearer ${data.session.access_token}` };
    }
  }
  return { Authorization: `Bearer ${session.access_token}` };
}

/** Resolve a product by `custom.referenceparent` metafield (prefix search) via Admin GraphQL. */
export async function fetchProductByReferenceParent(
  shop: string,
  adminAccessToken: string,
  referenceParent: string,
): Promise<
  | {
      ok: true;
      hit: ShopifyProductByReferenceHit | null;
      shopifyStatus: number;
    }
  | { ok: false; error: string }
> {
  const shopHost = normalizeShopDomain(shop);
  const trimmedRef = referenceParent.trim();
  const searchQuery = shopifyReferenceParentSearchToken(trimmedRef);
  if (!shopHost || !searchQuery) {
    return { ok: false, error: "Shop and reference parent are required." };
  }
  const token = adminAccessToken.trim();
  if (!token) {
    return { ok: false, error: "Admin API access token is required." };
  }

  const payload = JSON.stringify({
    query: GET_PRODUCT_BY_REFERENCE_PARENT,
    variables: { query: searchQuery },
  });

  if (import.meta.env.DEV) {
    const url = buildShopifyAdminApiUrl(shopHost, "graphql.json");
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": token,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: payload,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return {
        ok: false,
        error: `Could not reach Shopify (${msg}). Check the shop domain and network.`,
      };
    }
    const body = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      const err = body.errors;
      let msg = `Shopify returned ${res.status}`;
      if (typeof err === "string") msg = err;
      else if (err && typeof err === "object") msg = JSON.stringify(err);
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      shopifyStatus: res.status,
      hit: parseGetProductByReferenceBody(body, trimmedRef),
    };
  }

  const headers = await functionsAuthHeaders();
  const { data, error } = await supabase.functions.invoke<
    Record<string, unknown>
  >("shopify-admin-get", {
    body: {
      shopDomain: shopHost,
      kind: "product_by_reference_parent",
      referenceParent: trimmedRef,
      adminAccessToken: token,
    },
    ...(Object.keys(headers).length ? { headers } : {}),
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid response from server" };
  }
  const o = data as Record<string, unknown>;
  if (typeof o.error === "string" && typeof o.shopifyStatus !== "number") {
    return { ok: false, error: o.error };
  }
  if (typeof o.shopifyStatus !== "number" || o.body === undefined) {
    return { ok: false, error: "Invalid response from server" };
  }
  const shopifyStatus = o.shopifyStatus;
  const body = o.body as Record<string, unknown>;
  if (shopifyStatus < 200 || shopifyStatus >= 300) {
    const err = body.errors;
    let msg = `Shopify returned ${shopifyStatus}`;
    if (typeof err === "string") msg = err;
    else if (err && typeof err === "object") msg = JSON.stringify(err);
    return { ok: false, error: msg };
  }

  return {
    ok: true,
    shopifyStatus,
    hit: parseGetProductByReferenceBody(body, trimmedRef),
  };
}
