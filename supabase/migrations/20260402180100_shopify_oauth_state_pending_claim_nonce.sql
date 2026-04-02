-- UUID generated at install (embedded flow); reused as shopify_oauth_pending.claim_nonce after callback
ALTER TABLE public.shopify_oauth_states
  ADD COLUMN IF NOT EXISTS pending_claim_nonce UUID;

CREATE INDEX IF NOT EXISTS shopify_oauth_states_pending_claim_nonce_idx
  ON public.shopify_oauth_states (pending_claim_nonce)
  WHERE pending_claim_nonce IS NOT NULL;
