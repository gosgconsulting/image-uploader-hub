import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsHeaders } from "./cors.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(res: unknown, status = 200) {
  return new Response(JSON.stringify(res), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

export async function handleClaim(req: Request, parsedBody?: unknown): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Missing authorization" }, 401);
  }
  const jwt = authHeader.slice(7);

  let body: { shop?: string; claimNonce?: string; brand_id?: string };
  if (parsedBody !== undefined) {
    if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }
    body = parsedBody as { shop?: string; claimNonce?: string; brand_id?: string };
  } else {
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, { status: 400 });
    }
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

  async function resolveBrandIdForClaim(bodyBrand: unknown): Promise<string | null> {
    const trimmed = typeof bodyBrand === "string" ? bodyBrand.trim() : "";
    if (trimmed) {
      const { data: owned } = await admin
        .from("brands")
        .select("id")
        .eq("id", trimmed)
        .eq("user_id", user.id)
        .maybeSingle();
      if (owned?.id) return String(owned.id);
    }
    const { data: first } = await admin
      .from("brands")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    return first?.id ? String(first.id) : null;
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

  const resolvedBrandId = await resolveBrandIdForClaim(body.brand_id);
  if (!resolvedBrandId) {
    return json(
      {
        error:
          "Add a brand in the dashboard (sidebar), then claim this install again while that brand is selected.",
      },
      { status: 400 }
    );
  }

  const { data: credRow, error: upErr } = await admin
    .from("shopify_credentials")
    .upsert(
      {
        user_id: user.id,
        shop_domain: shopHost,
        access_token: pending.access_token as string,
        brand_id: resolvedBrandId,
      },
      { onConflict: "user_id,brand_id" }
    )
    .select("id")
    .single();

  if (upErr) {
    return json({ error: "Could not save credentials" }, { status: 500 });
  }

  await admin.from("shopify_oauth_pending").delete().eq("shop_domain", shopHost);

  return json({
    ok: true,
    shop_domain: shopHost,
    credential_id: credRow?.id ? String(credRow.id) : undefined,
  });
}
