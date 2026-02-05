/*
  # Create storage bucket for product images

  1. Storage Setup
    - Create public bucket 'producto-imagenes'
    - Set file size limit to 5MB
    - Allow common image formats (jpg, png, gif, webp)
  
  2. Security
    - Enable RLS on storage.objects
    - Allow public read access to product images
    - Allow authenticated users to upload, update, and delete images
*/

-- Create the storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'producto-imagenes',
  'producto-imagenes',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product images" ON storage.objects;

-- Policy: Anyone can view public images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'producto-imagenes');

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'producto-imagenes');

-- Policy: Authenticated users can update their images
CREATE POLICY "Authenticated users can update product images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'producto-imagenes')
WITH CHECK (bucket_id = 'producto-imagenes');

-- Policy: Authenticated users can delete images
CREATE POLICY "Authenticated users can delete product images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'producto-imagenes');