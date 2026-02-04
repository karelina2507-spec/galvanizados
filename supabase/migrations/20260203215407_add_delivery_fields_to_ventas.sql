/*
  # Add delivery tracking fields to ventas table

  1. Changes
    - Add `reparto` boolean field to track if delivery is needed
    - Add `latitud` and `longitud` fields to store delivery location coordinates
    - Update estado field to use specific delivery statuses
    - Add check constraint for valid estados
  
  2. Notes
    - reparto defaults to false
    - coordinates are nullable (only required when reparto=true)
    - estado includes: pendiente, pagado, en_reparto, enviado, entregado, completado
*/

DO $$
BEGIN
  -- Add reparto field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'reparto'
  ) THEN
    ALTER TABLE ventas ADD COLUMN reparto boolean DEFAULT false;
  END IF;

  -- Add latitud field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'latitud'
  ) THEN
    ALTER TABLE ventas ADD COLUMN latitud numeric(10, 8);
  END IF;

  -- Add longitud field if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ventas' AND column_name = 'longitud'
  ) THEN
    ALTER TABLE ventas ADD COLUMN longitud numeric(11, 8);
  END IF;
END $$;

-- Drop existing check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'ventas_estado_check'
    AND table_name = 'ventas'
  ) THEN
    ALTER TABLE ventas DROP CONSTRAINT ventas_estado_check;
  END IF;
END $$;

-- Add check constraint for valid estados
ALTER TABLE ventas ADD CONSTRAINT ventas_estado_check 
  CHECK (estado IN ('pendiente', 'pagado', 'en_reparto', 'enviado', 'entregado', 'completado'));