/*
  # Add localidad and direccion fields to ventas table

  1. Changes
    - Add `localidad` column (text, nullable) to ventas table
    - Add `direccion` column (text, nullable) to ventas table
  
  2. Purpose
    - Store location and address information for each sale
    - These fields complement the existing departamento field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'localidad'
  ) THEN
    ALTER TABLE ventas ADD COLUMN localidad text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'direccion'
  ) THEN
    ALTER TABLE ventas ADD COLUMN direccion text;
  END IF;
END $$;