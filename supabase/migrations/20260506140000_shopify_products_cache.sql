-- Per-brand cache of Shopify products. Populated by the `shopify-products-sync`
-- edge function and read by the Products page. Brand-scoped via brand_members RLS.

CREATE TABLE public.shopify_products (
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

CREATE INDEX shopify_products_brand_synced_idx
  ON public.shopify_products (brand_id, synced_at DESC);

CREATE INDEX shopify_products_brand_title_idx
  ON public.shopify_products (brand_id, title);

ALTER TABLE public.shopify_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_products_select_brand_scoped"
  ON public.shopify_products FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_products.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

-- Writes go through the edge function with the service role; deny direct client writes
-- by not creating insert/update/delete policies for `authenticated`.
