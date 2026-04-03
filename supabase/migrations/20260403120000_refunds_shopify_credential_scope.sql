-- Scope refund rows to the Shopify connection (shopify_credentials) owned by the user.
-- shop_domain supports server-side verification when the caller uses a Shopify session token (no Supabase row id).

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS shopify_credential_id UUID
    REFERENCES public.shopify_credentials (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS shop_domain TEXT;

CREATE INDEX IF NOT EXISTS refunds_shopify_credential_id_idx
  ON public.refunds (shopify_credential_id);

CREATE INDEX IF NOT EXISTS refunds_shop_domain_idx
  ON public.refunds (shop_domain);

DROP POLICY IF EXISTS "Allow all access to refunds" ON public.refunds;

CREATE POLICY "authenticated_select_own_refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_insert_own_refunds"
  ON public.refunds FOR INSERT TO authenticated
  WITH CHECK (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_update_own_refunds"
  ON public.refunds FOR UPDATE TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_delete_own_refunds"
  ON public.refunds FOR DELETE TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );
