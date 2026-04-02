-- Ephemeral CSRF / session binding for Shopify OAuth (Edge Function + service role only)
CREATE TABLE public.shopify_oauth_states (
  state TEXT NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ
);

CREATE INDEX shopify_oauth_states_user_shop_idx ON public.shopify_oauth_states (user_id, shop_domain);
CREATE INDEX shopify_oauth_states_expires_idx ON public.shopify_oauth_states (expires_at);

ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;
