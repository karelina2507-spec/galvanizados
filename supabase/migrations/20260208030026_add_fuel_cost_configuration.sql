/*
  # Add Fuel Cost Configuration

  1. Changes
    - Add `precio_nafta_litro` column to empresas table (price per liter in UYU)
    - Add `consumo_vehiculo_km_litro` column to empresas table (vehicle fuel efficiency in km/liter)

  2. Notes
    - Default fuel price set to 80.30 UYU/liter (Premium 97 price in Uruguay as of January 2026)
    - Default vehicle consumption set to 10 km/liter (average consumption)
    - These values can be updated by each company according to their needs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'precio_nafta_litro'
  ) THEN
    ALTER TABLE empresas ADD COLUMN precio_nafta_litro DECIMAL(10,2) DEFAULT 80.30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'consumo_vehiculo_km_litro'
  ) THEN
    ALTER TABLE empresas ADD COLUMN consumo_vehiculo_km_litro DECIMAL(10,2) DEFAULT 10.00;
  END IF;
END $$;