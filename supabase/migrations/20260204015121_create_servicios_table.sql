/*
  # Create servicios table

  1. New Tables
    - `servicios`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `nombre` (text) - Name of the service
      - `descripcion` (text, nullable) - Description of the service
      - `tipo_medida` (text) - Type of measurement: 'metro_lineal', 'unidad'
      - `precio_unitario` (numeric) - Price per unit
      - `activo` (boolean) - Active status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp

  2. Security
    - Enable RLS on `servicios` table
    - Add policies for authenticated users to manage services
*/

CREATE TABLE IF NOT EXISTS servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) NOT NULL,
  nombre text NOT NULL,
  descripcion text,
  tipo_medida text NOT NULL CHECK (tipo_medida IN ('metro_lineal', 'unidad')),
  precio_unitario numeric(10,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view servicios from their empresa"
  ON servicios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = servicios.empresa_id
    )
  );

CREATE POLICY "Users can insert servicios for their empresa"
  ON servicios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = servicios.empresa_id
    )
  );

CREATE POLICY "Users can update servicios from their empresa"
  ON servicios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = servicios.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = servicios.empresa_id
    )
  );

CREATE POLICY "Users can delete servicios from their empresa"
  ON servicios FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = servicios.empresa_id
    )
  );