-- Direct brand scope on refunds + idempotent Frnch brand seed.
--
-- Adapted to the live Sparti schema, which uses `brand_users.auth_user_id`
-- (with `is_active`) for non-owner access — there is no `brand_members` table.
-- The existing permissive "Allow all access to refunds" RLS policy is left
-- in place; tightening it is a separate concern.
--
-- Backfill: rows that were scoped only by `shopify_credential_id` get a
-- direct `brand_id` so credential rotation no longer orphans them.

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS refunds_brand_id_idx ON public.refunds (brand_id);

UPDATE public.refunds r
SET brand_id = sc.brand_id
FROM public.shopify_credentials sc
WHERE r.brand_id IS NULL
  AND r.shopify_credential_id IS NOT NULL
  AND sc.id = r.shopify_credential_id;

-- Seed Frnch under each JIJI Studio owner. Idempotent: pinned UUID is reused
-- only on first insert, then any further Frnch brands get a fresh UUID. If a
-- brand already exists at the pinned UUID under any name (e.g. "FRNCH"),
-- we skip the seed entirely — the dashboard's brand picker is name-agnostic.
DO $$
DECLARE
  jiji RECORD;
  frnch_uuid CONSTANT uuid := 'fabdb9e9-def7-4756-bf06-881460314590';
  jiji_count int;
BEGIN
  FOR jiji IN
    SELECT user_id FROM public.brands WHERE name ILIKE 'jiji studio'
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.brands
      WHERE user_id = jiji.user_id AND name ILIKE 'frnch'
    ) THEN
      IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = frnch_uuid) THEN
        INSERT INTO public.brands (id, user_id, name)
        VALUES (frnch_uuid, jiji.user_id, 'Frnch');
      ELSE
        INSERT INTO public.brands (user_id, name)
        VALUES (jiji.user_id, 'Frnch');
      END IF;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO jiji_count FROM public.brands WHERE name ILIKE 'jiji studio';
  IF jiji_count = 0
    AND NOT EXISTS (SELECT 1 FROM public.brands WHERE id = frnch_uuid)
    AND EXISTS (SELECT 1 FROM auth.users)
  THEN
    INSERT INTO public.brands (id, user_id, name)
    SELECT frnch_uuid, u.id, 'Frnch'
    FROM auth.users u
    ORDER BY u.created_at
    LIMIT 1;
  END IF;
END $$;
