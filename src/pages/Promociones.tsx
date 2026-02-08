import { useState, useEffect, Fragment } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Edit, Trash2, AlertCircle, CheckCircle, X, Package } from 'lucide-react'
import '../styles/pages.css'

interface Promocion {
  id: string
  nombre: string
  descripcion: string
  precio_total: number
  activo: boolean
}

interface DetallePromocion {
  producto_id: string
  cantidad: number
}

export default function Promociones() {
  const [promociones, setPromociones] = useState<Promocion[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [expandedPromoId, setExpandedPromoId] = useState<string | null>(null)
  const [detallesPromos, setDetallesPromos] = useState<Record<string, any[]>>({})

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio_total: '',
  })

  const [detalles, setDetalles] = useState<DetallePromocion[]>([])
  const [nuevoDetalle, setNuevoDetalle] = useState({
    categoria_id: '',
    producto_id: '',
    cantidad: '',
  })
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [promocionesRes, productosRes, categoriasRes, empresaRes] = await Promise.all([
        supabase.from('promociones').select('*').eq('activo', true).order('nombre'),
        supabase.from('productos').select('*').eq('activo', true),
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
      ])

      if (promocionesRes.error) throw promocionesRes.error
      if (productosRes.error) throw productosRes.error
      if (categoriasRes.error) throw categoriasRes.error
      if (empresaRes.error) throw empresaRes.error

      setPromociones(promocionesRes.data || [])
      setProductos(productosRes.data || [])
      setCategorias(categoriasRes.data || [])
      setEmpresaId(empresaRes.data?.id || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const cargarDetallesPromocion = async (promocionId: string) => {
    if (detallesPromos[promocionId]) return

    try {
      const { data, error } = await supabase
        .from('detalle_promociones')
        .select('*, producto:productos(codigo_producto, nombre, altura_m, largo_m, separacion_cm, precio_venta)')
        .eq('promocion_id', promocionId)

      if (error) throw error

      setDetallesPromos((prev) => ({
        ...prev,
        [promocionId]: data || [],
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const togglePromocionExpandida = async (promocionId: string) => {
    if (expandedPromoId === promocionId) {
      setExpandedPromoId(null)
    } else {
      setExpandedPromoId(promocionId)
      await cargarDetallesPromocion(promocionId)
    }
  }

  const handleCategoriaChange = (categoriaId: string) => {
    setNuevoDetalle({
      ...nuevoDetalle,
      categoria_id: categoriaId,
      producto_id: '',
    })

    if (categoriaId) {
      const productosDeCat = productos.filter((p) => p.categoria_id === categoriaId)
      setProductosFiltrados(productosDeCat)
    } else {
      setProductosFiltrados([])
    }
  }

  const agregarDetalle = () => {
    if (!nuevoDetalle.producto_id || !nuevoDetalle.cantidad) {
      setError('Complete todos los campos del producto')
      setTimeout(() => setError(''), 3000)
      return
    }

    const productoYaAgregado = detalles.find((d) => d.producto_id === nuevoDetalle.producto_id)
    if (productoYaAgregado) {
      setError('Este producto ya fue agregado a la promoción')
      setTimeout(() => setError(''), 3000)
      return
    }

    setDetalles([
      ...detalles,
      {
        producto_id: nuevoDetalle.producto_id,
        cantidad: parseFloat(nuevoDetalle.cantidad),
      },
    ])

    setNuevoDetalle({
      categoria_id: '',
      producto_id: '',
      cantidad: '',
    })
    setProductosFiltrados([])
  }

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index))
  }

  const calcularPrecioSugerido = () => {
    return detalles.reduce((total, det) => {
      const producto = productos.find((p) => p.id === det.producto_id)
      if (producto && producto.precio_venta) {
        return total + producto.precio_venta * det.cantidad
      }
      return total
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto a la promoción')
      return
    }

    if (!empresaId && !editingId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('promociones')
          .update({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio_total: parseFloat(formData.precio_total),
          })
          .eq('id', editingId)

        if (err) throw err

        const { error: deleteErr } = await supabase
          .from('detalle_promociones')
          .delete()
          .eq('promocion_id', editingId)

        if (deleteErr) throw deleteErr

        const detallesConPromoId = detalles.map((det) => ({
          ...det,
          promocion_id: editingId,
        }))

        const { error: detalleError } = await supabase
          .from('detalle_promociones')
          .insert(detallesConPromoId)

        if (detalleError) throw detalleError

        setSuccess('Promoción actualizada exitosamente')
        setDetallesPromos({})
      } else {
        const { data: promocionCreada, error: promoError } = await supabase
          .from('promociones')
          .insert([
            {
              ...formData,
              empresa_id: empresaId,
              precio_total: parseFloat(formData.precio_total),
            },
          ])
          .select()
          .single()

        if (promoError) throw promoError

        const detallesConPromoId = detalles.map((det) => ({
          ...det,
          promocion_id: promocionCreada.id,
        }))

        const { error: detalleError } = await supabase
          .from('detalle_promociones')
          .insert(detallesConPromoId)

        if (detalleError) throw detalleError

        setSuccess('Promoción creada exitosamente')
      }

      setTimeout(() => setSuccess(''), 3000)
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = async (promocion: Promocion) => {
    setFormData({
      nombre: promocion.nombre,
      descripcion: promocion.descripcion || '',
      precio_total: promocion.precio_total.toString(),
    })
    setEditingId(promocion.id)

    try {
      const { data, error } = await supabase
        .from('detalle_promociones')
        .select('producto_id, cantidad')
        .eq('promocion_id', promocion.id)

      if (error) throw error
      setDetalles(data || [])
    } catch (err: any) {
      setError(err.message)
    }

    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta promoción?')) return

    try {
      const { error: err } = await supabase
        .from('promociones')
        .update({ activo: false })
        .eq('id', id)

      if (err) throw err
      setSuccess('Promoción eliminada exitosamente')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio_total: '',
    })
    setDetalles([])
    setNuevoDetalle({
      categoria_id: '',
      producto_id: '',
      cantidad: '',
    })
    setProductosFiltrados([])
    setEditingId(null)
    setShowForm(false)
  }

  const getProductoNombre = (id: string) => {
    const producto = productos.find((p) => p.id === id)
    if (!producto) return id

    let nombre = `${producto.codigo_producto} - ${producto.nombre}`
    if (producto.altura_m || producto.largo_m || producto.separacion_cm) {
      nombre += ' ('
      if (producto.altura_m) nombre += `${producto.altura_m}m`
      if (producto.largo_m) nombre += ` x ${producto.largo_m}m`
      if (producto.separacion_cm) nombre += ` - ${producto.separacion_cm}cm`
      nombre += ')'
    }
    return nombre
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
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Gestión de Promociones</h1>
            <p>Crea combos y paquetes con descuentos especiales</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={20} />
            Nueva Promoción
          </button>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none' }}>
              <X size={20} />
            </button>
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

        {showForm && (
          <div className="form-card">
            <h2>{editingId ? 'Editar Promoción' : 'Nueva Promoción'}</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre de la Promoción *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Combo Cerco Completo"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Precio Total (UYU) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precio_total}
                    onChange={(e) => setFormData({ ...formData, precio_total: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                  {detalles.length > 0 && (
                    <small style={{ color: '#6b7280', fontSize: '0.85rem' }}>
                      Precio sugerido (suma individual): ${calcularPrecioSugerido().toFixed(2)}
                    </small>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Descripción</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  rows={3}
                  placeholder="Describe los beneficios de esta promoción..."
                />
              </div>

              <div style={{ marginTop: '2rem', borderTop: '2px solid #e5e7eb', paddingTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Package size={20} />
                  Productos del Combo
                </h3>

                <div className="form-grid" style={{ marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select
                      value={nuevoDetalle.categoria_id}
                      onChange={(e) => handleCategoriaChange(e.target.value)}
                    >
                      <option value="">Seleccionar categoría...</option>
                      {categorias.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Producto</label>
                    <select
                      value={nuevoDetalle.producto_id}
                      onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, producto_id: e.target.value })}
                      disabled={!nuevoDetalle.categoria_id}
                    >
                      <option value="">Seleccionar producto...</option>
                      {productosFiltrados.map((p) => {
                        let medidas = ''
                        if (p.altura_m) medidas += `${p.altura_m}m`
                        if (p.largo_m) medidas += ` x ${p.largo_m}m`
                        if (p.separacion_cm) medidas += ` - ${p.separacion_cm}cm`
                        const precio = p.precio_venta ? ` - $${Number(p.precio_venta).toFixed(2)}` : ''
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} {medidas && `(${medidas})`}{precio}
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      step="0.01"
                      value={nuevoDetalle.cantidad}
                      onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, cantidad: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <button type="button" onClick={agregarDetalle} className="btn-secondary">
                  <Plus size={18} />
                  Agregar Producto
                </button>

                {detalles.length > 0 && (
                  <div className="table-container" style={{ marginTop: '1.5rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio Unit.</th>
                          <th>Subtotal</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalles.map((det, index) => {
                          const producto = productos.find((p) => p.id === det.producto_id)
                          const precioUnit = producto?.precio_venta || 0
                          const subtotal = precioUnit * det.cantidad
                          return (
                            <tr key={index}>
                              <td>{getProductoNombre(det.producto_id)}</td>
                              <td>{det.cantidad}</td>
                              <td>${precioUnit.toFixed(2)}</td>
                              <td>${subtotal.toFixed(2)}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => eliminarDetalle(index)}
                                  className="btn-icon delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Guardar Cambios' : 'Crear Promoción'}
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Precio</th>
                <th>Productos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {promociones.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No hay promociones registradas
                  </td>
                </tr>
              ) : (
                promociones.map((promo) => (
                  <Fragment key={promo.id}>
                    <tr>
                      <td style={{ fontWeight: '600' }}>{promo.nombre}</td>
                      <td>{promo.descripcion || '-'}</td>
                      <td style={{ fontWeight: '600', color: '#059669' }}>
                        ${promo.precio_total.toFixed(2)}
                      </td>
                      <td>
                        <button
                          onClick={() => togglePromocionExpandida(promo.id)}
                          style={{
                            padding: '4px 12px',
                            fontSize: '13px',
                            background: '#f3f4f6',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                          }}
                        >
                          {expandedPromoId === promo.id ? 'Ocultar' : 'Ver productos'}
                        </button>
                      </td>
                      <td className="action-cell">
                        <button onClick={() => handleEdit(promo)} className="btn-icon edit" title="Editar">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDelete(promo.id)} className="btn-icon delete" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                    {expandedPromoId === promo.id && (
                      <tr>
                        <td colSpan={5} style={{ padding: '1rem 2rem', backgroundColor: '#f8fafc' }}>
                          {!detallesPromos[promo.id] ? (
                            <div style={{ textAlign: 'center', color: '#6b7280' }}>Cargando...</div>
                          ) : detallesPromos[promo.id].length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#6b7280' }}>
                              No hay productos en esta promoción
                            </div>
                          ) : (
                            <div>
                              <h4 style={{ marginBottom: '0.75rem', color: '#1e293b' }}>
                                Productos incluidos en el combo:
                              </h4>
                              <table style={{ width: '100%', backgroundColor: 'white', borderRadius: '8px' }}>
                                <thead style={{ backgroundColor: '#e2e8f0' }}>
                                  <tr>
                                    <th style={{ padding: '0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>
                                      Producto
                                    </th>
                                    <th style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                      Cantidad
                                    </th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                      Precio Unit.
                                    </th>
                                    <th style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                      Subtotal
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detallesPromos[promo.id].map((detalle: any, idx: number) => {
                                    const producto = detalle.producto
                                    let nombreCompleto = producto
                                      ? `${producto.codigo_producto} - ${producto.nombre}`
                                      : 'Producto no encontrado'

                                    if (producto && (producto.altura_m || producto.largo_m || producto.separacion_cm)) {
                                      nombreCompleto += ' ('
                                      if (producto.altura_m) nombreCompleto += `${producto.altura_m}m`
                                      if (producto.largo_m) nombreCompleto += ` x ${producto.largo_m}m`
                                      if (producto.separacion_cm) nombreCompleto += ` - ${producto.separacion_cm}cm`
                                      nombreCompleto += ')'
                                    }

                                    const precioUnit = producto?.precio_venta || 0
                                    const subtotal = precioUnit * detalle.cantidad

                                    return (
                                      <tr key={idx}>
                                        <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>
                                          {nombreCompleto}
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                          {detalle.cantidad}
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                          ${precioUnit.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                          ${subtotal.toFixed(2)}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                  <tr style={{ fontWeight: 'bold', backgroundColor: '#f1f5f9' }}>
                                    <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                      Precio del combo:
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', color: '#059669' }}>
                                      ${promo.precio_total.toFixed(2)}
                                    </td>
                                  </tr>
                                  <tr style={{ backgroundColor: '#fef3c7' }}>
                                    <td colSpan={3} style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                                      Ahorro:
                                    </td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right', border: '1px solid #cbd5e1', color: '#d97706', fontWeight: '700' }}>
                                      ${(detallesPromos[promo.id].reduce((sum: number, d: any) => {
                                        return sum + (d.producto?.precio_venta || 0) * d.cantidad
                                      }, 0) - promo.precio_total).toFixed(2)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}
