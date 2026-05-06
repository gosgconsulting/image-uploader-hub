-- Direct brand scope on refunds + seed Frnch brand alongside JIJI Studio.
--
-- Until now, refund rows were scoped only via shopify_credential_id. Switching the
-- dashboard brand picker also changes the active credential, but rows from earlier
-- credentials (rotated tokens, recreated installs) become orphaned. Adding a direct
-- brand_id makes the frontend filter explicit and survives credential changes.

-- 1) brand_id column + index
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS refunds_brand_id_idx ON public.refunds (brand_id);

-- 2) Backfill existing refunds from credential -> brand link
UPDATE public.refunds r
SET brand_id = sc.brand_id
FROM public.shopify_credentials sc
WHERE r.brand_id IS NULL
  AND r.shopify_credential_id IS NOT NULL
  AND sc.id = r.shopify_credential_id;

-- 3) Seed Frnch brand for every account that owns a "JIJI Studio" brand.
--    Uses the pinned UUID expected by scripts/frnch-bulk-import.mjs so existing
--    bulk-import tooling keeps working. ON CONFLICT keeps the migration idempotent.
DO $$
DECLARE
  jiji RECORD;
  frnch_uuid CONSTANT uuid := 'fabdb9e9-def7-4756-bf06-881460314590';
  jiji_count int;
BEGIN
  FOR jiji IN
    SELECT user_id FROM public.brands WHERE name = 'JIJI Studio'
  LOOP
    -- Skip if this user already has a brand named "Frnch"
    IF NOT EXISTS (
      SELECT 1 FROM public.brands
      WHERE user_id = jiji.user_id AND name = 'Frnch'
    ) THEN
      -- Pin the hardcoded UUID for the *first* Frnch insert (single-tenant deploys);
      -- subsequent Frnch brands get fresh UUIDs to keep the unique constraint happy.
      IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = frnch_uuid) THEN
        INSERT INTO public.brands (id, user_id, name)
        VALUES (frnch_uuid, jiji.user_id, 'Frnch');
      ELSE
        INSERT INTO public.brands (user_id, name)
        VALUES (jiji.user_id, 'Frnch');
      END IF;
    END IF;
  END LOOP;

  -- Fallback: if no JIJI Studio brand exists yet but at least one auth user does,
  -- seed Frnch under the earliest user so first-run dev environments see it too.
  SELECT COUNT(*) INTO jiji_count FROM public.brands WHERE name = 'JIJI Studio';
  IF jiji_count = 0
    AND NOT EXISTS (SELECT 1 FROM public.brands WHERE id = frnch_uuid)
    AND EXISTS (SELECT 1 FROM auth.users)
  THEN
    INSERT INTO public.brands (id, user_id, name)
    SELECT frnch_uuid, u.id, 'Frnch'
    FROM auth.users u
    ORDER BY u.created_at
    LIMIT 1
    ON CONFLICT (user_id, name) DO NOTHING;
  END IF;
END $$;

-- 4) RLS: allow direct brand-scoped access in addition to the credential-based path.
--    Existing policies (brand_members + shopify_credentials) keep working for legacy
--    rows where brand_id is NULL or credential ownership is the source of truth.

DROP POLICY IF EXISTS "authenticated_select_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_insert_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_update_own_refunds" ON public.refunds;
DROP POLICY IF EXISTS "authenticated_delete_own_refunds" ON public.refunds;

CREATE POLICY "authenticated_select_own_refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      (
        brand_id IS NOT NULL
        AND (
          EXISTS (SELECT 1 FROM public.brands b WHERE b.id = refunds.brand_id AND b.user_id = auth.uid())
          OR brand_id IN (
            SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
          )
        )
      )
      OR (
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
    )
  );

CREATE POLICY "authenticated_insert_own_refunds"
  ON public.refunds FOR INSERT TO authenticated
  WITH CHECK (
    (
      brand_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = refunds.brand_id AND b.user_id = auth.uid())
        OR brand_id IN (
          SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
        )
      )
    )
    OR (
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
  );

CREATE POLICY "authenticated_update_own_refunds"
  ON public.refunds FOR UPDATE TO authenticated
  USING (
    (
      brand_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = refunds.brand_id AND b.user_id = auth.uid())
        OR brand_id IN (
          SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
        )
      )
    )
    OR (
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
  )
  WITH CHECK (
    (
      brand_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = refunds.brand_id AND b.user_id = auth.uid())
        OR brand_id IN (
          SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
        )
      )
    )
    OR (
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
  );

CREATE POLICY "authenticated_delete_own_refunds"
  ON public.refunds FOR DELETE TO authenticated
  USING (
    (
      brand_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM public.brands b WHERE b.id = refunds.brand_id AND b.user_id = auth.uid())
        OR brand_id IN (
          SELECT bm.brand_id FROM public.brand_members bm WHERE bm.member_user_id = auth.uid()
        )
      )
    )
    OR (
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
  );
