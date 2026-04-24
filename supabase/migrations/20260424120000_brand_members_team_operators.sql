-- Team operators: per-brand members share Image Upload + Refund; owners retain Shopify + team management.

-- ---------------------------------------------------------------------------
-- brand_members
-- ---------------------------------------------------------------------------
CREATE TABLE public.brand_members (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  member_user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brand_members_brand_member_unique UNIQUE (brand_id, member_user_id)
);

CREATE INDEX brand_members_brand_id_idx ON public.brand_members (brand_id);
CREATE INDEX brand_members_member_user_id_idx ON public.brand_members (member_user_id);

CREATE OR REPLACE FUNCTION public.enforce_brand_member_not_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT b.user_id INTO owner_id FROM public.brands b WHERE b.id = NEW.brand_id;
  IF owner_id IS NOT NULL AND NEW.member_user_id = owner_id THEN
    RAISE EXCEPTION 'Brand owner cannot be added as a member row';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_brand_member_not_owner_trg ON public.brand_members;
CREATE TRIGGER enforce_brand_member_not_owner_trg
  BEFORE INSERT OR UPDATE OF brand_id, member_user_id ON public.brand_members
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_brand_member_not_owner();

ALTER TABLE public.brand_members ENABLE ROW LEVEL SECURITY;

-- Members see rows for brands they belong to; owners see all members for their brands.
CREATE POLICY "brand_members_select"
  ON public.brand_members FOR SELECT TO authenticated
  USING (
    member_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.brand_members bm
      WHERE bm.brand_id = brand_members.brand_id AND bm.member_user_id = auth.uid()
    )
  );

CREATE POLICY "brand_members_insert_owner_only"
  ON public.brand_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );

CREATE POLICY "brand_members_delete_owner_only"
  ON public.brand_members FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- shopify_credentials.user_id must match brand owner (prevents stray rows)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_shopify_credentials_brand_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT b.user_id INTO owner_id FROM public.brands b WHERE b.id = NEW.brand_id;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Invalid brand_id for shopify_credentials';
  END IF;
  IF NEW.user_id IS DISTINCT FROM owner_id THEN
    RAISE EXCEPTION 'shopify_credentials.user_id must match brands.user_id for this brand';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_shopify_credentials_brand_owner_trg ON public.shopify_credentials;
CREATE TRIGGER enforce_shopify_credentials_brand_owner_trg
  BEFORE INSERT OR UPDATE OF user_id, brand_id ON public.shopify_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_shopify_credentials_brand_owner();

-- ---------------------------------------------------------------------------
-- brands: allow operators to read brands they are members of
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own brands" ON public.brands;

CREATE POLICY "Users read own brands"
  ON public.brands FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR id IN (SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- shopify_credentials: operators can read owner token for shared brands
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own shopify_credentials" ON public.shopify_credentials;

CREATE POLICY "Users read_accessible_shopify_credentials"
  ON public.shopify_credentials FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR brand_id IN (SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid())
  );

-- Tighten write policies: only the row owner, and brand must be owned by that user
DROP POLICY IF EXISTS "Users insert own shopify_credentials" ON public.shopify_credentials;
DROP POLICY IF EXISTS "Users update own shopify_credentials" ON public.shopify_credentials;
DROP POLICY IF EXISTS "Users delete own shopify_credentials" ON public.shopify_credentials;

CREATE POLICY "Users insert_own_brand_shopify_credentials"
  ON public.shopify_credentials FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );

CREATE POLICY "Users update_own_brand_shopify_credentials"
  ON public.shopify_credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );

CREATE POLICY "Users delete_own_brand_shopify_credentials"
  ON public.shopify_credentials FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.brands b WHERE b.id = brand_id AND b.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- refunds: owner or brand member may use credential rows for that brand
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "authenticated_select_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_insert_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_update_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_delete_own_refunds" ON public.refunds;

CREATE POLICY "authenticated_select_own_refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT sc.id
      FROM public.shopify_credentials sc
      WHERE sc.user_id = auth.uid()
         OR sc.brand_id IN (
           SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
         )
    )
  );

CREATE POLICY "authenticated_insert_own_refunds"
  ON public.refunds FOR INSERT TO authenticated
  WITH CHECK (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT sc.id
      FROM public.shopify_credentials sc
      WHERE sc.user_id = auth.uid()
         OR sc.brand_id IN (
           SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
         )
    )
  );

CREATE POLICY "authenticated_update_own_refunds"
  ON public.refunds FOR UPDATE TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT sc.id
      FROM public.shopify_credentials sc
      WHERE sc.user_id = auth.uid()
         OR sc.brand_id IN (
           SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
         )
    )
  )
  WITH CHECK (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT sc.id
      FROM public.shopify_credentials sc
      WHERE sc.user_id = auth.uid()
         OR sc.brand_id IN (
           SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
         )
    )
  );

CREATE POLICY "authenticated_delete_own_refunds"
  ON public.refunds FOR DELETE TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT sc.id
      FROM public.shopify_credentials sc
      WHERE sc.user_id = auth.uid()
         OR sc.brand_id IN (
           SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
         )
    )
  );

-- ---------------------------------------------------------------------------
-- imports / import_images: scope to brand owner or member (not wide open)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow all access to imports" ON public.imports;
DROP POLICY IF EXISTS "Allow all access to import_images" ON public.import_images;

CREATE POLICY "imports_select_brand_scoped"
  ON public.imports FOR SELECT TO authenticated
  USING (
    brand_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = imports.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "imports_insert_brand_scoped"
  ON public.imports FOR INSERT TO authenticated
  WITH CHECK (
    brand_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = imports.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "imports_update_brand_scoped"
  ON public.imports FOR UPDATE TO authenticated
  USING (
    brand_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = imports.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  )
  WITH CHECK (
    brand_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = imports.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "imports_delete_brand_scoped"
  ON public.imports FOR DELETE TO authenticated
  USING (
    brand_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = imports.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "import_images_select_brand_scoped"
  ON public.import_images FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.imports i
      WHERE i.id = import_images.import_id
        AND i.brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.brands b
          WHERE b.id = i.brand_id
            AND (
              b.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.brand_members bm
                WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
              )
            )
        )
    )
  );

CREATE POLICY "import_images_insert_brand_scoped"
  ON public.import_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.imports i
      WHERE i.id = import_images.import_id
        AND i.brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.brands b
          WHERE b.id = i.brand_id
            AND (
              b.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.brand_members bm
                WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
              )
            )
        )
    )
  );

CREATE POLICY "import_images_update_brand_scoped"
  ON public.import_images FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.imports i
      WHERE i.id = import_images.import_id
        AND i.brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.brands b
          WHERE b.id = i.brand_id
            AND (
              b.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.brand_members bm
                WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
              )
            )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.imports i
      WHERE i.id = import_images.import_id
        AND i.brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.brands b
          WHERE b.id = i.brand_id
            AND (
              b.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.brand_members bm
                WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
              )
            )
        )
    )
  );

CREATE POLICY "import_images_delete_brand_scoped"
  ON public.import_images FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.imports i
      WHERE i.id = import_images.import_id
        AND i.brand_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.brands b
          WHERE b.id = i.brand_id
            AND (
              b.user_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM public.brand_members bm
                WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
              )
            )
        )
    )
  );

-- Team membership for new invites is inserted by the `brand-team-invite` Edge Function
-- after `inviteUserByEmail` (avoids requiring triggers on `auth.users`).

-- Service role only: resolve email → user id for Edge invite flow
CREATE OR REPLACE FUNCTION public.find_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth
STABLE
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_auth_user_id_by_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_auth_user_id_by_email(text) TO service_role;
