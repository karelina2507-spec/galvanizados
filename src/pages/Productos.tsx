import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Search, DollarSign, X } from 'lucide-react'

interface Producto {
  id: string
  codigo_producto: string
  nombre: string
  subtipo: string
  descripcion: string
  categoria_id: string
  categoria?: { nombre: string }
  precio_compra: number
  precio_venta: number
  precio_compra_uyu?: number
  precio_venta_usd?: number
  altura_m?: number
  largo_m?: number
  separacion_cm?: number
  m2_rollo?: number
  creado_en: string
}

interface Categoria {
  id: string
  nombre: string
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [cotizacionDolar, setCotizacionDolar] = useState<number | null>(null)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [nuevaCotizacion, setNuevaCotizacion] = useState('')

  const [formData, setFormData] = useState({
    codigo_producto: '',
    nombre: '',
    subtipo: '',
    descripcion: '',
    categoria_id: '',
    precio_compra: '',
    precio_venta: '',
    precio_compra_uyu: '',
    precio_venta_usd: '',
    altura_m: '',
    largo_m: '',
    separacion_cm: '',
    m2_rollo: '',
  })

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Sesión actual:', session?.user?.email)

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .single()

      if (empresaData) {
        setEmpresaId(empresaData.id)
        fetchCotizacion(empresaData.id)
      }

