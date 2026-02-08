import jsPDF from 'jspdf'

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
  venta: VentaCompleta,
  detalles: DetalleVenta[]
): Blob => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 15

  doc.setFillColor(71, 85, 105)
  doc.rect(0, 0, pageWidth, 45, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(32)
  doc.setFont('helvetica', 'bold')
  doc.text('TEJIDOS', pageWidth / 2, 18, { align: 'center' })
  doc.text('GALVANIZADOS', pageWidth / 2, 30, { align: 'center' })

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text('tejidosuy.com - 097 705 384 - @tejidos_galvanizados', pageWidth / 2, 38, { align: 'center' })

  let yPos = 55

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const fechaVenta = new Date(venta.fecha_venta).toLocaleDateString('es-UY')
  doc.text(`Fecha: ${fechaVenta}`, margin, yPos)

  yPos += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('NOMBRE CLIENTE', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.text(venta.cliente?.nombre?.toUpperCase() || 'CONSUMIDOR FINAL', pageWidth - margin, yPos, { align: 'right' })

  doc.setDrawColor(100, 100, 100)
  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)

  yPos += 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CELULAR', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.text(venta.cliente?.telefono || '095 545 383', pageWidth - margin, yPos, { align: 'right' })

  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)

  yPos += 12
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('LUGAR DE ENTREGA', margin, yPos)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)

  let lugarEntrega = ''
  if (venta.localidad) lugarEntrega = venta.localidad
  if (venta.direccion) lugarEntrega += (lugarEntrega ? ', ' : '') + venta.direccion
  if (!lugarEntrega) lugarEntrega = 'ENTREGA EN LA TEJA'

  doc.text(lugarEntrega.toUpperCase(), pageWidth - margin, yPos, { align: 'right' })

  doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2)

  yPos += 15
  doc.setFillColor(71, 85, 105)
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('ITEM', margin + 3, yPos + 7)
  doc.text('PRECIO', pageWidth / 2 - 15, yPos + 7, { align: 'center' })
  doc.text('CANT.', pageWidth / 2 + 20, yPos + 7, { align: 'center' })
  doc.text('SUBTOTAL', pageWidth - margin - 3, yPos + 7, { align: 'right' })

  yPos += 10

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const maxProductos = 5
  const filaHeight = 10

  detalles.slice(0, maxProductos).forEach((detalle, index) => {
    if (yPos > pageHeight - 50) {
      return
    }

    let nombreProducto = ''
    if (detalle.producto) {
      const producto = Array.isArray(detalle.producto) ? detalle.producto[0] : detalle.producto

      if (producto) {
        let categoriaNombre = producto.nombre
        if (producto.categoria) {
          if (Array.isArray(producto.categoria) && producto.categoria.length > 0) {
            categoriaNombre = producto.categoria[0].nombre
          } else if (!Array.isArray(producto.categoria)) {
            categoriaNombre = producto.categoria.nombre
          }
        }

        const subtipo = producto.subtipo || ''

        nombreProducto = categoriaNombre.toUpperCase()
        if (subtipo) {
          nombreProducto += ` ${subtipo.toUpperCase()}`
        }

        if (producto.altura_m || producto.largo_m || producto.separacion_cm) {
          let medidas = ''
          if (producto.altura_m) medidas += `${producto.altura_m}M`
          if (producto.largo_m) medidas += `X${producto.largo_m}M`
          if (producto.separacion_cm) medidas += ` ${producto.separacion_cm}CM`
          nombreProducto += ` ${medidas}`
        }
      }
    }

    if ((index + 1) % 2 === 0) {
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, pageWidth - 2 * margin, filaHeight, 'F')
    } else {
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
    }

    doc.text(nombreProducto, margin + 3, yPos + 7)
    doc.text(`$${detalle.precio_unitario.toFixed(0)}`, pageWidth / 2 - 15, yPos + 7, { align: 'center' })
    doc.text(detalle.cantidad.toString(), pageWidth / 2 + 20, yPos + 7, { align: 'center' })
    doc.text(`$${detalle.subtotal_item.toFixed(0)}`, pageWidth - margin - 3, yPos + 7, { align: 'right' })

    yPos += filaHeight
  })

  while (detalles.length < maxProductos) {
    if ((detalles.length) % 2 === 0) {
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, yPos, pageWidth - margin, yPos)
    }
    yPos += filaHeight
    detalles.push({} as DetalleVenta)
  }

  doc.setFillColor(71, 85, 105)
  doc.rect(margin, yPos, (pageWidth - 2 * margin) * 0.65, 12, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('PRECIO TOTAL', margin + 3, yPos + 8)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(16)
  doc.text(`$${venta.total.toFixed(0)}`, pageWidth - margin - 3, yPos + 9, { align: 'right' })

  yPos += 20

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Precios por pago contado', margin, yPos)

  return doc.output('blob')
}
