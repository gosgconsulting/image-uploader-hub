-- Seed "JIJI Studio" as the primary brand name (replaces migration-created "Default" where safe)
-- and attach legacy image imports to that brand when there is exactly one global candidate.

-- 1) Legacy draft migration used a single "Default" brand per user; rename if still present.
UPDATE public.brands b
SET name = 'JIJI Studio', updated_at = now()
WHERE b.name = 'Default'
  AND NOT EXISTS (
    SELECT 1 FROM public.brands b2 WHERE b2.user_id = b.user_id AND b2.name = 'JIJI Studio'
  );

-- 1b) Single-store accounts: sole brand whose name is the shop hostname becomes JIJI Studio.
UPDATE public.brands b
SET name = 'JIJI Studio', updated_at = now()
WHERE b.name LIKE '%.myshopify.com'
  AND (SELECT COUNT(*)::int FROM public.brands b2 WHERE b2.user_id = b.user_id) = 1
  AND NOT EXISTS (
    SELECT 1
    FROM public.brands b3
    WHERE b3.user_id = b.user_id AND b3.name = 'JIJI Studio' AND b3.id <> b.id
  );

-- 2) Image imports: brand scope (nullable for multi-tenant until rows are assigned).
ALTER TABLE public.imports
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS imports_brand_id_idx ON public.imports (brand_id);

-- 3) Backfill imports only when a single "JIJI Studio" brand exists (typical single-operator deploy).
DO $$
DECLARE
  jiji_count integer;
  jiji_id uuid;
BEGIN
  SELECT COUNT(*) INTO jiji_count FROM public.brands WHERE name = 'JIJI Studio';
  IF jiji_count = 1 THEN
    SELECT id INTO jiji_id FROM public.brands WHERE name = 'JIJI Studio' ORDER BY created_at LIMIT 1;
    UPDATE public.imports SET brand_id = jiji_id WHERE brand_id IS NULL;
  END IF;
END $$;
