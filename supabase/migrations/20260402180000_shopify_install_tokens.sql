-- Offline Admin token per shop (service role only). Populated on OAuth callback so embedded
-- apps can run server-side refunds using Shopify session tokens without Supabase sign-in.
CREATE TABLE public.shopify_install_tokens (
  shop_domain TEXT NOT NULL PRIMARY KEY,
  access_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX shopify_install_tokens_updated_at_idx
  ON public.shopify_install_tokens (updated_at DESC);

ALTER TABLE public.shopify_install_tokens ENABLE ROW LEVEL SECURITY;

-- No policies: anon/authenticated clients cannot read or write; Edge Functions use service role.

CREATE TRIGGER update_shopify_install_tokens_updated_at
  BEFORE UPDATE ON public.shopify_install_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
