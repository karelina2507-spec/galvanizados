/*
  # Create storage bucket for sales receipts (boletas)

  1. Storage Setup
    - Create public bucket 'boletas'
    - Set file size limit to 10MB
    - Allow PDF files only

  2. Security
    - Enable RLS on storage.objects
    - Allow public read access to boletas (needed for WhatsApp sharing)
    - Allow authenticated users to upload and manage boletas
*/

-- Create the storage bucket for boletas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'boletas',
  'boletas',
  true,
  10485760,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view boletas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload boletas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update boletas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete boletas" ON storage.objects;

-- Policy: Anyone can view public boletas (needed for WhatsApp sharing)
CREATE POLICY "Public can view boletas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'boletas');

-- Policy: Authenticated users can upload boletas
CREATE POLICY "Authenticated users can upload boletas"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'boletas');

-- Policy: Authenticated users can update boletas
CREATE POLICY "Authenticated users can update boletas"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'boletas')
WITH CHECK (bucket_id = 'boletas');

-- Policy: Authenticated users can delete boletas
CREATE POLICY "Authenticated users can delete boletas"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'boletas');
