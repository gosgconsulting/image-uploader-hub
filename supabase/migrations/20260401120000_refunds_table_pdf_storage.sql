-- Refund queue (replaces in-memory mock)
CREATE TABLE public.refunds (
  id UUID NOT NULL PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT '',
  order_id TEXT NOT NULL,
  customer TEXT NOT NULL DEFAULT '',
  skus JSONB NOT NULL DEFAULT '[]'::jsonb,
  qty INTEGER NOT NULL DEFAULT 1,
  order_date TEXT NOT NULL,
  original_amount NUMERIC NOT NULL DEFAULT 0,
  return_fee NUMERIC NOT NULL DEFAULT -3,
  calculated_refund NUMERIC NOT NULL DEFAULT 0,
  reason_of_return TEXT NOT NULL DEFAULT '',
  ai_confidence NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('completed', 'processing', 'pending', 'failed')),
  pdf_url TEXT,
  shopify_numeric_order_id TEXT,
  sheet_page_key TEXT,
  sheet_product_names JSONB DEFAULT '[]'::jsonb,
  shopify_fetch_status TEXT
    CHECK (
      shopify_fetch_status IS NULL
      OR shopify_fetch_status IN ('idle', 'loading', 'ok', 'error')
    ),
  shopify_products JSONB,
  shopify_fetch_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX refunds_date_idx ON public.refunds (date DESC);
CREATE INDEX refunds_status_idx ON public.refunds (status);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to refunds" ON public.refunds FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_refunds_updated_at
  BEFORE UPDATE ON public.refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('refund-pdfs', 'refund-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public read of refund pdfs" ON storage.objects FOR SELECT USING (bucket_id = 'refund-pdfs');
CREATE POLICY "Allow public insert of refund pdfs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'refund-pdfs');
CREATE POLICY "Allow public delete of refund pdfs" ON storage.objects FOR DELETE USING (bucket_id = 'refund-pdfs');