      fetchProductos()
      fetchCategorias()
    }
    checkAuthAndFetch()
  }, [])

  const fetchCotizacion = async (empresaIdParam: string) => {
    try {
      const { data } = await supabase
        .from('cotizacion_dolar')
        .select('valor')
        .eq('empresa_id', empresaIdParam)
        .eq('fecha', new Date().toISOString().split('T')[0])
        .maybeSingle()

      if (data) {
        setCotizacionDolar(data.valor)
      } else {
        const { data: ultimaCotizacion } = await supabase
          .from('cotizacion_dolar')
          .select('valor')
          .eq('empresa_id', empresaIdParam)
          .lte('fecha', new Date().toISOString().split('T')[0])
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (ultimaCotizacion) {
          setCotizacionDolar(ultimaCotizacion.valor)
        }
      }
    } catch (error) {
      console.error('Error fetching cotizacion:', error)
    }
  }

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error fetching categorias:', error)
    }
  }

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(nombre)
        `)
        .order('creado_en', { ascending: false })

      if (error) {
        console.error('Error fetching productos:', error)
        throw error
      }

      console.log('Productos cargados:', data?.length, data)
      setProductos(data || [])
    } catch (error) {
      console.error('Error en fetchProductos:', error)
      alert('Error al cargar productos: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrecioChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    const newFormData = { ...formData, [field]: value }

    if (cotizacionDolar) {
      if (field === 'precio_compra' && numValue > 0) {
        newFormData.precio_compra_uyu = (numValue * cotizacionDolar).toFixed(2)
      } else if (field === 'precio_compra_uyu' && numValue > 0) {
        newFormData.precio_compra = (numValue / cotizacionDolar).toFixed(2)
      } else if (field === 'precio_venta' && numValue > 0) {
        newFormData.precio_venta_usd = (numValue / cotizacionDolar).toFixed(2)
      } else if (field === 'precio_venta_usd' && numValue > 0) {
        newFormData.precio_venta = (numValue * cotizacionDolar).toFixed(2)
      }
    }

    setFormData(newFormData)
  }

  const guardarCotizacion = async () => {
    if (!empresaId || !nuevaCotizacion) return

    try {
      const { error } = await supabase
        .from('cotizacion_dolar')
        .upsert({
          empresa_id: empresaId,
          fecha: new Date().toISOString().split('T')[0],
          valor: parseFloat(nuevaCotizacion)
        }, {
          onConflict: 'fecha,empresa_id'
        })

      if (error) throw error

      setCotizacionDolar(parseFloat(nuevaCotizacion))
      setShowCotizacionModal(false)
      setNuevaCotizacion('')
      alert('Cotización guardada correctamente')
    } catch (error: any) {
      alert('Error al guardar cotización: ' + error.message)
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingId(producto.id)
    setFormData({
      codigo_producto: producto.codigo_producto,
      nombre: producto.nombre,
      subtipo: producto.subtipo || '',
      descripcion: producto.descripcion || '',
      categoria_id: producto.categoria_id,
      precio_compra: producto.precio_compra.toString(),
      precio_venta: producto.precio_venta.toString(),
      precio_compra_uyu: producto.precio_compra_uyu?.toString() || '',
      precio_venta_usd: producto.precio_venta_usd?.toString() || '',
      altura_m: producto.altura_m?.toString() || '',
      largo_m: producto.largo_m?.toString() || '',
      separacion_cm: producto.separacion_cm?.toString() || '',
      m2_rollo: producto.m2_rollo?.toString() || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return

    try {
      const dataToSave = {
        ...formData,
        empresa_id: empresaId,
        precio_compra: parseFloat(formData.precio_compra) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        precio_compra_uyu: formData.precio_compra_uyu ? parseFloat(formData.precio_compra_uyu) : null,
        precio_venta_usd: formData.precio_venta_usd ? parseFloat(formData.precio_venta_usd) : null,
        altura_m: formData.altura_m ? parseFloat(formData.altura_m) : null,
        largo_m: formData.largo_m ? parseFloat(formData.largo_m) : null,
        separacion_cm: formData.separacion_cm ? parseFloat(formData.separacion_cm) : null,
        m2_rollo: formData.m2_rollo ? parseFloat(formData.m2_rollo) : null,
      }

      if (editingId) {
        const { error } = await supabase
          .from('productos')
          .update(dataToSave)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('productos')
          .insert([dataToSave])

        if (error) throw error
      }

      fetchProductos()
      setShowForm(false)
      resetForm()
      alert(editingId ? 'Producto actualizado' : 'Producto creado')
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo_producto: '',
      nombre: '',
      subtipo: '',
      descripcion: '',
      categoria_id: '',
      precio_compra: '',
      precio_venta: '',
      precio_compra_uyu: '',
      precio_venta_usd: '',
      altura_m: '',
      largo_m: '',
      separacion_cm: '',
      m2_rollo: '',
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchProductos()
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const productosFiltrados = productos.filter((producto) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      producto.codigo_producto.toLowerCase().includes(searchLower) ||
      producto.nombre.toLowerCase().includes(searchLower) ||
      producto.subtipo?.toLowerCase().includes(searchLower) ||
      producto.categoria?.nombre?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) return <Layout><div style={{ padding: '24px' }}>Cargando productos...</div></Layout>

  console.log('Renderizando con productos:', productos.length)

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
              Productos ({productosFiltrados.length})
            </h1>
            {cotizacionDolar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#6b7280' }}>
                <DollarSign size={16} />
                <span>Cotización: ${cotizacionDolar.toFixed(2)}</span>
                <button
                  onClick={() => setShowCotizacionModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  Actualizar
                </button>
              </div>
            )}
            {!cotizacionDolar && (
              <button
                onClick={() => setShowCotizacionModal(true)}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Configurar cotización del dólar
              </button>
            )}
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
            <input
              type="text"
              placeholder="Buscar por código, nombre, subtipo o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 12px 12px 44px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>
        </div>


        <div style={{
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Código</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Producto</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Altura (m)</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Largo (m)</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Separación (cm)</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>P. Compra</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>P. Costo m²</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>P. Venta</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>P. Venta m²</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => (
                <tr key={producto.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px' }}>{producto.codigo_producto}</td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontWeight: '600' }}>{producto.nombre}</div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>{producto.subtipo}</div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {producto.altura_m ? producto.altura_m : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {producto.largo_m ? producto.largo_m : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {producto.separacion_cm ? producto.separacion_cm : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>${Number(producto.precio_compra).toLocaleString()}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {producto.m2_rollo ? `$${(producto.precio_compra / producto.m2_rollo).toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>${Number(producto.precio_venta).toLocaleString()}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {producto.m2_rollo ? `$${(producto.precio_venta / producto.m2_rollo).toFixed(2)}` : '-'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(producto)}
                        style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(producto.id)}
                        style={{ padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {productosFiltrados.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
            </div>
          )}
        </div>

        {showCotizacionModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
                Cotización del Dólar
              </h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Valor en Pesos Uruguayos
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevaCotizacion}
                  onChange={(e) => setNuevaCotizacion(e.target.value)}
                  placeholder="Ej: 40.50"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCotizacionModal(false)
                    setNuevaCotizacion('')
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#e5e7eb',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCotizacion}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
                  {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codigo_producto}
                      onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Subtipo
                    </label>
                    <input
                      type="text"
                      value={formData.subtipo}
                      onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                      Precios
                    </h3>
                    {!cotizacionDolar && (
                      <div style={{
                        padding: '12px',
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '14px'
                      }}>
                        Configure la cotización del dólar para cálculos automáticos
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Compra (USD) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.precio_compra}
                          onChange={(e) => handlePrecioChange('precio_compra', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Compra (UYU)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_compra_uyu}
                          onChange={(e) => handlePrecioChange('precio_compra_uyu', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: cotizacionDolar ? '#f9fafb' : 'white'
                          }}
                          disabled={!cotizacionDolar}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Venta (UYU) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.precio_venta}
                          onChange={(e) => handlePrecioChange('precio_venta', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Venta (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_venta_usd}
                          onChange={(e) => handlePrecioChange('precio_venta_usd', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: cotizacionDolar ? '#f9fafb' : 'white'
                          }}
                          disabled={!cotizacionDolar}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                      Dimensiones
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Altura (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.altura_m}
                          onChange={(e) => setFormData({ ...formData, altura_m: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Largo (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.largo_m}
                          onChange={(e) => setFormData({ ...formData, largo_m: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Separación (cm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.separacion_cm}
                          onChange={(e) => setFormData({ ...formData, separacion_cm: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          m² por Rollo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.m2_rollo}
                          onChange={(e) => setFormData({ ...formData, m2_rollo: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {editingId ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
