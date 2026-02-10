import { jsPDF } from 'jspdf'

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
  subtotal?: number
  envio?: number
  descuento?: number
  notas?: string
}

export const generarBoletaPDF = (
  venta: VentaCompleta,
  detalles: DetalleVenta[]
): Blob => {
  const doc = new jsPDF()

  const pageWidth = doc.internal.pageSize.getWidth()
  let yPos = 20

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('BOLETA DE VENTA', pageWidth / 2, yPos, { align: 'center' })

  yPos += 15
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`N° ${venta.numero_venta}`, 20, yPos)
  doc.text(`Fecha: ${new Date(venta.fecha_venta).toLocaleDateString('es-UY')}`, pageWidth - 20, yPos, { align: 'right' })

  yPos += 10
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10

  if (venta.cliente?.nombre) {
    doc.setFont('helvetica', 'bold')
    doc.text('Cliente:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(venta.cliente.nombre, 45, yPos)
    yPos += 6
  }

  if (venta.direccion || venta.localidad || venta.departamento) {
    doc.setFont('helvetica', 'bold')
    doc.text('Dirección:', 20, yPos)
    doc.setFont('helvetica', 'normal')

    const direccionParts: string[] = []
    if (venta.direccion) direccionParts.push(venta.direccion)
    if (venta.localidad) direccionParts.push(venta.localidad)
    if (venta.departamento) direccionParts.push(venta.departamento)

    doc.text(direccionParts.join(', '), 45, yPos)
    yPos += 6
  }

  yPos += 5
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 10

  doc.setFont('helvetica', 'bold')
  doc.text('Producto', 20, yPos)
  doc.text('Cant.', 120, yPos, { align: 'right' })
  doc.text('P. Unit.', 150, yPos, { align: 'right' })
  doc.text('Subtotal', pageWidth - 20, yPos, { align: 'right' })

  yPos += 3
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)

  detalles.forEach((detalle) => {
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    const producto = Array.isArray(detalle.producto) ? detalle.producto[0] : detalle.producto

    if (producto) {
      let nombreProducto = `${producto.codigo_producto} - ${producto.nombre}`

      if (producto.altura_m || producto.largo_m || producto.separacion_cm) {
        nombreProducto += ' ('
        const partes = []
        if (producto.altura_m) partes.push(`${producto.altura_m}m`)
        if (producto.largo_m) partes.push(`${producto.largo_m}m`)
        if (producto.separacion_cm) partes.push(`${producto.separacion_cm}cm`)
        nombreProducto += partes.join(' x ')
        nombreProducto += ')'
      }

      const lineas = doc.splitTextToSize(nombreProducto, 95)
      doc.text(lineas, 20, yPos)

      const lineHeight = lineas.length * 5

      doc.text(detalle.cantidad.toString(), 120, yPos, { align: 'right' })
      doc.text(`$${detalle.precio_unitario.toFixed(2)}`, 150, yPos, { align: 'right' })
      doc.text(`$${detalle.subtotal_item.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })

      yPos += Math.max(lineHeight, 7)
    }
  })

  yPos += 5
  doc.setFontSize(10)
  doc.line(20, yPos, pageWidth - 20, yPos)
  yPos += 8

  const subtotal = venta.subtotal || detalles.reduce((sum, d) => sum + d.subtotal_item, 0)
  doc.text('Subtotal:', pageWidth - 70, yPos)
  doc.text(`$${subtotal.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
  yPos += 6

  if (venta.envio && venta.envio > 0) {
    doc.text('Envío:', pageWidth - 70, yPos)
    doc.text(`$${venta.envio.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 6
  }

  if (venta.descuento && venta.descuento > 0) {
    doc.text('Descuento:', pageWidth - 70, yPos)
    doc.text(`-$${venta.descuento.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })
    yPos += 6
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  yPos += 2
  doc.text('TOTAL:', pageWidth - 70, yPos)
  doc.text(`$${venta.total.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' })

  if (venta.notas) {
    yPos += 15
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.text('Notas:', 20, yPos)
    yPos += 5
    const notasLineas = doc.splitTextToSize(venta.notas, pageWidth - 40)
    doc.text(notasLineas, 20, yPos)
  }

  const pdfBlob = doc.output('blob')
  return pdfBlob
}
