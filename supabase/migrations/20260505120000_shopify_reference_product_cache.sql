-- Cache Shopify product lookups by custom.referenceparent prefix, per brand (avoids repeated Admin API calls).

CREATE TABLE public.shopify_reference_product_cache (
  brand_id UUID NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  reference_parent TEXT NOT NULL,
  product_id TEXT,
  product_title TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (brand_id, reference_parent)
);

CREATE INDEX shopify_reference_product_cache_brand_verified_idx
  ON public.shopify_reference_product_cache (brand_id, verified_at DESC);

ALTER TABLE public.shopify_reference_product_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_ref_product_cache_select_brand_scoped"
  ON public.shopify_reference_product_cache FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_reference_product_cache.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "shopify_ref_product_cache_insert_brand_scoped"
  ON public.shopify_reference_product_cache FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_reference_product_cache.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "shopify_ref_product_cache_update_brand_scoped"
  ON public.shopify_reference_product_cache FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_reference_product_cache.brand_id
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
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_reference_product_cache.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "shopify_ref_product_cache_delete_brand_scoped"
  ON public.shopify_reference_product_cache FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.brands b
      WHERE b.id = shopify_reference_product_cache.brand_id
        AND (
          b.user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.brand_members bm
            WHERE bm.brand_id = b.id AND bm.member_user_id = auth.uid()
          )
        )
    )
  );
