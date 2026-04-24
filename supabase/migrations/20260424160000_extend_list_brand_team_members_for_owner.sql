-- Extra fields for team table: auth profile dates, inviter email (auth.users not client-readable).
-- Postgres does not allow CREATE OR REPLACE to change OUT/RETURNS TABLE columns; drop then create.

DROP FUNCTION IF EXISTS public.list_brand_team_members_for_owner(uuid);

CREATE FUNCTION public.list_brand_team_members_for_owner(p_brand_id uuid)
RETURNS TABLE (
  id uuid,
  member_user_id uuid,
  member_email text,
  created_at timestamptz,
  account_created_at timestamptz,
  last_sign_in_at timestamptz,
  inviter_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bm.id,
    bm.member_user_id,
    u.email::text,
    bm.created_at,
    u.created_at,
    u.last_sign_in_at,
    inv.email::text
  FROM public.brand_members bm
  JOIN auth.users u ON u.id = bm.member_user_id
  LEFT JOIN auth.users inv ON inv.id = bm.invited_by
  WHERE bm.brand_id = p_brand_id
    AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.list_brand_team_members_for_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_brand_team_members_for_owner(uuid) TO authenticated;
