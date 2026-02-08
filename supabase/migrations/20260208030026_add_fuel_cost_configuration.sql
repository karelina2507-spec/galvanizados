/*
  # Add Fuel Cost Configuration

  1. Changes
    - Add `precio_nafta_litro` column to empresas table (price per liter in UYU)
    - Add `consumo_vehiculo_km_litro` column to empresas table (vehicle fuel efficiency in km/liter)
  
  2. Notes
    - Default fuel price set to 73.50 UYU/liter (approximate premium fuel price in Uruguay as of 2024)
    - Default vehicle consumption set to 10 km/liter (average consumption)
    - These values can be updated by each company according to their needs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'precio_nafta_litro'
  ) THEN
    ALTER TABLE empresas ADD COLUMN precio_nafta_litro DECIMAL(10,2) DEFAULT 73.50;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'empresas' AND column_name = 'consumo_vehiculo_km_litro'
  ) THEN
    ALTER TABLE empresas ADD COLUMN consumo_vehiculo_km_litro DECIMAL(10,2) DEFAULT 10.00;
  END IF;
END $$;