-- Allow OAuth state rows without a Supabase user (Shopify Admin install entry)
ALTER TABLE public.shopify_oauth_states
  ALTER COLUMN user_id DROP NOT NULL;

-- Pending token after install-from-Shopify OAuth until a signed-in user claims the shop
CREATE TABLE public.shopify_oauth_pending (
  shop_domain TEXT NOT NULL PRIMARY KEY,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX shopify_oauth_pending_expires_idx ON public.shopify_oauth_pending (expires_at);

ALTER TABLE public.shopify_oauth_pending ENABLE ROW LEVEL SECURITY;
