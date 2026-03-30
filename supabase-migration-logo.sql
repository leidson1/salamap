-- ============================================
-- SalaMap - Logo da escola
-- Adicionar campo logo_url na tabela escolas
-- ============================================

ALTER TABLE escolas ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Storage bucket para logos (rodar no Supabase Dashboard > Storage > New Bucket)
-- Nome: escola-logos
-- Public: true
-- Ou criar via SQL:
INSERT INTO storage.buckets (id, name, public)
VALUES ('escola-logos', 'escola-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: membros podem fazer upload
CREATE POLICY "Members can upload logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'escola-logos');

CREATE POLICY "Members can update logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'escola-logos');

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'escola-logos');
