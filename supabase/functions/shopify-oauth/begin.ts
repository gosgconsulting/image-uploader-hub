import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

function randomStateToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function handleBegin(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Missing authorization" }, { status: 401 });
  }
  const jwt = authHeader.slice(7);

  let body: { shop?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const shopRaw = typeof body.shop === "string" ? body.shop.trim() : "";
  if (!shopRaw) {
    return Response.json({ error: "shop is required" }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const clientId = Deno.env.get("SHOPIFY_CLIENT_ID");
  const scopes =
    Deno.env.get("SHOPIFY_OAUTH_SCOPES") ||
    "read_orders,write_orders";

  if (!supabaseUrl || !serviceKey || !clientId) {
    return Response.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const {
    data: { user },
    error: userErr,
  } = await admin.auth.getUser(jwt);

  if (userErr || !user) {
    return Response.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const host = shopRaw.replace(/^https?:\/\//i, "").split("/")[0].toLowerCase();
  if (!host.endsWith(".myshopify.com")) {
    return Response.json(
      { error: "Shop must be a *.myshopify.com hostname" },
      { status: 400 }
    );
  }

  const redirectUriBase = `${supabaseUrl}/functions/v1/shopify-oauth`;
  const redirectUri = encodeURIComponent(redirectUriBase);
  const state = randomStateToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: insErr } = await admin.from("shopify_oauth_states").insert({
    state,
    user_id: user.id,
    shop_domain: host,
    expires_at: expiresAt,
  });

  if (insErr) {
    return Response.json({ error: "Could not start OAuth" }, { status: 500 });
  }

  const authorizeUrl =
    `https://${host}/admin/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${encodeURIComponent(state)}`;

  return Response.json({ redirectUrl: authorizeUrl });
}
