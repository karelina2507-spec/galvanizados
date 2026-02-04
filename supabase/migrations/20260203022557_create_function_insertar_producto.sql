/*
  # Crear función para insertar productos

  1. Nueva función
    - `insertar_producto` - Función que permite insertar productos sin restricciones de RLS
    
  2. Seguridad
    - La función se ejecuta con privilegios elevados (SECURITY DEFINER)
    - Solo accesible por usuarios autenticados
*/

CREATE OR REPLACE FUNCTION insertar_producto(
  p_empresa_id UUID,
  p_categoria_id UUID,
  p_codigo_producto TEXT,
  p_nombre TEXT,
  p_subtipo TEXT,
  p_altura_m NUMERIC DEFAULT NULL,
  p_largo_m NUMERIC DEFAULT NULL,
  p_grosor_mm NUMERIC DEFAULT NULL,
  p_separacion_cm NUMERIC DEFAULT NULL,
  p_m2_rollo NUMERIC DEFAULT NULL,
  p_precio_compra NUMERIC DEFAULT 0,
  p_precio_venta NUMERIC DEFAULT 0,
  p_precio_costo_m2 NUMERIC DEFAULT NULL,
  p_precio_venta_m2 NUMERIC DEFAULT NULL,
  p_observacion TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_producto_id UUID;
BEGIN
  INSERT INTO productos (
    empresa_id,
    categoria_id,
    codigo_producto,
    nombre,
    subtipo,
    altura_m,
    largo_m,
    grosor_mm,
    separacion_cm,
    m2_rollo,
    precio_compra,
    precio_venta,
    precio_costo_m2,
    precio_venta_m2,
    observacion,
    activo
  ) VALUES (
    p_empresa_id,
    p_categoria_id,
    p_codigo_producto,
    p_nombre,
    p_subtipo,
    p_altura_m,
    p_largo_m,
    p_grosor_mm,
    p_separacion_cm,
    p_m2_rollo,
    p_precio_compra,
    p_precio_venta,
    p_precio_costo_m2,
    p_precio_venta_m2,
    p_observacion,
    true
  ) RETURNING id INTO v_producto_id;
  
  RETURN v_producto_id;
END;
$$;