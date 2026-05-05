/**
 * Brand owners list / create / invite users for a brand.
 *
 * Sparti stores per-brand access in `brand_users` (with `auth_user_id` linking to
 * `auth.users`). The `password_hash` column is NOT NULL but is unused for users
 * created here — they authenticate via Supabase Auth, so we store an empty
 * sentinel and rely on `auth.admin.createUser` for credentials.
 *
 * Endpoints (POST body.action):
 *   - "list":              { brand_id }                       -> { ok, users: [...] }
 *   - "list-roles":        { brand_id }                       -> { ok, roles: string[] } (distinct roles in use across owner's brands, with sane defaults)
 *   - "list-known-emails": { brand_id }                       -> { ok, emails: [{email, brand_id, brand_name, has_access}] } across all brands the caller owns
 *   - "create":            { brand_id, email, password,
 *                            first_name?, last_name?, role? } -> { ok, status: "added" | "created" | "already_member" }
 *   - "grant-access":      { brand_id, email, role? }         -> { ok, status: "added" | "already_member" } (only succeeds if email already exists somewhere)
 *   - "generate-link":     { brand_id, email, role? }         -> { ok, action_link, status: "added" | "created" | "already_member" }
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
const PASSWORD_HASH_SENTINEL = ""; // brand_users.password_hash is unused for Supabase-auth users

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

  let body: {
    action?: string;
    brand_id?: string;
    email?: string;
    password?: string;
    first_name?: string | null;
    last_name?: string | null;
    role?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const action = (body.action ?? "").trim();
  const brandId = typeof body.brand_id === "string" ? body.brand_id.trim() : "";
  if (!brandId) return json({ error: "brand_id is required" }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authorize: caller must be the brand owner.
  const { data: brand, error: brandErr } = await admin
    .from("brands")
    .select("id, user_id")
    .eq("id", brandId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (brandErr || !brand?.id) return json({ error: "Brand not found or you do not own it" }, 403);

  if (action === "list") {
    const { data, error } = await admin
      .from("brand_users")
      .select(
        "id, email, first_name, last_name, role, admin_role, is_active, last_login_at, created_at, auth_user_id",
      )
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, users: data ?? [] });
  }

  // Brands the caller owns — used to scope role + email lookups across all their brands.
  async function ownedBrandIds(): Promise<string[]> {
    const { data } = await admin.from("brands").select("id").eq("user_id", user.id);
    return (data ?? []).map((b: { id: string }) => b.id);
  }

  if (action === "list-roles") {
    const ids = await ownedBrandIds();
    const distinct = new Set<string>(["user", "admin"]); // sane defaults matching public.user_role / app_role enums
    if (ids.length > 0) {
      const { data } = await admin
        .from("brand_users")
        .select("role")
        .in("brand_id", ids);
      for (const row of data ?? []) {
        const r = (row as { role: string | null }).role;
        if (r && r.trim()) distinct.add(r.trim());
      }
    }
    return json({ ok: true, roles: Array.from(distinct).sort() });
  }

  if (action === "list-known-emails") {
    const ids = await ownedBrandIds();
    if (ids.length === 0) return json({ ok: true, emails: [] });
    const { data: rows, error: rowsErr } = await admin
      .from("brand_users")
      .select("email, brand_id, role, auth_user_id, brands:brand_id (name)")
      .in("brand_id", ids);
    if (rowsErr) return json({ error: rowsErr.message }, 500);
    const out = (rows ?? []).map(
      (r: {
        email: string;
        brand_id: string;
        role: string | null;
        auth_user_id: string | null;
        brands: { name: string | null } | null;
      }) => ({
        email: r.email,
        brand_id: r.brand_id,
        brand_name: r.brands?.name ?? null,
        role: r.role,
        auth_user_id: r.auth_user_id,
        has_access: r.brand_id === brandId,
      }),
    );
    return json({ ok: true, emails: out });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !EMAIL_RE.test(email)) return json({ error: "Valid email required" }, 400);

  const role = typeof body.role === "string" && body.role.trim() ? body.role.trim() : "member";
  const firstName = typeof body.first_name === "string" ? body.first_name.trim() || null : null;
  const lastName = typeof body.last_name === "string" ? body.last_name.trim() || null : null;

  // Find or create the auth user.
  async function findOrCreateAuthUser(initialPassword?: string) {
    const { data: existingId } = await admin.rpc("find_auth_user_id_by_email", { p_email: email });
    if (typeof existingId === "string" && existingId) {
      return { id: existingId, created: false as const };
    }
    if (!initialPassword || initialPassword.length < MIN_PASSWORD_LEN) {
      return { error: `Initial password must be at least ${MIN_PASSWORD_LEN} characters.` as const };
    }
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: initialPassword,
      email_confirm: true,
      user_metadata: { invited_brand_id: brandId },
    });
    if (createErr || !created.user?.id) {
      return { error: createErr?.message || "Could not create account for this email" };
    }
    return { id: created.user.id, created: true as const };
  }

  async function upsertBrandUser(authUserId: string) {
    const { data: existing } = await admin
      .from("brand_users")
      .select("id")
      .eq("brand_id", brandId)
      .eq("email", email)
      .maybeSingle();
    if (existing?.id) {
      await admin
        .from("brand_users")
        .update({ auth_user_id: authUserId, is_active: true })
        .eq("id", existing.id);
      return "already_member" as const;
    }
    const { error: insErr } = await admin.from("brand_users").insert({
      brand_id: brandId,
      email,
      password_hash: PASSWORD_HASH_SENTINEL,
      auth_user_id: authUserId,
      first_name: firstName,
      last_name: lastName,
      role,
      is_active: true,
    });
    if (insErr) {
      // Race: unique violation -> treat as already member.
      if (insErr.code === "23505") return "already_member" as const;
      throw new Error(insErr.message || "Could not insert brand_users row");
    }
    return "added" as const;
  }

  if (action === "grant-access") {
    if (email === user.email?.toLowerCase()) return json({ error: "You cannot add yourself" }, 400);
    const { data: existingId } = await admin.rpc("find_auth_user_id_by_email", { p_email: email });
    if (!(typeof existingId === "string" && existingId)) {
      return json({ error: "No existing user with that email — create them first." }, 404);
    }
    try {
      const status = await upsertBrandUser(existingId);
      return json({ ok: true, status });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  if (action === "create") {
    if (email === user.email?.toLowerCase()) return json({ error: "You cannot add yourself" }, 400);
    const result = await findOrCreateAuthUser(body.password);
    if ("error" in result) return json({ error: result.error }, 400);
    try {
      const memberStatus = await upsertBrandUser(result.id);
      const status = result.created ? "created" : memberStatus;
      return json({ ok: true, status });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
  }

  if (action === "generate-link") {
    if (email === user.email?.toLowerCase()) return json({ error: "You cannot add yourself" }, 400);

    // Look up existing auth user.
    const { data: existingId } = await admin.rpc("find_auth_user_id_by_email", { p_email: email });
    const linkType = typeof existingId === "string" && existingId ? "magiclink" : "invite";

    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { data: { invited_brand_id: brandId } },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      return json({ error: linkErr?.message || "Could not generate link" }, 400);
    }

    // Ensure brand access. For invite links the user gets created by generateLink itself;
    // their id lives at linkData.user.id.
    const authUserId =
      typeof existingId === "string" && existingId ? existingId : linkData.user?.id;
    if (!authUserId) return json({ error: "Could not resolve invited user id" }, 500);

    let memberStatus: "added" | "already_member" | "created";
    try {
      memberStatus = await upsertBrandUser(authUserId);
      if (linkType === "invite") memberStatus = "created";
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : String(e) }, 500);
    }
    return json({
      ok: true,
      action_link: linkData.properties.action_link,
      status: memberStatus,
    });
  }

  return json({ error: "Unknown action" }, 400);
});
