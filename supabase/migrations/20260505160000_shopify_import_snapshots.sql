-- Snapshots of each product's Shopify media taken right before an import runs.
-- Lets the user roll back media changes after a regrettable replace.
-- Note: this only captures *what URLs were on the product*. Shopify CDN URLs of media
-- that's later deleted may 404; durable mirroring to our own bucket is a follow-up.

CREATE TABLE IF NOT EXISTS public.shopify_import_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.shopify_imports (id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  shopify_product_name TEXT,
  featured_image_url TEXT,
  featured_image_alt TEXT,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  restored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS shopify_import_snapshots_import_idx
  ON public.shopify_import_snapshots (import_id, created_at DESC);

CREATE INDEX IF NOT EXISTS shopify_import_snapshots_brand_idx
  ON public.shopify_import_snapshots (brand_id, created_at DESC);

ALTER TABLE public.shopify_import_snapshots ENABLE ROW LEVEL SECURITY;

-- Brand owners and active brand_users can read snapshots for their brand.
DROP POLICY IF EXISTS shopify_import_snapshots_select ON public.shopify_import_snapshots;
CREATE POLICY shopify_import_snapshots_select
  ON public.shopify_import_snapshots
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.brands b WHERE b.id = shopify_import_snapshots.brand_id AND b.user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.brand_users bu
      WHERE bu.brand_id = shopify_import_snapshots.brand_id
        AND bu.auth_user_id = auth.uid()
        AND bu.is_active = TRUE
    )
  );

-- Writes go through Edge Functions with the service role; no INSERT/UPDATE/DELETE policies.
