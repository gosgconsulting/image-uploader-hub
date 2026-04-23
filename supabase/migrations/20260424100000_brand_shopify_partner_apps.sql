-- Per-brand Shopify Partner app (OAuth client id + secret) for ?tenant=<brand_id> install and dashboard OAuth.

CREATE TABLE public.brand_shopify_partner_apps (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands (id) ON DELETE CASCADE,
  shopify_client_id TEXT NOT NULL,
  shopify_client_secret TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brand_shopify_partner_apps_brand_id_key UNIQUE (brand_id)
);

CREATE INDEX brand_shopify_partner_apps_shopify_client_id_idx
  ON public.brand_shopify_partner_apps (shopify_client_id);

CREATE TRIGGER update_brand_shopify_partner_apps_updated_at
  BEFORE UPDATE ON public.brand_shopify_partner_apps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.brand_shopify_partner_apps ENABLE ROW LEVEL SECURITY;

-- No direct table access for clients; use RPCs below (service role / Edge bypass RLS).

ALTER TABLE public.shopify_oauth_states
  ADD COLUMN IF NOT EXISTS partner_app_id UUID REFERENCES public.brand_shopify_partner_apps (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopify_oauth_states_partner_app_id_idx
  ON public.shopify_oauth_states (partner_app_id)
  WHERE partner_app_id IS NOT NULL;

ALTER TABLE public.shopify_install_tokens
  ADD COLUMN IF NOT EXISTS partner_app_id UUID REFERENCES public.brand_shopify_partner_apps (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shopify_install_tokens_partner_app_id_idx
  ON public.shopify_install_tokens (partner_app_id)
  WHERE partner_app_id IS NOT NULL;

-- Upsert Partner app credentials for a brand the caller owns (secret never returned).
CREATE OR REPLACE FUNCTION public.upsert_brand_shopify_partner_app(
  p_brand_id uuid,
  p_client_id text,
  p_client_secret text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Brand not found or access denied');
  END IF;
  IF length(trim(COALESCE(p_client_id, ''))) < 1 OR length(trim(COALESCE(p_client_secret, ''))) < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Client id and secret are required');
  END IF;

  INSERT INTO public.brand_shopify_partner_apps (brand_id, shopify_client_id, shopify_client_secret)
  VALUES (p_brand_id, trim(p_client_id), trim(p_client_secret))
  ON CONFLICT (brand_id) DO UPDATE SET
    shopify_client_id = EXCLUDED.shopify_client_id,
    shopify_client_secret = EXCLUDED.shopify_client_secret,
    updated_at = now();

  RETURN json_build_object('ok', true);
END;
$$;

-- Public (non-secret) fields for dashboard display.
CREATE OR REPLACE FUNCTION public.get_brand_shopify_partner_app_public(p_brand_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_partner_app_id uuid;
  v_client_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Brand not found or access denied');
  END IF;

  SELECT a.id, a.shopify_client_id
  INTO v_partner_app_id, v_client_id
  FROM public.brand_shopify_partner_apps a
  WHERE a.brand_id = p_brand_id;

  IF v_partner_app_id IS NULL THEN
    RETURN json_build_object('ok', true, 'configured', false);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'configured', true,
    'partner_app_id', v_partner_app_id,
    'shopify_client_id', v_client_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_brand_shopify_partner_app(p_brand_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Not authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.brands b WHERE b.id = p_brand_id AND b.user_id = auth.uid()
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Brand not found or access denied');
  END IF;

  DELETE FROM public.brand_shopify_partner_apps WHERE brand_id = p_brand_id;
  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_brand_shopify_partner_app(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brand_shopify_partner_app_public(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_brand_shopify_partner_app(uuid) TO authenticated;
