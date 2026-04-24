import { supabase } from "@/integrations/supabase/client";

export type BrandTeamInviteResult =
  | { ok: true; status: "added" | "created" | "already_member" }
  | { ok: false; error: string };

/** `password` is required for new emails (min 8 chars); ignored when the email already has an account. */
export async function inviteBrandTeamMember(
  brandId: string,
  email: string,
  password: string
): Promise<BrandTeamInviteResult> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "You must be signed in to invite team members." };
  }

  const { data, error } = await supabase.functions.invoke<{
    ok?: boolean;
    status?: "added" | "created" | "already_member";
    error?: string;
  }>("brand-team-invite", {
    body: { brand_id: brandId.trim(), email: email.trim(), password },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data?.ok && data.status) {
    return { ok: true, status: data.status };
  }
  return { ok: false, error: data?.error || "Invite failed." };
}
