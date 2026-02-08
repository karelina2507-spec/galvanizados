interface ProductoDetalle {
  codigo_producto: string
  nombre: string
  altura_m?: number
  largo_m?: number
  separacion_cm?: number
  categoria?: {
    nombre: string
  } | { nombre: string }[]
  subtipo?: string
}

interface DetalleVenta {
  cantidad: number
  precio_unitario: number
  subtotal_item: number
  producto?: ProductoDetalle | ProductoDetalle[]
}

interface VentaCompleta {
  numero_venta: string
  fecha_venta: string
  total: number
  direccion?: string
  localidad?: string
  departamento?: string
  cliente?: {
    nombre: string
    telefono?: string
  }
}

export const generarBoletaPDF = (
  _venta: VentaCompleta,
  _detalles: DetalleVenta[]
): Blob => {
  return new Blob(['PDF temporarily disabled'], { type: 'text/plain' })
}
