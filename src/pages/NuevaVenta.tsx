import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import MapaPicker, { MapaPickerRef } from '../components/MapaPicker'
import { Plus, Trash2, AlertCircle, MapPin, Search, CheckCircle, UserPlus, X } from 'lucide-react'
import { generarPDFVenta } from '../utils/pdfGenerator'
import '../styles/pages.css'

interface DetalleVenta {
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
}

export default function NuevaVenta() {
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
  const [showMap, setShowMap] = useState(false)
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null)
  const mapaRef = useRef<MapaPickerRef>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [showNuevoCliente, setShowNuevoCliente] = useState(false)
  const [nuevoCliente, setNuevoCliente] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
  })

  const [formData, setFormData] = useState({
    numero_venta: '',
    cliente_id: '',
    fecha_venta: new Date().toISOString().split('T')[0],
    departamento: 'Montevideo',
    localidad: '',
    direccion: '',
    envio: '',
    descuento: '',
    notas: '',
    envio_check: false,
    reparto: false,
  })

  const departamentosTodos = [
    'Artigas',
    'Canelones',
    'Cerro Largo',
    'Colonia',
    'Durazno',
    'Flores',
    'Florida',
    'Lavalleja',
    'Maldonado',
    'Montevideo',
    'Paysandú',
    'Río Negro',
    'Rivera',
    'Rocha',
    'Salto',
    'San José',
    'Soriano',
    'Tacuarembó',
    'Treinta y Tres',
  ]

  const departamentosReparto = [
    'Canelones',
    'Colonia',
    'Maldonado',
    'Montevideo',
    'San José',
  ]

  const localidadesPorDepartamento: Record<string, string[]> = {
    Artigas: ['Artigas', 'Bella Unión', 'Tomás Gomensoro', 'Baltasar Brum'],
    Canelones: ['Canelones', 'Ciudad de la Costa', 'Las Piedras', 'Pando', 'La Paz', 'Progreso', 'Santa Lucía', 'Atlántida', 'Parque del Plata'],
    'Cerro Largo': ['Melo', 'Río Branco', 'Fraile Muerto', 'Aceguá'],
    Colonia: ['Colonia del Sacramento', 'Carmelo', 'Nueva Helvecia', 'Juan Lacaze', 'Rosario', 'Tarariras'],
    Durazno: ['Durazno', 'Sarandí del Yí', 'Villa del Carmen'],
    Flores: ['Trinidad', 'Ismael Cortinas'],
    Florida: ['Florida', 'Sarandí Grande', 'Fray Marcos', '25 de Agosto'],
    Lavalleja: ['Minas', 'José Pedro Varela', 'Solís de Mataojo'],
    Maldonado: ['Maldonado', 'Punta del Este', 'San Carlos', 'Pan de Azúcar', 'Piriápolis'],
    Montevideo: ['Montevideo', 'Ciudad Vieja', 'Centro', 'Cordón', 'Parque Rodó', 'Pocitos', 'Buceo', 'Carrasco', 'Malvín', 'Punta Carretas'],
    Paysandú: ['Paysandú', 'Guichón', 'Quebracho', 'Piedras Coloradas'],
    'Río Negro': ['Fray Bentos', 'Young', 'San Javier', 'Nuevo Berlín'],
    Rivera: ['Rivera', 'Tranqueras', 'Vichadero', 'Minas de Corrales'],
    Rocha: ['Rocha', 'Chuy', 'Castillos', 'Lascano', 'La Paloma', 'La Pedrera'],
    Salto: ['Salto', 'Constitución', 'Belén'],
    'San José': ['San José de Mayo', 'Ciudad del Plata', 'Libertad', 'Ecilda Paullier', 'Rafael Perazza'],
    Soriano: ['Mercedes', 'Dolores', 'Cardona', 'Palmitas'],
    Tacuarembó: ['Tacuarembó', 'Paso de los Toros', 'San Gregorio de Polanco'],
    'Treinta y Tres': ['Treinta y Tres', 'Vergara', 'Santa Clara de Olimar'],
  }

  const departamentosDisponibles = formData.reparto ? departamentosReparto : departamentosTodos
  const localidadesDisponibles = localidadesPorDepartamento[formData.departamento] || []

  const [detalles, setDetalles] = useState<DetalleVenta[]>([])
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

  useEffect(() => {
    if (formData.reparto && !departamentosReparto.includes(formData.departamento)) {
      setFormData({ ...formData, departamento: 'Montevideo', localidad: '' })
    }
  }, [formData.reparto])

  useEffect(() => {
    const localidadesActuales = localidadesPorDepartamento[formData.departamento] || []
    if (formData.localidad && !localidadesActuales.includes(formData.localidad)) {
      setFormData({ ...formData, localidad: '' })
    }
  }, [formData.departamento])

  const loadData = async () => {
    try {
      const [clientesRes, productosRes, categoriasRes, promocionesRes, empresaRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('activo', true),
        supabase.from('productos').select('*').eq('activo', true),
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('promociones').select('*').eq('activo', true).order('nombre'),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
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
    const envio = parseFloat(formData.envio) || 0
    const descuento = parseFloat(formData.descuento) || 0
    return subtotal + envio - descuento
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (detalles.length === 0) {
      setError('Debe agregar al menos un producto a la venta')
      return
    }

    if (!empresaId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    if (formData.reparto && !coordenadas) {
      setError('Para ventas con reparto debe seleccionar una ubicación en el mapa')
      return
    }

    try {
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

      const subtotal = detalles.reduce((sum, det) => sum + det.subtotal_item, 0)
      const total = calcularTotal()

      const { envio_check, reparto, ...datosVenta } = formData

      const ventaData = {
        ...datosVenta,
        numero_venta: numeroVenta,
        empresa_id: empresaId,
        cliente_id: datosVenta.cliente_id || null,
        subtotal,
        total,
        envio: parseFloat(formData.envio) || 0,
        descuento: parseFloat(formData.descuento) || 0,
        latitud: coordenadas?.lat || null,
        longitud: coordenadas?.lng || null,
        reparto: reparto,
        estado: reparto ? 'pendiente' : 'completado',
      }

      const { data: ventaCreada, error: ventaError } = await supabase
        .from('ventas')
        .insert([ventaData])
        .select()
        .single()

      if (ventaError) throw ventaError

      const detallesConVentaId = detalles.map((det) => ({
        ...det,
        venta_id: ventaCreada.id,
        descuento_item: 0,
      }))

      const { error: detalleError } = await supabase
        .from('detalle_ventas')
        .insert(detallesConVentaId)

      if (detalleError) throw detalleError

      const categoriasIds = [...new Set(detalles.map(det => {
        const producto = productos.find(p => p.id === det.producto_id)
        return producto?.categoria_id
      }).filter(Boolean))]

      const { data: tutoriales, error: tutorialesError } = await supabase
        .from('tutoriales')
        .select('titulo, video_url, categorias(nombre)')
        .eq('empresa_id', empresaId)
        .eq('activo', true)
        .in('categoria_id', categoriasIds)

      if (tutorialesError) {
        console.error('Error al obtener tutoriales:', tutorialesError)
      }

      const cliente = clientes.find(c => c.id === formData.cliente_id)

      const detallesConNombres = detalles.map(det => ({
        producto_nombre: getProductoNombre(det.producto_id),
        cantidad: det.cantidad,
        precio_unitario: det.precio_unitario,
        subtotal_item: det.subtotal_item
      }))

      const tutorialesFormateados = (tutoriales || []).map(t => ({
        categoria_nombre: (t.categorias as any)?.nombre || 'Sin categoría',
        titulo: t.titulo,
        video_url: t.video_url
      }))

      generarPDFVenta({
        numero_venta: numeroVenta,
        fecha_venta: formData.fecha_venta,
        cliente_nombre: cliente?.nombre,
        subtotal,
        envio: parseFloat(formData.envio) || 0,
        descuento: parseFloat(formData.descuento) || 0,
        total,
        detalles: detallesConNombres,
        tutoriales: tutorialesFormateados
      })

      setSuccess(`Venta registrada exitosamente: ${numeroVenta}. PDF generado.`)
      resetForm()

      setTimeout(() => {
        navigate('/dashboard')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      numero_venta: '',
      cliente_id: '',
      fecha_venta: new Date().toISOString().split('T')[0],
      departamento: 'Montevideo',
      localidad: '',
      direccion: '',
      envio: '',
      descuento: '',
      notas: '',
      envio_check: false,
      reparto: false,
    })
    setDetalles([])
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
    setCoordenadas(null)
    setShowMap(false)
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
            background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
            padding: '2rem',
            color: 'white',
          }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Nueva Venta</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Complete los datos para registrar una nueva venta</p>
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
                          backgroundColor: '#16a34a',
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

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div className="form-group">
                  <label>Número Venta</label>
                  <input
                    type="text"
                    value=""
                    placeholder="Se generará automáticamente"
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label>Cliente</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select
                      value={formData.cliente_id}
                      onChange={(e) => {
                        const clienteId = e.target.value
                        const clienteSeleccionado = clientes.find(c => c.id === clienteId)

                        setFormData({
                          ...formData,
                          cliente_id: clienteId,
                          direccion: clienteSeleccionado?.direccion || formData.direccion
                        })
                      }}
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
                      onClick={() => {
                        setNuevoCliente({
                          nombre: '',
                          telefono: '',
                          direccion: formData.direccion || '',
                        })
                        setShowNuevoCliente(true)
                      }}
                      style={{
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: '#2563eb',
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
                  <label>Fecha Venta *</label>
                  <input
                    type="date"
                    value={formData.fecha_venta}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha_venta: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '2rem', paddingTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.envio_check}
                      onChange={(e) =>
                        setFormData({ ...formData, envio_check: e.target.checked, reparto: false })
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Envío</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.reparto}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reparto: e.target.checked,
                          envio_check: false,
                          envio: e.target.checked ? formData.envio : ''
                        })
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Reparto</span>
                  </label>
                </div>

                {(formData.envio_check || formData.reparto) && (
                  <>
                    <div className="form-group">
                      <label>Departamento</label>
                      <select
                        value={formData.departamento}
                        onChange={(e) =>
                          setFormData({ ...formData, departamento: e.target.value })
                        }
                      >
                        {departamentosDisponibles.map((dep) => (
                          <option key={dep} value={dep}>
                            {dep}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Localidad</label>
                      <select
                        value={formData.localidad}
                        onChange={(e) =>
                          setFormData({ ...formData, localidad: e.target.value })
                        }
                      >
                        <option value="">Seleccione una localidad</option>
                        {localidadesDisponibles.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        Dirección
                        {formData.reparto && (
                          <button
                            type="button"
                            onClick={() => setShowMap(!showMap)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: showMap ? '#dc2626' : '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <MapPin size={14} />
                            {showMap ? 'Ocultar Mapa' : 'Abrir Mapa'}
                          </button>
                        )}
                      </label>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          value={formData.direccion}
                          onChange={(e) =>
                            setFormData({ ...formData, direccion: e.target.value })
                          }
                          placeholder="Ingrese la dirección"
                          style={{ flex: 1 }}
                        />
                        {formData.reparto && (
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.direccion.trim()) {
                                const direccionCompleta = `${formData.direccion}, ${formData.localidad}, ${formData.departamento}`
                                mapaRef.current?.buscarDireccion(direccionCompleta)
                                if (!showMap) setShowMap(true)
                              }
                            }}
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                            title="Buscar dirección en el mapa"
                          >
                            <Search size={16} />
                          </button>
                        )}
                      </div>
                      {formData.reparto && showMap && (
                        <MapaPicker
                          ref={mapaRef}
                          onLocationSelect={(lat, lng, address) => {
                            setCoordenadas({ lat, lng })
                            setFormData({ ...formData, direccion: address })
                          }}
                          initialPosition={coordenadas ? [coordenadas.lat, coordenadas.lng] : undefined}
                        />
                      )}
                    </div>
                  </>
                )}

                {formData.reparto && (
                  <div className="form-group">
                    <label>Envío (UYU)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.envio}
                      onChange={(e) =>
                        setFormData({ ...formData, envio: e.target.value })
                      }
                    />
                  </div>
                )}

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
                          backgroundColor: '#16a34a',
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
                            backgroundColor: '#16a34a',
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
                          <td colSpan={2} style={{ padding: '1rem', textAlign: 'right', color: '#16a34a' }}>
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
                  onClick={() => navigate('/dashboard')}
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
                    backgroundColor: '#16a34a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                  }}
                >
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
