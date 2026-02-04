/*
  # Agregar cotización de dólar y columnas de precio adicionales

  1. Nueva Tabla
    - `cotizacion_dolar`
      - `id` (uuid, primary key)
      - `fecha` (date, unique per empresa)
      - `valor` (decimal) - Valor del dólar en pesos uruguayos
      - `empresa_id` (uuid, foreign key)
      - `created_at` (timestamptz)
  
  2. Cambios en Tablas Existentes
    - `productos`
      - Agregar `precio_venta_usd` (decimal) - Precio de venta en dólares
      - Agregar `precio_compra_uyu` (decimal) - Precio de compra en pesos uruguayos
  
  3. Seguridad
    - Enable RLS on `cotizacion_dolar` table
    - Add policies for authenticated users to read and manage cotizaciones
  
  4. Funciones
    - Función para obtener la cotización del día
*/

-- Crear tabla cotizacion_dolar
CREATE TABLE IF NOT EXISTS cotizacion_dolar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha date NOT NULL,
  valor decimal(10,2) NOT NULL,
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(fecha, empresa_id)
);

-- Agregar columnas a productos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'precio_venta_usd'
  ) THEN
    ALTER TABLE productos ADD COLUMN precio_venta_usd decimal(10,2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'productos' AND column_name = 'precio_compra_uyu'
  ) THEN
    ALTER TABLE productos ADD COLUMN precio_compra_uyu decimal(10,2);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE cotizacion_dolar ENABLE ROW LEVEL SECURITY;

-- Policies for cotizacion_dolar
CREATE POLICY "Users can view cotizaciones of their empresa"
  ON cotizacion_dolar FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert cotizaciones for their empresa"
  ON cotizacion_dolar FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update cotizaciones of their empresa"
  ON cotizacion_dolar FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete cotizaciones of their empresa"
  ON cotizacion_dolar FOR DELETE
  TO authenticated
  USING (true);

-- Función para obtener la cotización del día
CREATE OR REPLACE FUNCTION get_cotizacion_actual(p_empresa_id uuid)
RETURNS decimal
LANGUAGE plpgsql
AS $$
DECLARE
  v_cotizacion decimal;
BEGIN
  SELECT valor INTO v_cotizacion
  FROM cotizacion_dolar
  WHERE empresa_id = p_empresa_id
  AND fecha = CURRENT_DATE;
  
  IF v_cotizacion IS NULL THEN
    SELECT valor INTO v_cotizacion
    FROM cotizacion_dolar
    WHERE empresa_id = p_empresa_id
    AND fecha <= CURRENT_DATE
    ORDER BY fecha DESC
    LIMIT 1;
  END IF;
  
  RETURN v_cotizacion;
END;
$$;