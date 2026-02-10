
-- Create imports table
CREATE TABLE public.imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import_images table
CREATE TABLE public.import_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  import_id UUID NOT NULL REFERENCES public.imports(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_images ENABLE ROW LEVEL SECURITY;

-- Public access policies (internal tool, no auth needed)
CREATE POLICY "Allow all access to imports" ON public.imports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to import_images" ON public.import_images FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for import images
INSERT INTO storage.buckets (id, name, public) VALUES ('import-images', 'import-images', true);

-- Storage policies
CREATE POLICY "Allow public read of import images" ON storage.objects FOR SELECT USING (bucket_id = 'import-images');
CREATE POLICY "Allow public insert of import images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'import-images');
CREATE POLICY "Allow public delete of import images" ON storage.objects FOR DELETE USING (bucket_id = 'import-images');

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_imports_updated_at
  BEFORE UPDATE ON public.imports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
