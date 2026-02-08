import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Trash2, AlertCircle, CheckCircle, UserPlus, X, FileText } from 'lucide-react'
import '../styles/pages.css'

interface DetallePresupuesto {
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
}

export default function NuevoPresupuesto() {
  const navigate = useNavigate()
  const [clientes, setClientes] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [promociones, setPromociones] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [subtipos, setSubtipos] = useState<string[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
  })

  const [formData, setFormData] = useState({
    cliente_id: '',
    fecha_presupuesto: new Date().toISOString().split('T')[0],
    descuento: '',
    notas: '',
  })

  const [detalles, setDetalles] = useState<DetallePresupuesto[]>([])
  const [nuevoDetalle, setNuevoDetalle] = useState({
    tipo: 'producto',
    promocion_id: '',
    categoria_id: '',
    subtipo: '',
    producto_id: '',
    cantidad: '',
    precio_unitario: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientesRes, productosRes, categoriasRes, promocionesRes, empresaRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('activo', true),
        supabase.from('productos').select('*').eq('activo', true),
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('promociones').select('*').eq('activo', true).order('nombre'),
        supabase.from('empresas').select('id, nombre, direccion, telefono').limit(1).maybeSingle(),
      ])

      if (clientesRes.error) throw clientesRes.error
      if (productosRes.error) throw productosRes.error
      if (categoriasRes.error) throw categoriasRes.error
      if (promocionesRes.error) throw promocionesRes.error
      if (empresaRes.error) throw empresaRes.error

      setClientes(clientesRes.data || [])
      setProductos(productosRes.data || [])
      setCategorias(categoriasRes.data || [])
      setPromociones(promocionesRes.data || [])
      setEmpresaId(empresaRes.data?.id || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCategoriaChange = (categoriaId: string) => {
    setNuevoDetalle({
      tipo: nuevoDetalle.tipo,
      promocion_id: '',
      categoria_id: categoriaId,
      subtipo: '',
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
    })

    if (categoriaId) {
      const subtiposUnicos = [...new Set(
        productos
          .filter((p) => p.categoria_id === categoriaId && p.subtipo)
          .map((p) => p.subtipo)
      )].sort()
      setSubtipos(subtiposUnicos)
    } else {
      setSubtipos([])
    }
    setProductosFiltrados([])
  }

  const handleSubtipoChange = (subtipo: string) => {
    setNuevoDetalle({
      ...nuevoDetalle,
      subtipo,
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
    })

    if (subtipo) {
      const productosFiltrados = productos.filter(
        (p) => p.categoria_id === nuevoDetalle.categoria_id && p.subtipo === subtipo
      )
      setProductosFiltrados(productosFiltrados)
    } else {
      setProductosFiltrados([])
    }
  }

  const guardarNuevoCliente = async () => {
    if (!nuevoCliente.nombre.trim()) {
      setError('El nombre del cliente es requerido')
      return
    }

    if (!empresaId) {
      setError('No se pudo obtener la empresa')
      return
    }

    try {
      const { data, error: insertError } = await supabase
        .from('clientes')
        .insert({
          empresa_id: empresaId,
          nombre: nuevoCliente.nombre,
          telefono: nuevoCliente.telefono || null,
          direccion: nuevoCliente.direccion || null,
          activo: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setClientes([...clientes, data])
      setFormData({ ...formData, cliente_id: data.id })
      setNuevoCliente({ nombre: '', telefono: '', direccion: '' })
      setShowNuevoCliente(false)
      setSuccess('Cliente agregado exitosamente')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const agregarDetalle = async () => {
    if (nuevoDetalle.tipo === 'promocion') {
      if (!nuevoDetalle.promocion_id) {
        setError('Seleccione una promoción')
        return
      }

      try {
        const { data: detallesPromo, error } = await supabase
          .from('detalle_promociones')
          .select('producto_id, cantidad')
          .eq('promocion_id', nuevoDetalle.promocion_id)

        if (error) throw error

        if (!detallesPromo || detallesPromo.length === 0) {
          setError('La promoción no tiene productos asociados')
          return
        }

        const nuevosDetalles = detallesPromo.map((detalle) => {
          const producto = productos.find((p) => p.id === detalle.producto_id)
          if (!producto || !producto.precio_venta) {
            throw new Error(`Producto sin precio de venta`)
          }
          return {
            producto_id: detalle.producto_id,
            cantidad: detalle.cantidad,
            precio_unitario: producto.precio_venta,
            subtotal_item: detalle.cantidad * producto.precio_venta,
          }
        })

        setDetalles([...detalles, ...nuevosDetalles])
        setError('')
      } catch (err: any) {
        setError(err.message)
        return
      }
    } else {
      if (!nuevoDetalle.producto_id || !nuevoDetalle.cantidad) {
        setError('Complete todos los campos del detalle')
        return
      }

      const producto = productos.find((p) => p.id === nuevoDetalle.producto_id)
      if (!producto || !producto.precio_venta) {
        setError('El producto seleccionado no tiene precio de venta')
        return
      }

      const cantidad = parseFloat(nuevoDetalle.cantidad)
      const precio = producto.precio_venta
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
    }

    setNuevoDetalle({
      tipo: 'producto',
      promocion_id: '',
      categoria_id: '',
      subtipo: '',
      producto_id: '',
      cantidad: '',
      precio_unitario: '',
    })
    setSubtipos([])
    setProductosFiltrados([])
    setError('')
  }

  const eliminarDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index))
  }

  const calcularTotal = () => {
    const subtotal = detalles.reduce((sum, det) => sum + det.subtotal_item, 0)
    const descuento = parseFloat(formData.descuento) || 0
    return subtotal - descuento
  }

  const generarPDF = async () => {
    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto al presupuesto')
      return
    }

    if (!empresaId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data: ultimoPresupuesto, error: errorNumero } = await supabase
        .from('presupuestos')
        .select('numero_presupuesto')
        .like('numero_presupuesto', `P-${hoy}%`)
        .order('numero_presupuesto', { ascending: false })
        .limit(1)

      if (errorNumero) throw errorNumero

      let contador = 1
      if (ultimoPresupuesto && ultimoPresupuesto.length > 0) {
        const partes = ultimoPresupuesto[0].numero_presupuesto.split('-')
        if (partes.length === 5) {
          contador = parseInt(partes[4]) + 1
        }
      }

      const numeroPresupuesto = `P-${hoy}-${contador.toString().padStart(3, '0')}`

      const subtotal = detalles.reduce((sum, det) => sum + det.subtotal_item, 0)
      const total = calcularTotal()

      const presupuestoData = {
        numero_presupuesto: numeroPresupuesto,
        empresa_id: empresaId,
        cliente_id: formData.cliente_id || null,
        fecha_presupuesto: formData.fecha_presupuesto,
        subtotal,
        total,
        descuento: parseFloat(formData.descuento) || 0,
        notas: formData.notas || null,
        estado: 'pendiente',
      }

      const { data: presupuestoCreado, error: presupuestoError } = await supabase
        .from('presupuestos')
        .insert([presupuestoData])
        .select()
        .single()

      if (presupuestoError) throw presupuestoError

      const detallesConPresupuestoId = detalles.map((det) => ({
        ...det,
        presupuesto_id: presupuestoCreado.id,
        descuento_item: 0,
      }))

      const { error: detalleError } = await supabase
        .from('detalle_presupuestos')
        .insert(detallesConPresupuestoId)

      if (detalleError) throw detalleError

      setSuccess(`Presupuesto guardado exitosamente: ${numeroPresupuesto}`)

      setTimeout(() => {
        navigate('/presupuestos')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    }
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
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            padding: '2rem',
            color: 'white',
          }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Nuevo Presupuesto</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Complete los datos para generar un presupuesto</p>
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

            {showNuevoCliente && (
              <div style={{
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
              }}>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  padding: '2rem',
                  maxWidth: '500px',
                  width: '90%',
                  maxHeight: '90vh',
                  overflow: 'auto',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                  }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                      Agregar Nuevo Cliente
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowNuevoCliente(false)}
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

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                      <label>Nombre *</label>
                      <input
                        type="text"
                        value={nuevoCliente.nombre}
                        onChange={(e) =>
                          setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })
                        }
                        placeholder="Nombre del cliente"
                      />
                    </div>

                    <div className="form-group">
                      <label>Teléfono</label>
                      <input
                        type="text"
                        value={nuevoCliente.telefono}
                        onChange={(e) =>
                          setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })
                        }
                        placeholder="Teléfono del cliente"
                      />
                    </div>

                    <div className="form-group">
                      <label>Dirección</label>
                      <input
                        type="text"
                        value={nuevoCliente.direccion}
                        onChange={(e) =>
                          setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })
                        }
                        placeholder="Dirección del cliente"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={guardarNuevoCliente}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        Guardar Cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNuevoCliente(false)}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); generarPDF(); }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div className="form-group">
                  <label>Cliente</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) =>
                        setFormData({ ...formData, cliente_id: e.target.value })
                      }
                      style={{ flex: 1 }}
                    >
                      <option value="">Sin cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNuevoCliente(true)}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                      title="Agregar nuevo cliente"
                    >
                      <UserPlus size={16} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Fecha Presupuesto *</label>
                  <input
                    type="date"
                    value={formData.fecha_presupuesto}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_presupuesto: e.target.value })
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
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  rows={3}
                  placeholder="Notas adicionales para el presupuesto..."
                />
              </div>

              <div style={{
                background: '#f8fafc',
                padding: '2rem',
                borderRadius: '12px',
                marginBottom: '2rem',
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>Productos</h3>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
                    Tipo de ítem
                  </label>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="producto"
                        checked={nuevoDetalle.tipo === 'producto'}
                        onChange={(e) =>
                          setNuevoDetalle({
                            tipo: e.target.value,
                            promocion_id: '',
                            categoria_id: '',
                            subtipo: '',
                            producto_id: '',
                            cantidad: '',
                            precio_unitario: '',
                          })
                        }
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Producto Individual</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        value="promocion"
                        checked={nuevoDetalle.tipo === 'promocion'}
                        onChange={(e) =>
                          setNuevoDetalle({
                            tipo: e.target.value,
                            promocion_id: '',
                            categoria_id: '',
                            subtipo: '',
                            producto_id: '',
                            cantidad: '',
                            precio_unitario: '',
                          })
                        }
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Promoción/Combo</span>
                    </label>
                  </div>
                </div>

                {nuevoDetalle.tipo === 'promocion' ? (
                  <div style={{ marginBottom: '1rem' }}>
                    <div className="form-group">
                      <label>Seleccionar Promoción</label>
                      <select
                        value={nuevoDetalle.promocion_id}
                        onChange={(e) =>
                          setNuevoDetalle({ ...nuevoDetalle, promocion_id: e.target.value })
                        }
                      >
                        <option value="">Seleccionar promoción...</option>
                        {promociones.map((promo) => (
                          <option key={promo.id} value={promo.id}>
                            {promo.nombre} - ${promo.precio_total.toFixed(2)}
                          </option>
                        ))}
                      </select>
                      {nuevoDetalle.promocion_id && (
                        <small style={{ color: '#6b7280', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                          Esta promoción agregará todos sus productos automáticamente
                        </small>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={agregarDetalle}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          backgroundColor: '#3b82f6',
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
                        Agregar Promoción
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem',
                    }}>
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
                        <label>Subtipo</label>
                        <select
                          value={nuevoDetalle.subtipo}
                          onChange={(e) => handleSubtipoChange(e.target.value)}
                          disabled={!nuevoDetalle.categoria_id}
                        >
                          <option value="">Seleccionar subtipo...</option>
                          {subtipos.map((subtipo) => (
                            <option key={subtipo} value={subtipo}>
                              {subtipo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Producto</label>
                        <select
                          value={nuevoDetalle.producto_id}
                          onChange={(e) =>
                            setNuevoDetalle({
                              ...nuevoDetalle,
                              producto_id: e.target.value,
                            })
                          }
                          disabled={!nuevoDetalle.subtipo}
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
                                {(medidas || 'Sin medidas') + precio}
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
                          onChange={(e) =>
                            setNuevoDetalle({ ...nuevoDetalle, cantidad: e.target.value })
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
                            backgroundColor: '#3b82f6',
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
                  </>
                )}

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
                          <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', color: '#3b82f6' }}>
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
                  onClick={() => navigate('/presupuestos')}
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
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <FileText size={20} />
                  Generar PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
