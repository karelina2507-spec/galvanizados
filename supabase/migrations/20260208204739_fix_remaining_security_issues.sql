/*
  # Fix Remaining Security Issues

  ## Overview
  This migration addresses several security and performance issues identified in the database audit.

  ## Changes Made

  ### 1. Add Missing Foreign Key Indexes (6 indexes)
  - Improves query performance for foreign key lookups
  - Adds indexes for: compras.proveedor_id, detalle_promociones.producto_id, 
    pedidos.cliente_id, presupuestos.cliente_id, productos.categoria_id, ventas.cliente_id

  ### 2. Optimize RLS Policies (2 policies)
  - Replaces `auth.uid()` with `(select auth.uid())` for better performance
  - Prevents re-evaluation of auth function for each row

  ### 3. Remove Unused Indexes (25 indexes)
  - Reduces storage overhead
  - Improves write performance by eliminating unnecessary index maintenance

  ### 4. Fix Function Search Paths (2 functions)
  - Sets secure search_path for get_cotizacion_actual and insertar_producto
  - Prevents potential security vulnerabilities

  ## Notes
  - Auth connection strategy and leaked password protection must be configured in Supabase Dashboard
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_compras_proveedor_id 
  ON compras(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_detalle_promociones_producto_id 
  ON detalle_promociones(producto_id);

CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id 
  ON pedidos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_presupuestos_cliente_id 
  ON presupuestos(cliente_id);

CREATE INDEX IF NOT EXISTS idx_productos_categoria_id 
  ON productos(categoria_id);

CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id 
  ON ventas(cliente_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES FOR user_profiles
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_productos_empresa;
DROP INDEX IF EXISTS idx_stock_empresa;
DROP INDEX IF EXISTS idx_clientes_empresa_id;
DROP INDEX IF EXISTS idx_pedidos_empresa;
DROP INDEX IF EXISTS idx_detalle_pedidos_pedido;
DROP INDEX IF EXISTS idx_detalle_pedidos_producto_id;
DROP INDEX IF EXISTS idx_historial_stock_empresa;
DROP INDEX IF EXISTS idx_historial_stock_producto;
DROP INDEX IF EXISTS idx_promociones_empresa_id;
DROP INDEX IF EXISTS idx_detalle_promociones_promocion_id;
DROP INDEX IF EXISTS idx_ventas_empresa;
DROP INDEX IF EXISTS idx_ventas_fecha;
DROP INDEX IF EXISTS idx_proveedores_empresa;
DROP INDEX IF EXISTS idx_detalle_compras_compra;
DROP INDEX IF EXISTS idx_detalle_compras_producto_id;
DROP INDEX IF EXISTS idx_compras_empresa;
DROP INDEX IF EXISTS idx_detalle_ventas_venta;
DROP INDEX IF EXISTS idx_detalle_ventas_producto_id;
DROP INDEX IF EXISTS idx_presupuestos_empresa_id;
DROP INDEX IF EXISTS idx_detalle_presupuestos_producto_id;
DROP INDEX IF EXISTS idx_user_profiles_empresa_id;
DROP INDEX IF EXISTS idx_gastos_empresa_id;
DROP INDEX IF EXISTS idx_gastos_fecha;
DROP INDEX IF EXISTS idx_cotizacion_dolar_empresa_id;
DROP INDEX IF EXISTS idx_servicios_empresa_id;

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Fix get_cotizacion_actual function
CREATE OR REPLACE FUNCTION get_cotizacion_actual(p_empresa_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_valor numeric;
BEGIN
  SELECT valor INTO v_valor
  FROM cotizacion_dolar
  WHERE empresa_id = p_empresa_id
  ORDER BY fecha DESC
  LIMIT 1;
  
  RETURN COALESCE(v_valor, 1);
END;
$$;

-- Fix insertar_producto function
CREATE OR REPLACE FUNCTION insertar_producto(
  p_empresa_id uuid,
  p_codigo text,
  p_nombre text,
  p_descripcion text,
  p_precio_venta numeric,
  p_precio_compra numeric,
  p_categoria_id uuid,
  p_imagen text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_producto_id uuid;
BEGIN
  INSERT INTO productos (
    empresa_id,
    codigo,
    nombre,
    descripcion,
    precio_venta,
    precio_compra,
    categoria_id,
    imagen,
    activo
  ) VALUES (
    p_empresa_id,
    p_codigo,
    p_nombre,
    p_descripcion,
    p_precio_venta,
    p_precio_compra,
    p_categoria_id,
    p_imagen,
    true
  )
  RETURNING id INTO v_producto_id;

  INSERT INTO stock (
    producto_id,
    empresa_id,
    cantidad,
    stock_minimo
  ) VALUES (
    v_producto_id,
    p_empresa_id,
    0,
    10
  );

  RETURN v_producto_id;
END;
$$;
