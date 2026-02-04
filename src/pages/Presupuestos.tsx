import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { FileText, Plus, Search, Trash2, CheckCircle, XCircle, Clock, X, Truck, AlertCircle } from 'lucide-react'
import MapaPicker from '../components/MapaPicker'

interface Presupuesto {
  id: string
  numero_presupuesto: string
  fecha_presupuesto: string
  total: number
  estado: string
  cliente_id: string | null
  descuento: number
  subtotal: number
  cliente: { nombre: string } | null
  notas: string
}

export default function Presupuestos() {
  const navigate = useNavigate()
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([])
  const [filteredPresupuestos, setFilteredPresupuestos] = useState<Presupuesto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [showConversionModal, setShowConversionModal] = useState(false)
  const [presupuestoSeleccionado, setPresupuestoSeleccionado] = useState<Presupuesto | null>(null)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [datosVenta, setDatosVenta] = useState({
    metodo_pago: 'efectivo',
    localidad: '',
    direccion_entrega: '',
    latitud: null as number | null,
    longitud: null as number | null,
    costo_delivery: '',
    notas_venta: '',
  })

  useEffect(() => {
    loadPresupuestos()
  }, [])

  useEffect(() => {
    filterPresupuestos()
  }, [searchTerm, estadoFiltro, presupuestos])

  const loadPresupuestos = async () => {
    try {
      const { data, error } = await supabase
        .from('presupuestos')
        .select(`
          id,
          numero_presupuesto,
          fecha_presupuesto,
          total,
          estado,
          notas,
          cliente_id,
          descuento,
          subtotal,
          clientes(nombre)
        `)
        .order('fecha_presupuesto', { ascending: false })

      if (error) throw error

      const presupuestosFormateados = (data || []).map((p: any) => ({
        id: p.id,
        numero_presupuesto: p.numero_presupuesto,
        fecha_presupuesto: p.fecha_presupuesto,
        total: p.total,
        estado: p.estado,
        notas: p.notas,
        cliente_id: p.cliente_id,
        descuento: p.descuento,
        subtotal: p.subtotal,
        cliente: p.clientes ? { nombre: p.clientes.nombre } : null,
      }))

      setPresupuestos(presupuestosFormateados)
    } catch (err: any) {
      console.error('Error al cargar presupuestos:', err.message)
    } finally {
      setLoading(false)
    }
  }

  const filterPresupuestos = () => {
    let filtered = presupuestos

    if (estadoFiltro !== 'todos') {
      filtered = filtered.filter((p) => p.estado === estadoFiltro)
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.numero_presupuesto.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.cliente?.nombre.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredPresupuestos(filtered)
  }

  const handleCambiarEstado = async (presupuesto: Presupuesto, nuevoEstado: string) => {
    if (nuevoEstado === 'aprobado' || nuevoEstado === 'convertido') {
      setPresupuestoSeleccionado(presupuesto)
      setShowConversionModal(true)
    } else {
      try {
        const { error } = await supabase
          .from('presupuestos')
          .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
          .eq('id', presupuesto.id)

        if (error) throw error
        loadPresupuestos()
      } catch (err: any) {
        console.error('Error al cambiar estado:', err.message)
        setError(err.message)
      }
    }
  }

  const convertirAVenta = async () => {
    if (!presupuestoSeleccionado) return

    setConverting(true)
    setError('')

    try {
      const { data: detallesPresupuesto, error: errorDetalles } = await supabase
        .from('detalle_presupuestos')
        .select('producto_id, cantidad, precio_unitario, subtotal_item')
        .eq('presupuesto_id', presupuestoSeleccionado.id)

      if (errorDetalles) throw errorDetalles

      if (!detallesPresupuesto || detallesPresupuesto.length === 0) {
        throw new Error('El presupuesto no tiene productos')
      }

      const { data: empresaData, error: errorEmpresa } = await supabase
        .from('empresas')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (errorEmpresa) throw errorEmpresa
      if (!empresaData) throw new Error('No se encontró la empresa')

      const hoy = new Date().toISOString().split('T')[0]
      const { data: ultimaVenta, error: errorNumero } = await supabase
        .from('ventas')
        .select('numero_venta')
        .like('numero_venta', `V-${hoy}%`)
        .order('numero_venta', { ascending: false })
        .limit(1)

      if (errorNumero) throw errorNumero

      let contador = 1
      if (ultimaVenta && ultimaVenta.length > 0) {
        const partes = ultimaVenta[0].numero_venta.split('-')
        if (partes.length === 5) {
          contador = parseInt(partes[4]) + 1
        }
      }

      const numeroVenta = `V-${hoy}-${contador.toString().padStart(3, '0')}`

      const costoDelivery = parseFloat(datosVenta.costo_delivery) || 0
      const totalConDelivery = presupuestoSeleccionado.total + costoDelivery

      const ventaData = {
        numero_venta: numeroVenta,
        empresa_id: empresaData.id,
        cliente_id: presupuestoSeleccionado.cliente_id,
        fecha_venta: new Date().toISOString().split('T')[0],
        subtotal: presupuestoSeleccionado.subtotal,
        descuento: presupuestoSeleccionado.descuento,
        total: totalConDelivery,
        metodo_pago: datosVenta.metodo_pago,
        localidad: datosVenta.localidad || null,
        direccion_entrega: datosVenta.direccion_entrega || null,
        latitud: datosVenta.latitud,
        longitud: datosVenta.longitud,
        costo_delivery: costoDelivery,
        notas: datosVenta.notas_venta || presupuestoSeleccionado.notas || null,
      }

      const { data: ventaCreada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([ventaData])
        .select()
        .single()

      if (errorVenta) throw errorVenta

      const detallesVenta = detallesPresupuesto.map((det) => ({
        venta_id: ventaCreada.id,
        producto_id: det.producto_id,
        cantidad: det.cantidad,
        precio_unitario: det.precio_unitario,
        subtotal_item: det.subtotal_item,
      }))

      const { error: errorDetalleVenta } = await supabase
        .from('detalle_ventas')
        .insert(detallesVenta)

      if (errorDetalleVenta) throw errorDetalleVenta

      for (const detalle of detallesPresupuesto) {
        const { data: productoData, error: errorProducto } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', detalle.producto_id)
          .single()

        if (errorProducto) throw errorProducto

        const nuevoStock = productoData.stock - detalle.cantidad

        const { error: errorUpdateStock } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', detalle.producto_id)

        if (errorUpdateStock) throw errorUpdateStock

        const { error: errorHistorial } = await supabase
          .from('historial_stock')
          .insert({
            empresa_id: empresaData.id,
            producto_id: detalle.producto_id,
            tipo_movimiento: 'salida',
            cantidad: detalle.cantidad,
            stock_anterior: productoData.stock,
            stock_nuevo: nuevoStock,
            motivo: `Venta ${numeroVenta} (Presupuesto ${presupuestoSeleccionado.numero_presupuesto})`,
          })

        if (errorHistorial) throw errorHistorial
      }

      const { error: errorUpdatePresupuesto } = await supabase
        .from('presupuestos')
        .update({ estado: 'convertido', updated_at: new Date().toISOString() })
        .eq('id', presupuestoSeleccionado.id)

      if (errorUpdatePresupuesto) throw errorUpdatePresupuesto

      setSuccess(`Presupuesto convertido exitosamente a venta ${numeroVenta}`)
      setShowConversionModal(false)
      setPresupuestoSeleccionado(null)
      setDatosVenta({
        metodo_pago: 'efectivo',
        localidad: '',
        direccion_entrega: '',
        latitud: null,
        longitud: null,
        costo_delivery: '',
        notas_venta: '',
      })
      loadPresupuestos()

      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setConverting(false)
    }
  }

  const eliminarPresupuesto = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este presupuesto?')) return

    try {
      const { error } = await supabase.from('presupuestos').delete().eq('id', id)

      if (error) throw error
      loadPresupuestos()
    } catch (err: any) {
      console.error('Error al eliminar:', err.message)
    }
  }

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { color: string; bg: string; icon: any; label: string }> = {
      pendiente: { color: '#f59e0b', bg: '#fef3c7', icon: Clock, label: 'Pendiente' },
      aprobado: { color: '#10b981', bg: '#d1fae5', icon: CheckCircle, label: 'Aprobado' },
      rechazado: { color: '#ef4444', bg: '#fee2e2', icon: XCircle, label: 'Rechazado' },
      convertido: { color: '#3b82f6', bg: '#dbeafe', icon: CheckCircle, label: 'Convertido' },
    }

    const config = estados[estado] || estados.pendiente
    const Icon = config.icon

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '9999px',
          fontSize: '0.875rem',
          fontWeight: '600',
          color: config.color,
          backgroundColor: config.bg,
        }}
      >
        <Icon size={14} />
        {config.label}
      </span>
    )
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="loading">Cargando...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              padding: '2rem',
              color: 'white',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Presupuestos</h1>
                <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
                  Gestiona las cotizaciones de tus clientes
                </p>
              </div>
              <button
                onClick={() => navigate('/nuevo-presupuesto')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'white',
                  color: '#3b82f6',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '1rem',
                }}
              >
                <Plus size={20} />
                Nuevo Presupuesto
              </button>
            </div>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#fee2e2',
                  color: '#991b1b',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}
              >
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                  background: '#d1fae5',
                  color: '#065f46',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}
              >
                <CheckCircle size={20} />
                <span>{success}</span>
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <div style={{ position: 'relative' }}>
                <Search
                  size={20}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#6b7280',
                  }}
                />
                <input
                  type="text"
                  placeholder="Buscar por número o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '1rem',
                  }}
                />
              </div>

              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                style={{
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                }}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="convertido">Convertido</option>
              </select>
            </div>

            {filteredPresupuestos.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 2rem',
                  color: '#6b7280',
                }}
              >
                <FileText size={64} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                <p style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                  {searchTerm || estadoFiltro !== 'todos'
                    ? 'No se encontraron presupuestos'
                    : 'No hay presupuestos registrados'}
                </p>
                <p style={{ marginTop: '0.5rem' }}>
                  {searchTerm || estadoFiltro !== 'todos'
                    ? 'Intenta con otros filtros'
                    : 'Comienza creando tu primer presupuesto'}
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: 'white',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid #e5e7eb',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                        Número
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                        Fecha
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>
                        Cliente
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                        Total
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                        Estado
                      </th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPresupuestos.map((presupuesto) => (
                      <tr
                        key={presupuesto.id}
                        style={{ borderBottom: '1px solid #e5e7eb' }}
                      >
                        <td style={{ padding: '1rem', fontWeight: '600', color: '#3b82f6' }}>
                          {presupuesto.numero_presupuesto}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {new Date(presupuesto.fecha_presupuesto).toLocaleDateString('es-UY')}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          {presupuesto.cliente?.nombre || 'Sin cliente'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>
                          ${presupuesto.total.toFixed(2)}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {getEstadoBadge(presupuesto.estado)}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.5rem',
                              justifyContent: 'center',
                            }}
                          >
                            {presupuesto.estado !== 'convertido' && (
                              <button
                                onClick={() => handleCambiarEstado(presupuesto, 'aprobado')}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '0.875rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                                title="Convertir a venta"
                              >
                                <CheckCircle size={14} />
                                Convertir
                              </button>
                            )}
                            {presupuesto.estado === 'pendiente' && (
                              <button
                                onClick={() => handleCambiarEstado(presupuesto, 'rechazado')}
                                style={{
                                  padding: '0.5rem 1rem',
                                  backgroundColor: '#ef4444',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontWeight: '600',
                                  fontSize: '0.875rem',
                                }}
                                title="Rechazar"
                              >
                                Rechazar
                              </button>
                            )}
                            <button
                              onClick={() => eliminarPresupuesto(presupuesto.id)}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: '#fee2e2',
                                color: '#dc2626',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showConversionModal && presupuestoSeleccionado && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  Convertir Presupuesto a Venta
                </h2>
                <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280' }}>
                  {presupuestoSeleccionado.numero_presupuesto} - ${presupuestoSeleccionado.total.toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowConversionModal(false)
                  setPresupuestoSeleccionado(null)
                }}
                style={{
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'transparent',
                  color: '#6b7280',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="form-group">
                <label>Método de Pago *</label>
                <select
                  value={datosVenta.metodo_pago}
                  onChange={(e) =>
                    setDatosVenta({ ...datosVenta, metodo_pago: e.target.value })
                  }
                  style={{ width: '100%' }}
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="mercadopago">MercadoPago</option>
                </select>
              </div>

              <div
                style={{
                  background: '#f8fafc',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                }}
              >
                <h3
                  style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Truck size={20} />
                  Datos de Entrega
                </h3>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div className="form-group">
                    <label>Localidad</label>
                    <input
                      type="text"
                      value={datosVenta.localidad}
                      onChange={(e) =>
                        setDatosVenta({ ...datosVenta, localidad: e.target.value })
                      }
                      placeholder="Ej: Montevideo"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dirección de Entrega</label>
                    <input
                      type="text"
                      value={datosVenta.direccion_entrega}
                      onChange={(e) =>
                        setDatosVenta({ ...datosVenta, direccion_entrega: e.target.value })
                      }
                      placeholder="Ej: Av. 18 de Julio 1234"
                    />
                  </div>

                  <div className="form-group">
                    <label>Costo de Delivery (UYU)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={datosVenta.costo_delivery}
                      onChange={(e) =>
                        setDatosVenta({ ...datosVenta, costo_delivery: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <MapaPicker
                    onLocationSelect={(lat, lng) => {
                      setDatosVenta({
                        ...datosVenta,
                        latitud: lat,
                        longitud: lng,
                      })
                    }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notas Adicionales</label>
                <textarea
                  value={datosVenta.notas_venta}
                  onChange={(e) =>
                    setDatosVenta({ ...datosVenta, notas_venta: e.target.value })
                  }
                  rows={3}
                  placeholder="Notas adicionales para la venta..."
                />
              </div>

              <div
                style={{
                  background: '#eff6ff',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Subtotal Presupuesto:</span>
                  <span>${presupuestoSeleccionado.subtotal.toFixed(2)}</span>
                </div>
                {presupuestoSeleccionado.descuento > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ fontWeight: '600' }}>Descuento:</span>
                    <span>-${presupuestoSeleccionado.descuento.toFixed(2)}</span>
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span style={{ fontWeight: '600' }}>Total Presupuesto:</span>
                  <span>${presupuestoSeleccionado.total.toFixed(2)}</span>
                </div>
                {parseFloat(datosVenta.costo_delivery) > 0 && (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span style={{ fontWeight: '600' }}>Costo Delivery:</span>
                      <span>+${parseFloat(datosVenta.costo_delivery).toFixed(2)}</span>
                    </div>
                    <div
                      style={{
                        borderTop: '2px solid #3b82f6',
                        paddingTop: '0.5rem',
                        marginTop: '0.5rem',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '1.2rem',
                        }}
                      >
                        <span style={{ fontWeight: '700' }}>TOTAL VENTA:</span>
                        <span style={{ fontWeight: '700', color: '#3b82f6' }}>
                          ${(presupuestoSeleccionado.total + parseFloat(datosVenta.costo_delivery)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={convertirAVenta}
                  disabled={converting}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    backgroundColor: converting ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: converting ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <CheckCircle size={20} />
                  {converting ? 'Convirtiendo...' : 'Convertir a Venta'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConversionModal(false)
                    setPresupuestoSeleccionado(null)
                  }}
                  disabled={converting}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: converting ? 'not-allowed' : 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
