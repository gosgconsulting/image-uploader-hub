/**
 * Brand owners add operators by email. Existing Auth users join `brand_members` immediately.
 * New users are created with `createUser` using the owner-supplied initial password (min 8 chars).
 */
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const MIN_PASSWORD_LEN = 8;

function isValidNewUserPassword(raw: unknown): raw is string {
  return typeof raw === "string" && raw.length >= MIN_PASSWORD_LEN;
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ error: "Server misconfigured" }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return json({ error: "Invalid or expired session" }, 401);
  }

  let body: { brand_id?: string; email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const passwordRaw = body.password;
  if (!brandId || !email || !EMAIL_RE.test(email)) {
    return json({ error: "brand_id and a valid email are required" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (brandErr || !brand?.id) {
    return json({ error: "Brand not found or you do not own it" }, 403);
  }

  if (email === user.email?.toLowerCase()) {
    return json({ error: "You cannot invite yourself" }, 400);
  }

  const { data: existingId, error: lookupErr } = await admin.rpc("find_auth_user_id_by_email", {
    p_email: email,
  });

  if (lookupErr) {
    return json({ error: lookupErr.message || "Could not look up user" }, 500);
  }

  const memberId = typeof existingId === "string" ? existingId : null;

  if (memberId) {
    const { error: insErr } = await admin.from("brand_members").insert({
      brand_id: brandId,
      member_user_id: memberId,
      invited_by: user.id,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        return json({ ok: true, status: "already_member" as const });
      }
      return json({ error: insErr.message || "Could not add member" }, 400);
    }
    return json({ ok: true, status: "added" as const });
  }

  if (!isValidNewUserPassword(passwordRaw)) {
    return json(
      {
        error: `Initial password must be at least ${MIN_PASSWORD_LEN} characters to create a new account.`,
      },
      400
    );
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: passwordRaw,
    email_confirm: true,
    user_metadata: { invited_brand_id: brandId },
  });

  if (createErr || !created.user?.id) {
    return json(
      { error: createErr?.message || "Could not create account for this email" },
      createErr?.status ?? 400
    );
  }

  const { error: memIns } = await admin.from("brand_members").insert({
    brand_id: brandId,
    member_user_id: created.user.id,
    invited_by: user.id,
  });
  if (memIns && memIns.code !== "23505") {
    return json({ error: memIns.message || "Could not attach new user to brand" }, 500);
  }
  return json({ ok: true, status: "created" as const });
});
