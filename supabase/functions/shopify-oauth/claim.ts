import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function normalizeShopHost(raw: string): string | null {
  const host = raw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase().trim();
  if (!host.endsWith(".myshopify.com")) return null;
  return host;
}

type PendingRow = {
  shop_domain: string;
  access_token: string;
  expires_at: string;
};

export async function handleClaim(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }
  const jwt = authHeader.slice(7);

  let body: { shop?: string; claimNonce?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawNonce = typeof body.claimNonce === "string" ? body.claimNonce.trim() : "";
  const nonceOk = rawNonce.length > 0 && UUID_RE.test(rawNonce);

  const shopRaw = typeof body.shop === "string" ? body.shop.trim() : "";
  const shopFromBody = shopRaw ? normalizeShopHost(shopRaw) : null;

  if (!nonceOk && !shopFromBody) {
    return json(
      { error: "Provide claimNonce (from OAuth redirect) or shop (*.myshopify.com)." },
      { status: 400 }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt);

  if (userErr || !user) {
    return json({ error: "Invalid or expired session" }, { status: 401 });
  }

  let pending: PendingRow | null = null;

  if (nonceOk) {
    const { data, error } = await admin
      .from("shopify_oauth_pending")
      .select("shop_domain, access_token, expires_at")
      .eq("claim_nonce", rawNonce)
      .maybeSingle();
    if (error) {
      return json({ error: "Could not load pending install" }, { status: 500 });
    }
    pending = data as PendingRow | null;
  }

  if (!pending?.access_token && shopFromBody) {
    const { data, error } = await admin
      .from("shopify_oauth_pending")
      .select("shop_domain, access_token, expires_at")
      .eq("shop_domain", shopFromBody)
      .maybeSingle();
    if (error) {
      return json({ error: "Could not load pending install" }, { status: 500 });
    }
    pending = (data as PendingRow | null) ?? pending;
  }

  if (!pending?.access_token) {
    return json(
      {
        error:
          "No pending install for this claim. Complete OAuth from Shopify Admin again, then try while signed in here.",
      },
      { status: 400 }
    );
  }

  const shopHost = String(pending.shop_domain).toLowerCase();

  const exp = new Date(String(pending.expires_at)).getTime();
  if (!Number.isFinite(exp) || Date.now() > exp) {
    await admin.from("shopify_oauth_pending").delete().eq("shop_domain", shopHost);
    return json({ error: "Install link expired. Re-open the app from Shopify Admin." }, { status: 400 });
  }

  const { error: upErr } = await admin.from("shopify_credentials").upsert(
    {
      user_id: user.id,
      shop_domain: shopHost,
      access_token: pending.access_token as string,
    },
    { onConflict: "user_id,shop_domain" }
  );

  if (upErr) {
    return json({ error: "Could not save credentials" }, { status: 500 });
  }

  await admin.from("shopify_oauth_pending").delete().eq("shop_domain", shopHost);

  return json({ ok: true, shop_domain: shopHost });
}
