import jsPDF from 'jspdf'

interface VentaDetalle {
  producto_nombre: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
}

interface Tutorial {
  categoria_nombre: string
  titulo: string
  video_url: string | null
}

interface VentaData {
  numero_venta: string
  fecha_venta: string
  cliente_nombre?: string
  subtotal: number
  envio: number
  descuento: number
  total: number
  detalles: VentaDetalle[]
  tutoriales: Tutorial[]
}

export function generarPDFVenta(venta: VentaData) {
  const doc = new jsPDF()

  let yPos = 20

  doc.setFontSize(20)
  doc.text('COMPROBANTE DE VENTA', 105, yPos, { align: 'center' })
  yPos += 15

  doc.setFontSize(12)
  doc.text(`Número: ${venta.numero_venta}`, 20, yPos)
  yPos += 7
  doc.text(`Fecha: ${venta.fecha_venta}`, 20, yPos)
  yPos += 7
  if (venta.cliente_nombre) {
    doc.text(`Cliente: ${venta.cliente_nombre}`, 20, yPos)
    yPos += 7
  }
  yPos += 5

  doc.setFontSize(14)
  doc.text('Detalle de Productos', 20, yPos)
  yPos += 10

  doc.setFontSize(10)
  doc.text('Producto', 20, yPos)
  doc.text('Cant.', 110, yPos)
  doc.text('P. Unit.', 140, yPos)
  doc.text('Subtotal', 170, yPos)
  yPos += 5
  doc.line(20, yPos, 190, yPos)
  yPos += 5

  venta.detalles.forEach((detalle) => {
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }

    const nombreProducto = detalle.producto_nombre.length > 40
      ? detalle.producto_nombre.substring(0, 37) + '...'
      : detalle.producto_nombre

    doc.text(nombreProducto, 20, yPos)
    doc.text(detalle.cantidad.toString(), 110, yPos)
    doc.text(`$${detalle.precio_unitario.toFixed(2)}`, 140, yPos)
    doc.text(`$${detalle.subtotal_item.toFixed(2)}`, 170, yPos)
    yPos += 7
  })

  yPos += 5
  doc.line(20, yPos, 190, yPos)
  yPos += 7

  doc.setFontSize(11)
  doc.text(`Subtotal:`, 140, yPos)
  doc.text(`$${venta.subtotal.toFixed(2)}`, 170, yPos)
  yPos += 6

  if (venta.envio > 0) {
    doc.text(`Envío/Reparto:`, 140, yPos)
    doc.text(`$${venta.envio.toFixed(2)}`, 170, yPos)
    yPos += 6
  }

  if (venta.descuento > 0) {
    doc.text(`Descuento:`, 140, yPos)
    doc.text(`-$${venta.descuento.toFixed(2)}`, 170, yPos)
    yPos += 6
  }

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`TOTAL:`, 140, yPos)
  doc.text(`$${venta.total.toFixed(2)}`, 170, yPos)
  yPos += 15

  if (venta.tutoriales && venta.tutoriales.length > 0) {
    if (yPos > 240) {
      doc.addPage()
      yPos = 20
    }

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('Tutoriales de Instalación', 20, yPos)
    yPos += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Accede a los siguientes tutoriales para una correcta instalación:', 20, yPos)
    yPos += 10

    const categoriasUnicas = Array.from(
      new Set(venta.tutoriales.map((t) => t.categoria_nombre))
    )

    categoriasUnicas.forEach((categoria) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }

      const tutorialesCategoria = venta.tutoriales.filter(
        (t) => t.categoria_nombre === categoria
      )

      doc.setFont('helvetica', 'bold')
      doc.text(`• ${categoria}`, 25, yPos)
      yPos += 6
      doc.setFont('helvetica', 'normal')

      tutorialesCategoria.forEach((tutorial) => {
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        doc.text(`  - ${tutorial.titulo}`, 30, yPos)
        yPos += 5

        if (tutorial.video_url) {
          doc.setTextColor(0, 0, 255)
          doc.textWithLink(`    Ver video: ${tutorial.video_url}`, 35, yPos, {
            url: tutorial.video_url,
          })
          doc.setTextColor(0, 0, 0)
          yPos += 6
        }
        yPos += 2
      })

      yPos += 3
    })
  }

  doc.save(`venta-${venta.numero_venta}.pdf`)
}
