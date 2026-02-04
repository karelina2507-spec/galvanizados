/*
  # Corrección de funciones de actualización de stock
  
  1. Cambios
    - Actualizar función `actualizar_stock_venta()` para incluir `empresa_id` al registrar en historial_stock
    - Actualizar función `actualizar_stock_compra()` para incluir `empresa_id` al registrar en historial_stock
    - Ambas funciones obtienen el `empresa_id` de la tabla ventas/compras correspondiente
    
  2. Notas
    - Esto corrige el error: "null value in column empresa_id of relation historial_stock violates not-null constraint"
    - Las funciones ahora capturan correctamente el empresa_id de la venta o compra asociada
*/

-- Función para actualizar stock después de una venta
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Obtener el empresa_id de la venta
  SELECT empresa_id INTO v_empresa_id
  FROM ventas
  WHERE id = NEW.venta_id;

  -- Actualizar el stock
  UPDATE stock
  SET cantidad_disponible = cantidad_disponible - NEW.cantidad,
      actualizado_en = now()
  WHERE producto_id = NEW.producto_id;

  -- Registrar en historial con empresa_id
  INSERT INTO historial_stock (
    empresa_id,
    producto_id,
    tipo_movimiento,
    cantidad,
    referencia_id,
    referencia_tipo,
    notas,
    creado_en
  )
  VALUES (
    v_empresa_id,
    NEW.producto_id,
    'salida_venta',
    NEW.cantidad,
    NEW.venta_id,
    'venta',
    'Salida por venta',
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar stock después de una compra
CREATE OR REPLACE FUNCTION actualizar_stock_compra()
RETURNS TRIGGER AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Obtener el empresa_id de la compra
  SELECT empresa_id INTO v_empresa_id
  FROM compras
  WHERE id = NEW.compra_id;

  -- Actualizar el stock
  UPDATE stock
  SET cantidad_disponible = cantidad_disponible + NEW.cantidad,
      actualizado_en = now()
  WHERE producto_id = NEW.producto_id;

  -- Registrar en historial con empresa_id
  INSERT INTO historial_stock (
    empresa_id,
    producto_id,
    tipo_movimiento,
    cantidad,
    referencia_id,
    referencia_tipo,
    notas,
    creado_en
  )
  VALUES (
    v_empresa_id,
    NEW.producto_id,
    'entrada_compra',
    NEW.cantidad,
    NEW.compra_id,
    'compra',
    'Entrada por compra',
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
