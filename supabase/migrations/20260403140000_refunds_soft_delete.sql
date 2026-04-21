-- Soft-delete support: hide removed rows from the app while retaining data.

ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS refunds_shopify_credential_active_idx
  ON public.refunds (shopify_credential_id)
  WHERE deleted_at IS NULL;

DROP POLICY IF EXISTS "authenticated_select_own_refunds" ON public.refunds;

CREATE POLICY "authenticated_select_own_refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );
