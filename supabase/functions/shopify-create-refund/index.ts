import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { normalizeShopDomain, pickParentAndRefundAmount } from "./refundLogic.ts";
import { formatShopifyError, normalizeTransactions, shopifyJson } from "./shopifyHttp.ts";
import { resolveRefundAccessToken } from "./resolveRefundAccessToken.ts";

const SHOPIFY_API_VERSION = "2026-04";
const MAX_BATCH = 40;

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

  let body: { shopDomain?: string; refundIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const shopDomain = typeof body.shopDomain === "string" ? body.shopDomain : "";
  const refundIds = Array.isArray(body.refundIds) ? body.refundIds : [];
  const normalizedShop = normalizeShopDomain(shopDomain);
  if (!normalizedShop || refundIds.length === 0) {
    return json({ error: "shopDomain and refundIds are required" }, 400);
  }
  if (refundIds.length > MAX_BATCH) {
    return json({ error: `At most ${MAX_BATCH} refunds per request` }, 400);
  }
  for (const id of refundIds) {
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
      return json({ error: "Invalid refund id" }, 400);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const resolved = await resolveRefundAccessToken(admin, jwt, normalizedShop);
  if (!resolved.ok) {
    return json({ error: resolved.error }, resolved.status);
  }
  const { accessToken, credentialId } = resolved;
  const results: Array<{
    id: string;
    ok: boolean;
    skipped?: boolean;
    shopifyRefundId?: string;
    error?: string;
  }> = [];

  for (const refundId of refundIds) {
    let rowQuery = admin
      .from("refunds")
      .select(
        "id, status, shopify_numeric_order_id, calculated_refund, shopify_refund_id, reason_of_return"
      )
      .eq("id", refundId)
      .is("deleted_at", null);
    if (credentialId) {
      rowQuery = rowQuery.eq("shopify_credential_id", credentialId);
    } else {
      rowQuery = rowQuery.eq("shop_domain", normalizedShop);
    }
    const { data: row, error: rowErr } = await rowQuery.maybeSingle();

    if (rowErr || !row) {
      results.push({ id: refundId, ok: false, error: "Refund row not found" });
      continue;
    }

    if (row.shopify_refund_id) {
      results.push({ id: refundId, ok: true, skipped: true, shopifyRefundId: row.shopify_refund_id });
      continue;
    }

    const orderId = row.shopify_numeric_order_id as string | null;
    if (!orderId) {
      await admin
        .from("refunds")
        .update({
          status: "failed",
          shopify_refund_error: "Missing Shopify order id",
          shopify_refund_attempted_at: new Date().toISOString(),
        })
        .eq("id", refundId);
      results.push({ id: refundId, ok: false, error: "Missing Shopify order id" });
      continue;
    }

    const desired = Number(row.calculated_refund);
    if (!Number.isFinite(desired) || desired <= 0) {
      await admin
        .from("refunds")
        .update({
          status: "failed",
          shopify_refund_error: "Invalid calculated_refund",
          shopify_refund_attempted_at: new Date().toISOString(),
        })
        .eq("id", refundId);
      results.push({ id: refundId, ok: false, error: "Invalid calculated_refund" });
      continue;
    }

    await admin
      .from("refunds")
      .update({
        status: "processing",
        shopify_refund_attempted_at: new Date().toISOString(),
        shopify_refund_error: null,
      })
      .eq("id", refundId);

    const txPath = `/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}/transactions.json`;
    const txRes = await shopifyJson(normalizedShop, txPath, accessToken);

    if (!txRes.ok) {
      const msg = formatShopifyError(txRes.data, txRes.status);
      await admin
        .from("refunds")
        .update({ status: "failed", shopify_refund_error: msg })
        .eq("id", refundId);
      results.push({ id: refundId, ok: false, error: msg });
      continue;
    }

    const rawTx = txRes.data.transactions as unknown;
    const transactions = normalizeTransactions(rawTx);
    const picked = pickParentAndRefundAmount(transactions, desired);

    if (!picked.ok) {
      await admin
        .from("refunds")
        .update({ status: "failed", shopify_refund_error: picked.error })
        .eq("id", refundId);
      results.push({ id: refundId, ok: false, error: picked.error });
      continue;
    }

    const note = String(row.reason_of_return || "").slice(0, 500);
    const refundBody = {
      refund: {
        notify: true,
        note: note || `Refund queue ${refundId}`,
        transactions: [
          {
            parent_id: picked.parentId,
            amount: picked.refundAmount,
            kind: "refund",
            gateway: picked.gateway,
          },
        ],
      },
    };

    const refundPath = `/admin/api/${SHOPIFY_API_VERSION}/orders/${orderId}/refunds.json`;
    const refundRes = await shopifyJson(normalizedShop, refundPath, accessToken, {
      method: "POST",
      body: JSON.stringify(refundBody),
    });

    if (!refundRes.ok) {
      const msg = formatShopifyError(refundRes.data, refundRes.status);
      await admin
        .from("refunds")
        .update({ status: "failed", shopify_refund_error: msg })
        .eq("id", refundId);
      results.push({ id: refundId, ok: false, error: msg });
      continue;
    }

    const refundObj = refundRes.data.refund as Record<string, unknown> | undefined;
    const shopifyRefundId =
      refundObj && refundObj.id !== undefined ? String(refundObj.id) : undefined;

    await admin
      .from("refunds")
      .update({
        status: "completed",
        shopify_refund_id: shopifyRefundId ?? null,
        shopify_refund_error: null,
      })
      .eq("id", refundId);

    results.push({
      id: refundId,
      ok: true,
      shopifyRefundId,
    });

    await new Promise((r) => setTimeout(r, 350));
  }

  return json({ results });
});
