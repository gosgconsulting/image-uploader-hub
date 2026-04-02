-- One-time token returned in SHOPIFY_OAUTH_RETURN_URL so the Refund UI can claim the
-- correct pending row even if the shop query param is dropped or ambiguous.
ALTER TABLE public.shopify_oauth_pending
  ADD COLUMN IF NOT EXISTS claim_nonce UUID UNIQUE;

CREATE INDEX IF NOT EXISTS shopify_oauth_pending_claim_nonce_idx
  ON public.shopify_oauth_pending (claim_nonce)
  WHERE claim_nonce IS NOT NULL;
