/*
  # Crear tablas para Promociones

  1. Nuevas Tablas
    - `promociones`
      - `id` (uuid, primary key)
      - `empresa_id` (uuid, foreign key)
      - `nombre` (text) - Nombre de la promoción/combo
      - `descripcion` (text) - Descripción opcional
      - `precio_total` (numeric) - Precio total del combo
      - `activo` (boolean) - Estado de la promoción
      - `creado_en` (timestamptz)
      - `actualizado_en` (timestamptz)
    
    - `detalle_promociones`
      - `id` (uuid, primary key)
      - `promocion_id` (uuid, foreign key)
      - `producto_id` (uuid, foreign key)
      - `cantidad` (numeric) - Cantidad del producto en el combo

  2. Seguridad
    - Habilitar RLS en ambas tablas
    - Políticas para usuarios autenticados
*/

-- Crear tabla promociones
CREATE TABLE IF NOT EXISTS promociones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES empresas(id),
  nombre text NOT NULL,
  descripcion text,
  precio_total numeric(10,2) NOT NULL DEFAULT 0,
  activo boolean DEFAULT true,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Crear tabla detalle_promociones
CREATE TABLE IF NOT EXISTS detalle_promociones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promocion_id uuid NOT NULL REFERENCES promociones(id) ON DELETE CASCADE,
  producto_id uuid NOT NULL REFERENCES productos(id),
  cantidad numeric(10,2) NOT NULL DEFAULT 1,
  CONSTRAINT detalle_promociones_cantidad_positiva CHECK (cantidad > 0)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_promociones_empresa_id ON promociones(empresa_id);
CREATE INDEX IF NOT EXISTS idx_promociones_activo ON promociones(activo);
CREATE INDEX IF NOT EXISTS idx_detalle_promociones_promocion_id ON detalle_promociones(promocion_id);
CREATE INDEX IF NOT EXISTS idx_detalle_promociones_producto_id ON detalle_promociones(producto_id);

-- Habilitar RLS
ALTER TABLE promociones ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_promociones ENABLE ROW LEVEL SECURITY;

-- Políticas para promociones
CREATE POLICY "Users can view active promotions"
  ON promociones FOR SELECT
  TO authenticated
  USING (activo = true);

CREATE POLICY "Users can insert promotions"
  ON promociones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update promotions"
  ON promociones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete promotions"
  ON promociones FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para detalle_promociones
CREATE POLICY "Users can view promotion details"
  ON detalle_promociones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert promotion details"
  ON detalle_promociones FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update promotion details"
  ON detalle_promociones FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete promotion details"
  ON detalle_promociones FOR DELETE
  TO authenticated
  USING (true);

-- Función para actualizar fecha de actualización
CREATE OR REPLACE FUNCTION update_promociones_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente la fecha
DROP TRIGGER IF EXISTS trigger_update_promociones_updated_at ON promociones;
CREATE TRIGGER trigger_update_promociones_updated_at
  BEFORE UPDATE ON promociones
  FOR EACH ROW
  EXECUTE FUNCTION update_promociones_updated_at();