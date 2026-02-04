/*
  # Add cotizacion field to compras table

  1. Changes
    - Add `cotizacion` column to `compras` table
      - Type: numeric (allows special exchange rate for specific purchases)
      - Nullable: true (not all purchases have special exchange rates)
      - Description: Special exchange rate to use for calculating product prices in this purchase
  
  2. Notes
    - This allows specific purchases to override the default exchange rate
    - Used for calculating product prices when products are purchased with a different exchange rate
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'compras' AND column_name = 'cotizacion'
  ) THEN
    ALTER TABLE compras ADD COLUMN cotizacion numeric;
  END IF;
END $$;