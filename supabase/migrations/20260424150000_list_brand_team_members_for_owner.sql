-- Brand owners can list operator emails for their brand; auth.users is not queryable from the client.

CREATE OR REPLACE FUNCTION public.list_brand_team_members_for_owner(p_brand_id uuid)
RETURNS TABLE (
  id uuid,
  member_user_id uuid,
  member_email text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bm.id, bm.member_user_id, u.email::text, bm.created_at
  FROM public.brand_members bm
  JOIN auth.users u ON u.id = bm.member_user_id
  WHERE bm.brand_id = p_brand_id
    AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.list_brand_team_members_for_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_brand_team_members_for_owner(uuid) TO authenticated;
