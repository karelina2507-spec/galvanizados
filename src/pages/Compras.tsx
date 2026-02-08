import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import '../styles/pages.css'

interface Compra {
  id: string
  numero_compra: string
  proveedor_id: string
  fecha_compra: string
  total: number
}

interface DetalleCompra {
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
}

export default function Compras() {
  const [compras, setCompras] = useState<Compra[]>([])
  const [proveedores, setProveedores] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    numero_compra: '',
    proveedor_id: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    descuento: '',
    cotizacion: '',
    notas: '',
  })

  const [detalles, setDetalles] = useState<DetalleCompra[]>([])
  const [nuevoDetalle, setNuevoDetalle] = useState({
    producto_id: '',
    cantidad: '',
    precio_unitario: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [comprasRes, proveedoresRes, productosRes] = await Promise.all([
        supabase.from('compras').select('*').order('fecha_compra', { ascending: false }),
        supabase.from('proveedores').select('*').eq('activo', true),
        supabase.from('productos').select('*').eq('activo', true),
      ])

      if (comprasRes.error) throw comprasRes.error
      if (proveedoresRes.error) throw proveedoresRes.error
      if (productosRes.error) throw productosRes.error

      setCompras(comprasRes.data || [])
      setProveedores(proveedoresRes.data || [])
      setProductos(productosRes.data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const agregarDetalle = () => {
    if (!nuevoDetalle.producto_id || !nuevoDetalle.cantidad || !nuevoDetalle.precio_unitario) {
      setError('Complete todos los campos del detalle')
      return
    }

    const cantidad = parseFloat(nuevoDetalle.cantidad)
    const precio = parseFloat(nuevoDetalle.precio_unitario)
    const subtotal = cantidad * precio

    setDetalles([
      ...detalles,
      {
        producto_id: nuevoDetalle.producto_id,
        cantidad,
        precio_unitario: precio,
        subtotal_item: subtotal,
      },
    ])

    setNuevoDetalle({
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
    })
  }

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index))
  }

  const calcularTotal = () => {
    const subtotal = detalles.reduce((sum, det) => sum + det.subtotal_item, 0)
    const descuento = parseFloat(formData.descuento) || 0
    return subtotal - descuento
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto a la compra')
      return
    }

    try {
      const subtotal = detalles.reduce((sum, det) => sum + det.subtotal_item, 0)
      const total = calcularTotal()

      const compraData = {
        ...formData,
        subtotal,
        total,
        descuento: parseFloat(formData.descuento) || 0,
        cotizacion: formData.cotizacion ? parseFloat(formData.cotizacion) : null,
      }

      const { data: compraCreada, error: compraError } = await supabase
        .from('compras')
        .insert([compraData])
        .select()
        .single()

      if (compraError) throw compraError

      const detallesConCompraId = detalles.map((det) => ({
        ...det,
        compra_id: compraCreada.id,
      }))

      const { error: detalleError } = await supabase
        .from('detalle_compras')
        .insert(detallesConCompraId)

      if (detalleError) throw detalleError

      setSuccess('Compra registrada exitosamente')
      resetForm()
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      numero_compra: '',
      proveedor_id: '',
      fecha_compra: new Date().toISOString().split('T')[0],
      descuento: '',
      cotizacion: '',
      notas: '',
    })
    setDetalles([])
    setNuevoDetalle({
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
    })
    setShowForm(false)
  }

  const getProductoNombre = (id: string) => {
    const producto = productos.find((p) => p.id === id)
    return producto ? `${producto.codigo_producto} - ${producto.nombre}` : id
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

  if (!showForm) {
    return (
      <Layout>
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1>Gestión de Compras</h1>
              <p>Registra compras y actualiza stock automáticamente</p>
            </div>
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={20} />
              Nueva Compra
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {compras.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-state">
                      No hay compras registradas
                    </td>
                  </tr>
                ) : (
                  compras.map((compra) => (
                    <tr key={compra.id}>
                      <td>{compra.numero_compra}</td>
                      <td>{compra.proveedor_id || 'Sin proveedor'}</td>
                      <td>{new Date(compra.fecha_compra).toLocaleDateString()}</td>
                      <td>${compra.total?.toFixed(2) || '0.00'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
            padding: '2rem',
            color: 'white',
          }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Nueva Compra</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Complete los datos para registrar una nueva compra</p>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: '#fee2e2',
                color: '#991b1b',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                background: '#d1fae5',
                color: '#065f46',
                borderRadius: '8px',
                marginBottom: '1.5rem',
              }}>
                <CheckCircle size={20} />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div className="form-group">
                  <label>Número Compra *</label>
                  <input
                    type="text"
                    value={formData.numero_compra}
                    onChange={(e) =>
                      setFormData({ ...formData, numero_compra: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Proveedor</label>
                  <select
                    value={formData.proveedor_id}
                    onChange={(e) =>
                      setFormData({ ...formData, proveedor_id: e.target.value })
                    }
                  >
                    <option value="">Sin proveedor</option>
                    {proveedores.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Fecha Compra *</label>
                  <input
                    type="date"
                    value={formData.fecha_compra}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_compra: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descuento (UYU)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.descuento}
                    onChange={(e) =>
                      setFormData({ ...formData, descuento: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Cotización Especial (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 45.50"
                    value={formData.cotizacion}
                    onChange={(e) =>
                      setFormData({ ...formData, cotizacion: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '2rem',
                borderRadius: '12px',
                marginBottom: '2rem',
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>Productos</h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1rem',
                }}>
                  <div className="form-group">
                    <label>Producto</label>
                    <select
                      value={nuevoDetalle.producto_id}
                      onChange={(e) => {
                        const producto = productos.find((p) => p.id === e.target.value)
                        let precioCalculado = producto?.precio_compra || 0

                        // Si hay cotización especial y el producto tiene precio en USD, usar esa cotización
                        if (formData.cotizacion && producto?.precio_venta_usd) {
                          precioCalculado = parseFloat(producto.precio_venta_usd) * parseFloat(formData.cotizacion)
                        }

                        setNuevoDetalle({
                          ...nuevoDetalle,
                          producto_id: e.target.value,
                          precio_unitario: precioCalculado.toString(),
                        })
                      }}
                    >
                      <option value="">Seleccionar...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.codigo_producto} - {p.nombre} (${p.precio_compra})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      step="0.01"
                      value={nuevoDetalle.cantidad}
                      onChange={(e) =>
                        setNuevoDetalle({ ...nuevoDetalle, cantidad: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Precio Unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      value={nuevoDetalle.precio_unitario}
                      onChange={(e) =>
                        setNuevoDetalle({
                          ...nuevoDetalle,
                          precio_unitario: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={agregarDetalle}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                      }}
                    >
                      <Plus size={20} />
                      Agregar
                    </button>
                  </div>
                </div>

                {detalles.length > 0 && (
                  <div style={{
                    background: 'white',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Producto</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Cantidad</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Precio Unit.</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Subtotal</th>
                          <th style={{ padding: '0.75rem', width: '50px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((det, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '0.75rem' }}>{getProductoNombre(det.producto_id)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{det.cantidad}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>${det.precio_unitario.toFixed(2)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>${det.subtotal_item.toFixed(2)}</td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => eliminarDetalle(index)}
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
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: '#f8fafc', fontWeight: '700', fontSize: '1.1rem' }}>
                          <td colSpan={3} style={{ padding: '1rem', textAlign: 'right' }}>
                            TOTAL:
                          </td>
                          <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', color: '#2563eb' }}>
                            ${calcularTotal().toFixed(2)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                  }}
                >
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
