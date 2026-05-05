import { supabase } from "@/integrations/supabase/client";

export type BrandUserRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  admin_role: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  auth_user_id: string | null;
};

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

async function authedInvoke<T>(body: Record<string, unknown>): Promise<Ok<T> | Err> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "You must be signed in." };
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string } & T>(
    "brand-users-manage",
    { body, headers: { Authorization: `Bearer ${session.access_token}` } },
  );
  if (error) return { ok: false, error: error.message };
  if (!data?.ok) return { ok: false, error: data?.error ?? "Request failed" };
  return data as Ok<T>;
}

export type KnownEmailRow = {
  email: string;
  brand_id: string;
  brand_name: string | null;
  role: string | null;
  auth_user_id: string | null;
  has_access: boolean;
};

export function listBrandUsers(brandId: string) {
  return authedInvoke<{ users: BrandUserRow[] }>({ action: "list", brand_id: brandId });
}

export function listBrandUserRoles(brandId: string) {
  return authedInvoke<{ roles: string[] }>({ action: "list-roles", brand_id: brandId });
}

export function listKnownEmails(brandId: string) {
  return authedInvoke<{ emails: KnownEmailRow[] }>({
    action: "list-known-emails",
    brand_id: brandId,
  });
}

export function grantBrandAccess(args: { brandId: string; email: string; role?: string }) {
  return authedInvoke<{ status: "added" | "already_member" }>({
    action: "grant-access",
    brand_id: args.brandId,
    email: args.email,
    role: args.role ?? null,
  });
}

export function createBrandUser(args: {
  brandId: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}) {
  return authedInvoke<{ status: "added" | "created" | "already_member" }>({
    action: "create",
    brand_id: args.brandId,
    email: args.email,
    password: args.password,
    first_name: args.firstName ?? null,
    last_name: args.lastName ?? null,
    role: args.role ?? null,
  });
}

export function generateBrandUserSignupLink(args: {
  brandId: string;
  email: string;
  role?: string;
}) {
  return authedInvoke<{
    action_link: string;
    status: "added" | "created" | "already_member";
  }>({
    action: "generate-link",
    brand_id: args.brandId,
    email: args.email,
    role: args.role ?? null,
  });
}
