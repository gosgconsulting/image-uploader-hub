-- Per-brand cache of Shopify products. Populated by the `shopify-products-sync`
-- edge function and read by the Products page.
--
-- Adapted to the live Sparti schema: brand-scoped via `brand_users.auth_user_id`
-- (with `is_active`) for non-owner access. There is no `brand_members` table here.

CREATE TABLE IF NOT EXISTS public.shopify_products (
  brand_id UUID NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  shopify_product_id TEXT NOT NULL,
  title TEXT NOT NULL,
  handle TEXT,
  status TEXT,
  vendor TEXT,
  product_type TEXT,
  variant_count INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  shopify_updated_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, shopify_product_id)
);

CREATE INDEX IF NOT EXISTS shopify_products_brand_synced_idx
  ON public.shopify_products (brand_id, synced_at DESC);

CREATE INDEX IF NOT EXISTS shopify_products_brand_title_idx
  ON public.shopify_products (brand_id, title);

ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_products_select_brand_scoped" ON public.shopify_products;
CREATE POLICY "shopify_products_select_brand_scoped"
  ON public.shopify_products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.brands b
      WHERE b.id = shopify_products.brand_id
        AND b.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.brand_users bu
      WHERE bu.brand_id = shopify_products.brand_id
        AND bu.auth_user_id = auth.uid()
        AND bu.is_active = TRUE
    )
  );

-- Writes go through the edge function with the service role; deny direct client writes
-- by not creating insert/update/delete policies for `authenticated`.
