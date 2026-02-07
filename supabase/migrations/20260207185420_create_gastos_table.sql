/*
  # Crear tabla de gastos

  1. Nueva Tabla
    - `gastos`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key a empresas)
      - `fecha` (date) - Fecha del gasto
      - `concepto` (text) - Concepto principal: Transporte, Mano de obra, Servicios básicos
      - `subcategoria` (text, nullable) - Subcategoría específica según el concepto
      - `descripcion` (text, nullable) - Descripción adicional del gasto
      - `monto` (decimal) - Monto del gasto
      - `moneda` (text) - Moneda (UYU por defecto)
      - `metodo_pago` (text, nullable) - Efectivo, Transferencia, Tarjeta, etc.
      - `comprobante` (text, nullable) - Número de comprobante o referencia
      - `created_at` (timestamptz) - Fecha de creación del registro
      - `updated_at` (timestamptz) - Fecha de última actualización

  2. Seguridad
    - Habilitar RLS en la tabla `gastos`
    - Políticas para que usuarios autenticados puedan gestionar gastos
*/

-- Crear tabla de gastos
CREATE TABLE IF NOT EXISTS gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  concepto text NOT NULL,
  subcategoria text,
  descripcion text,
  monto decimal(12, 2) NOT NULL,
  moneda text NOT NULL DEFAULT 'UYU',
  metodo_pago text,
  comprobante text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Política para visualizar gastos
CREATE POLICY "Los usuarios pueden ver gastos"
  ON gastos FOR SELECT
  TO authenticated
  USING (true);

-- Política para insertar gastos
CREATE POLICY "Los usuarios pueden crear gastos"
  ON gastos FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política para actualizar gastos
CREATE POLICY "Los usuarios pueden actualizar gastos"
  ON gastos FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Política para eliminar gastos
CREATE POLICY "Los usuarios pueden eliminar gastos"
  ON gastos FOR DELETE
  TO authenticated
  USING (true);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_id ON gastos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_concepto ON gastos(concepto);
