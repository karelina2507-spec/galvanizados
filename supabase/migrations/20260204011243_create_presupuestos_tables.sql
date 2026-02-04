/*
  # Crear tablas de presupuestos

  1. Nuevas Tablas
    - `presupuestos`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key to empresas)
      - `numero_presupuesto` (text, unique)
      - `cliente_id` (uuid, foreign key to clientes, nullable)
      - `fecha_presupuesto` (date)
      - `subtotal` (numeric)
      - `descuento` (numeric)
      - `total` (numeric)
      - `notas` (text, nullable)
      - `estado` (text) - 'pendiente', 'aprobado', 'rechazado', 'convertido'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `detalle_presupuestos`
      - `id` (uuid, primary key)
      - `presupuesto_id` (uuid, foreign key to presupuestos)
      - `producto_id` (uuid, foreign key to productos)
      - `cantidad` (numeric)
      - `precio_unitario` (numeric)
      - `descuento_item` (numeric)
      - `subtotal_item` (numeric)
      - `created_at` (timestamptz)

  2. Seguridad
    - Habilitar RLS en ambas tablas
    - Políticas para usuarios autenticados
*/

-- Tabla presupuestos
CREATE TABLE IF NOT EXISTS presupuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES empresas(id) ON DELETE CASCADE NOT NULL,
  numero_presupuesto text UNIQUE NOT NULL,
  cliente_id uuid REFERENCES clientes(id) ON DELETE SET NULL,
  fecha_presupuesto date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(12, 2) NOT NULL DEFAULT 0,
  descuento numeric(12, 2) NOT NULL DEFAULT 0,
  total numeric(12, 2) NOT NULL DEFAULT 0,
  notas text,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla detalle_presupuestos
CREATE TABLE IF NOT EXISTS detalle_presupuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_id uuid REFERENCES presupuestos(id) ON DELETE CASCADE NOT NULL,
  producto_id uuid REFERENCES productos(id) ON DELETE CASCADE NOT NULL,
  cantidad numeric(10, 2) NOT NULL DEFAULT 1,
  precio_unitario numeric(12, 2) NOT NULL DEFAULT 0,
  descuento_item numeric(12, 2) NOT NULL DEFAULT 0,
  subtotal_item numeric(12, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_presupuestos ENABLE ROW LEVEL SECURITY;

-- Políticas para presupuestos
CREATE POLICY "Users can view own company presupuestos"
  ON presupuestos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = presupuestos.empresa_id
    )
  );

CREATE POLICY "Users can insert own company presupuestos"
  ON presupuestos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = presupuestos.empresa_id
    )
  );

CREATE POLICY "Users can update own company presupuestos"
  ON presupuestos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = presupuestos.empresa_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = presupuestos.empresa_id
    )
  );

CREATE POLICY "Users can delete own company presupuestos"
  ON presupuestos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM empresas
      WHERE empresas.id = presupuestos.empresa_id
    )
  );

-- Políticas para detalle_presupuestos
CREATE POLICY "Users can view own company detalle presupuestos"
  ON detalle_presupuestos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      JOIN empresas ON empresas.id = presupuestos.empresa_id
      WHERE presupuestos.id = detalle_presupuestos.presupuesto_id
    )
  );

CREATE POLICY "Users can insert own company detalle presupuestos"
  ON detalle_presupuestos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos
      JOIN empresas ON empresas.id = presupuestos.empresa_id
      WHERE presupuestos.id = detalle_presupuestos.presupuesto_id
    )
  );

CREATE POLICY "Users can update own company detalle presupuestos"
  ON detalle_presupuestos FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      JOIN empresas ON empresas.id = presupuestos.empresa_id
      WHERE presupuestos.id = detalle_presupuestos.presupuesto_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM presupuestos
      JOIN empresas ON empresas.id = presupuestos.empresa_id
      WHERE presupuestos.id = detalle_presupuestos.presupuesto_id
    )
  );

CREATE POLICY "Users can delete own company detalle presupuestos"
  ON detalle_presupuestos FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM presupuestos
      JOIN empresas ON empresas.id = presupuestos.empresa_id
      WHERE presupuestos.id = detalle_presupuestos.presupuesto_id
    )
  );

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_presupuestos_empresa_id ON presupuestos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente_id ON presupuestos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_fecha ON presupuestos(fecha_presupuesto);
CREATE INDEX IF NOT EXISTS idx_presupuestos_estado ON presupuestos(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_presupuestos_presupuesto_id ON detalle_presupuestos(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_detalle_presupuestos_producto_id ON detalle_presupuestos(producto_id);
