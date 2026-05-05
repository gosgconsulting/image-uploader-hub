import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { resolveCredentialAndVerifyImport } from "./authorizeBrandImport.ts";
import { coerceProductRows, groupSortedByProductId } from "./groupAndSortProducts.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MEDIA_BATCH = 20;

const ADD_PRODUCT_MEDIA = `mutation AddProductImages($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media {
      id
      alt
      status
      ... on MediaImage {
        image {
          url
        }
      }
    }
    mediaUserErrors {
      field
      message
    }
  }
}`;

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

type GqlMutationResult = {
  errors?: unknown;
  data?: {
    productCreateMedia?: {
      mediaUserErrors?: Array<{ message?: string }>;
    };
  };
};

async function productCreateMediaBatches(
  shopHost: string,
  accessToken: string,
  productId: string,
  mediaInputs: Array<{ mediaContentType: "IMAGE"; originalSource: string; alt: string }>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const gqlUrl = `https://${shopHost}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  for (let i = 0; i < mediaInputs.length; i += MEDIA_BATCH) {
    const chunk = mediaInputs.slice(i, i + MEDIA_BATCH);
    const variables = { productId, media: chunk };
    let raw: GqlMutationResult;
    try {
      const shopRes = await fetch(gqlUrl, {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ADD_PRODUCT_MEDIA,
          variables,
        }),
      });
      raw = (await shopRes.json()) as GqlMutationResult;
      if (!shopRes.ok) {
        const msg =
          typeof raw.errors !== "undefined"
            ? JSON.stringify(raw.errors)
            : `Shopify HTTP ${shopRes.status}`;
        return { ok: false, message: msg };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      return { ok: false, message: `Shopify request failed: ${msg}` };
    }

    const gqlErrors = raw.errors;
    if (Array.isArray(gqlErrors) && gqlErrors.length > 0) {
      return { ok: false, message: `GraphQL: ${JSON.stringify(gqlErrors)}` };
    }

    const userErrors = raw.data?.productCreateMedia?.mediaUserErrors ?? [];
    if (userErrors.length > 0) {
      const first = userErrors[0]?.message ?? JSON.stringify(userErrors);
      return { ok: false, message: first };
    }
  }

  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, message: "Missing authorization" }, 401);
  }
  const jwt = authHeader.slice(7);

  let body: {
    brand_id?: string;
    import_id?: string;
    batch_name?: string | null;
    timestamp?: string;
    products?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return json({ success: false, message: "Invalid JSON body" }, 200);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  const importId = typeof body.import_id === "string" ? body.import_id.trim() : "";
  const productsRaw = body.products;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ success: false, message: "Server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
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

  const rows = coerceProductRows(productsRaw);
  if (rows.length === 0) {
    return json({ success: false, message: "No valid products to upload" }, 200);
  }

  const grouped = groupSortedByProductId(rows);

  for (const [productGid, list] of grouped) {
    const productName =
      list.find((r) => (r.productname ?? "").trim() !== "")?.productname ??
      list[0]?.file_name ??
      "Product";

    const mediaInputs = list.map((item) => {
      const fname = item.original_file_name || item.file_name || "image";
      return {
        mediaContentType: "IMAGE" as const,
        originalSource: item.file_url,
        alt: `${productName} - ${fname}`,
      };
    });

    const result = await productCreateMediaBatches(
      cred.shopDomain,
      cred.accessToken,
      productGid,
      mediaInputs
    );

    if (!result.ok) {
      return json(
        {
          success: false,
          message: result.message,
          failed_product_id: productGid,
        },
        200
      );
    }
  }

  return json({ success: true });
});
