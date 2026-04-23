-- Brands (per user) and link each Shopify credential row to exactly one brand.
-- Each existing credential gets its own brand row (name = shop_domain) so
-- (user_id, brand_id) stays unique when a user has multiple shops.

CREATE TABLE public.brands (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brands_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX brands_user_id_idx ON public.brands (user_id);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own brands"
  ON public.brands FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own brands"
  ON public.brands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own brands"
  ON public.brands FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own brands"
  ON public.brands FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.shopify_credentials
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands (id) ON DELETE CASCADE;

-- One brand per credential: (user_id, shop_domain) was already unique per user.
INSERT INTO public.brands (user_id, name)
SELECT sc.user_id, sc.shop_domain
FROM public.shopify_credentials sc
WHERE NOT EXISTS (
  SELECT 1 FROM public.brands b WHERE b.user_id = sc.user_id AND b.name = sc.shop_domain
);

UPDATE public.shopify_credentials sc
SET brand_id = b.id
FROM public.brands b
WHERE sc.brand_id IS NULL
  AND b.user_id = sc.user_id
  AND b.name = sc.shop_domain;

ALTER TABLE public.shopify_credentials
  ALTER COLUMN brand_id SET NOT NULL;

ALTER TABLE public.shopify_credentials
  DROP CONSTRAINT IF EXISTS shopify_credentials_user_shop_unique;

ALTER TABLE public.shopify_credentials
  ADD CONSTRAINT shopify_credentials_user_brand_unique UNIQUE (user_id, brand_id);

ALTER TABLE public.shopify_credentials
  ADD CONSTRAINT shopify_credentials_user_shop_unique UNIQUE (user_id, shop_domain);

CREATE INDEX shopify_credentials_brand_id_idx ON public.shopify_credentials (brand_id);

ALTER TABLE public.shopify_oauth_states
  ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands (id) ON DELETE SET NULL;
