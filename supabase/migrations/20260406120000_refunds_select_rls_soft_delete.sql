-- Soft-delete UPDATE fails with 42501 when SELECT policy requires deleted_at IS NULL:
-- Postgres applies SELECT / USING policies to the new row version on UPDATE (see
-- CREATE POLICY docs: policies applied per command type). PostgREST updates use
-- RETURNING, so the post-update row must still pass SELECT RLS.
-- Listing stays scoped to active rows via the client query (.is('deleted_at', null)).

DROP POLICY IF EXISTS "authenticated_select_own_refunds" ON public.refunds;

CREATE POLICY "authenticated_select_own_refunds"
  ON public.refunds FOR SELECT TO authenticated
  USING (
    shopify_credential_id IS NOT NULL
    AND shopify_credential_id IN (
      SELECT id FROM public.shopify_credentials WHERE user_id = auth.uid()
    )
  );
