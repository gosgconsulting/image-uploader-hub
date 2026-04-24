-- Break RLS cycle: brands → brand_members → EXISTS(brands) → brands (infinite recursion).
-- Owner checks use SECURITY DEFINER so they do not re-enter brands row policies.

CREATE OR REPLACE FUNCTION public.brand_is_owned_by(p_brand_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id = p_brand_id AND b.user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.brand_is_owned_by(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.brand_is_owned_by(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "brand_members_select" ON public.brand_members;

CREATE POLICY "brand_members_select"
  ON public.brand_members FOR SELECT TO authenticated
  USING (
    member_user_id = auth.uid()
    OR public.brand_is_owned_by(brand_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.brand_members bm
      WHERE bm.brand_id = brand_members.brand_id AND bm.member_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "brand_members_insert_owner_only" ON public.brand_members;

CREATE POLICY "brand_members_insert_owner_only"
  ON public.brand_members FOR INSERT TO authenticated
  WITH CHECK (public.brand_is_owned_by(brand_id, auth.uid()));

DROP POLICY IF EXISTS "brand_members_delete_owner_only" ON public.brand_members;

CREATE POLICY "brand_members_delete_owner_only"
  ON public.brand_members FOR DELETE TO authenticated
  USING (public.brand_is_owned_by(brand_id, auth.uid()));
