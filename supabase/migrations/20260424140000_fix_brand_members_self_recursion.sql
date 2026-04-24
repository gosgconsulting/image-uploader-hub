-- brand_members SELECT had a third OR that queried brand_members again, re-entering the same
-- policy → infinite recursion. Co-member visibility is not required (Team UI is owner-only).

DROP POLICY IF EXISTS "brand_members_select" ON public.brand_members;

CREATE POLICY "brand_members_select"
  ON public.brand_members FOR SELECT TO authenticated
  USING (
    member_user_id = auth.uid()
    OR public.brand_is_owned_by(brand_id, auth.uid())
  );
