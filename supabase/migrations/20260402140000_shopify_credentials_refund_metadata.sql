-- Per-user Shopify Admin credentials (token never used for refunds from the browser)
CREATE TABLE public.shopify_credentials (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shopify_credentials_user_shop_unique UNIQUE (user_id, shop_domain)
);

CREATE INDEX shopify_credentials_user_id_idx ON public.shopify_credentials (user_id);

ALTER TABLE public.shopify_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own shopify_credentials"
  ON public.shopify_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own shopify_credentials"
  ON public.shopify_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own shopify_credentials"
  ON public.shopify_credentials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own shopify_credentials"
  ON public.shopify_credentials FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_shopify_credentials_updated_at
  BEFORE UPDATE ON public.shopify_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Shopify refund idempotency / audit on refund queue rows
ALTER TABLE public.refunds
  ADD COLUMN IF NOT EXISTS shopify_refund_id TEXT,
  ADD COLUMN IF NOT EXISTS shopify_refund_error TEXT,
  ADD COLUMN IF NOT EXISTS shopify_refund_attempted_at TIMESTAMPTZ;
