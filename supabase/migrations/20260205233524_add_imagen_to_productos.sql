/*
  # Add image support to productos table

  1. Changes
    - Add `imagen_url` column to `productos` table to store the image URL
    - The image will be stored in Supabase Storage
  
  2. Notes
    - Column is optional (nullable) since existing products don't have images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'imagen_url'
  ) THEN
    ALTER TABLE productos ADD COLUMN imagen_url text;
  END IF;
END $$;