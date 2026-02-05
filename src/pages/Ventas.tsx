import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import MapaPicker, { MapaPickerRef } from '../components/MapaPicker'
import { Plus, Trash2, AlertCircle, X, MapPin, Search, ChevronDown, ChevronRight, MessageCircle } from 'lucide-react'
import '../styles/pages.css'

interface Venta {
  id: string
  numero_venta: string
  cliente_id: string
  fecha_venta: string
  total: number
  departamento: string
  localidad: string
  direccion: string
  cliente?: { nombre: string }
}

interface DetalleVenta {
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
}

export default function Ventas() {
  const location = useLocation()
  const [ventas, setVentas] = useState<Venta[]>([])
  const [clientes, setClientes] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [promociones, setPromociones] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [subtipos, setSubtipos] = useState<string[]>([])
  const [productosFiltrados, setProductosFiltrados] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null)
  const mapaRef = useRef<MapaPickerRef>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [ventaExpandida, setVentaExpandida] = useState<string | null>(null)
  const [detallesVentas, setDetallesVentas] = useState<Record<string, any[]>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroProducto, setFiltroProducto] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroDepartamento, setFiltroDepartamento] = useState('')
  const [filtroLocalidad, setFiltroLocalidad] = useState('')
  const [filtroTipoEntrega, setFiltroTipoEntrega] = useState('')

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
    if (location.state?.openForm) {
      setShowForm(true)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    if (filtroProducto) {
      ventas.forEach((venta) => {
        if (!detallesVentas[venta.id]) {
          cargarDetallesVenta(venta.id)
        }
      })
    }
  }, [filtroProducto, ventas])


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
      const [ventasRes, clientesRes, productosRes, categoriasRes, promocionesRes, empresaRes] = await Promise.all([
        supabase
          .from('ventas')
          .select('*, cliente:clientes(nombre)')
          .order('fecha_venta', { ascending: false }),
        supabase.from('clientes').select('*').eq('activo', true),
        supabase.from('productos').select('*').eq('activo', true),
        supabase.from('categorias').select('*').order('nombre'),
        supabase.from('promociones').select('*').eq('activo', true).order('nombre'),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
      ])

      if (ventasRes.error) throw ventasRes.error
      if (clientesRes.error) throw clientesRes.error
      if (productosRes.error) throw productosRes.error
      if (categoriasRes.error) throw categoriasRes.error
      if (promocionesRes.error) throw promocionesRes.error
      if (empresaRes.error) throw empresaRes.error

      setVentas(ventasRes.data || [])
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

  const cargarDetallesVenta = async (ventaId: string) => {
    if (detallesVentas[ventaId]) return

    try {
      const { data, error } = await supabase
        .from('detalle_ventas')
        .select('*, producto:productos(codigo_producto, nombre, altura_m, largo_m, separacion_cm)')
        .eq('venta_id', ventaId)

      if (error) throw error

      setDetallesVentas((prev) => ({
        ...prev,
        [ventaId]: data || [],
      }))
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleVentaExpandida = async (ventaId: string) => {
    if (ventaExpandida === ventaId) {
      setVentaExpandida(null)
    } else {
      setVentaExpandida(ventaId)
      await cargarDetallesVenta(ventaId)
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

      resetForm()
      loadData()
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

  const compartirVentaPorWhatsApp = async (venta: Venta) => {
    try {
      const { data: ventaCompleta, error: ventaError } = await supabase
        .from('ventas')
        .select('*, cliente:clientes(nombre, telefono)')
        .eq('id', venta.id)
        .single()

      if (ventaError) throw ventaError

      const { data: detalles, error } = await supabase
        .from('detalle_ventas')
        .select('cantidad, precio_unitario, subtotal_item, producto:productos(codigo_producto, nombre, altura_m, largo_m, separacion_cm)')
        .eq('venta_id', venta.id)

      if (error) throw error

      let mensaje = `*COMPROBANTE DE VENTA*\n`
      mensaje += `*${venta.numero_venta}*\n\n`
      mensaje += `📅 Fecha: ${new Date(venta.fecha_venta).toLocaleDateString('es-UY')}\n`

      if (ventaCompleta.cliente) {
        mensaje += `👤 Cliente: ${ventaCompleta.cliente.nombre}\n`
      }

      if (venta.direccion || venta.localidad || venta.departamento) {
        mensaje += `📍 Entrega: `
        if (venta.direccion) mensaje += venta.direccion
        if (venta.localidad) mensaje += `, ${venta.localidad}`
        if (venta.departamento) mensaje += `, ${venta.departamento}`
        mensaje += `\n`
      }

      mensaje += `\n*DETALLE DE PRODUCTOS:*\n`
      mensaje += `━━━━━━━━━━━━━━━━\n`

      detalles?.forEach((det: any) => {
        let nombreProducto = det.producto ? `${det.producto.codigo_producto} - ${det.producto.nombre}` : 'Producto'

        if (det.producto && (det.producto.altura_m || det.producto.largo_m || det.producto.separacion_cm)) {
          nombreProducto += ' ('
          if (det.producto.altura_m) nombreProducto += `${det.producto.altura_m}m`
          if (det.producto.largo_m) nombreProducto += ` x ${det.producto.largo_m}m`
          if (det.producto.separacion_cm) nombreProducto += ` - ${det.producto.separacion_cm}cm`
          nombreProducto += ')'
        }

        mensaje += `\n${nombreProducto}\n`
        mensaje += `   Cantidad: ${det.cantidad}\n`
        mensaje += `   Precio: $${det.precio_unitario.toFixed(2)}\n`
        mensaje += `   Subtotal: $${det.subtotal_item.toFixed(2)}\n`
      })

      mensaje += `\n━━━━━━━━━━━━━━━━\n`
      mensaje += `💰 Subtotal: $${ventaCompleta.subtotal?.toFixed(2) || '0.00'}\n`

      if (ventaCompleta.envio && ventaCompleta.envio > 0) {
        mensaje += `🚚 Envío: $${ventaCompleta.envio.toFixed(2)}\n`
      }

      if (ventaCompleta.descuento && ventaCompleta.descuento > 0) {
        mensaje += `🎯 Descuento: -$${ventaCompleta.descuento.toFixed(2)}\n`
      }

      mensaje += `\n*TOTAL: $${venta.total.toFixed(2)}*\n`

      if (ventaCompleta.notas) {
        mensaje += `\n📝 Notas: ${ventaCompleta.notas}\n`
      }

      mensaje += `\n¡Gracias por su compra!`

      const mensajeCodificado = encodeURIComponent(mensaje)
      let urlWhatsApp = ''

      if (ventaCompleta.cliente?.telefono) {
        const telefonoLimpio = ventaCompleta.cliente.telefono.replace(/\D/g, '')
        urlWhatsApp = `https://wa.me/${telefonoLimpio}?text=${mensajeCodificado}`
      } else {
        urlWhatsApp = `https://wa.me/?text=${mensajeCodificado}`
      }

      window.open(urlWhatsApp, '_blank')
    } catch (err: any) {
      console.error('Error al compartir por WhatsApp:', err.message)
      setError('Error al preparar el mensaje de WhatsApp')
    }
  }

  const localidadesDisponiblesFiltro = filtroDepartamento
    ? localidadesPorDepartamento[filtroDepartamento] || []
    : []

  const ventasFiltradas = ventas.filter((venta) => {
    const searchLower = searchTerm.toLowerCase()
    const matchSearch = !searchTerm || (
      venta.numero_venta.toLowerCase().includes(searchLower) ||
      venta.cliente?.nombre?.toLowerCase().includes(searchLower) ||
      venta.direccion?.toLowerCase().includes(searchLower) ||
      venta.departamento?.toLowerCase().includes(searchLower) ||
      venta.localidad?.toLowerCase().includes(searchLower)
    )

    const matchEstado = !filtroEstado || (venta as any).estado === filtroEstado
    const matchCliente = !filtroCliente || venta.cliente_id === filtroCliente
    const matchDepartamento = !filtroDepartamento || venta.departamento === filtroDepartamento
    const matchLocalidad = !filtroLocalidad || venta.localidad === filtroLocalidad

    let matchTipoEntrega = true
    if (filtroTipoEntrega === 'reparto') {
      matchTipoEntrega = (venta as any).reparto === true
    } else if (filtroTipoEntrega === 'envio') {
      matchTipoEntrega = (venta as any).reparto !== true && venta.direccion !== null && venta.direccion !== ''
    } else if (filtroTipoEntrega === 'sin_envio') {
      matchTipoEntrega = (venta as any).reparto !== true && (venta.direccion === null || venta.direccion === '')
    }

    let matchProducto = true
    if (filtroProducto) {
      const detalles = detallesVentas[venta.id] || []
      matchProducto = detalles.some((d) => d.producto_id === filtroProducto)
    }

    return matchSearch && matchEstado && matchCliente && matchProducto && matchDepartamento && matchLocalidad && matchTipoEntrega
  })

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Gestión de Ventas</h1>
            <p>Registra ventas y actualiza stock automáticamente</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            <Plus size={20} />
            Nueva Venta
          </button>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} style={{ marginLeft: 'auto' }}>
              <X size={20} />
            </button>
          </div>
        )}

        {showForm && (
          <div className="form-card">
            <h2>Registrar Nueva Venta</h2>

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Número Venta *</label>
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
                  <select
                    value={formData.cliente_id}
                    onChange={(e) =>
                      setFormData({ ...formData, cliente_id: e.target.value })
                    }
                  >
                    <option value="">Sin cliente</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
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
                          placeholder={formData.reparto ? "Ingrese la dirección" : "Ingrese la dirección"}
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

              <div className="form-group">
                <label>Notas</label>
                <textarea
                  value={formData.notas}
                  onChange={(e) =>
                    setFormData({ ...formData, notas: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ marginBottom: '1rem' }}>Productos</h3>

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
                  </div>
                ) : (
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
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '1rem' }}>
                  <button
                    type="button"
                    onClick={agregarDetalle}
                    className="btn-secondary"
                  >
                    {nuevoDetalle.tipo === 'promocion' ? 'Agregar Promoción' : 'Agregar Producto'}
                  </button>
                </div>

                {detalles.length > 0 && (
                  <div className="table-container" style={{ marginTop: '1rem' }}>
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
                        {detalles.map((det, index) => (
                          <tr key={index}>
                            <td>{getProductoNombre(det.producto_id)}</td>
                            <td>{det.cantidad}</td>
                            <td>${det.precio_unitario.toFixed(2)}</td>
                            <td>${det.subtotal_item.toFixed(2)}</td>
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
                        ))}
                        <tr style={{ fontWeight: 'bold' }}>
                          <td colSpan={3} style={{ textAlign: 'right' }}>
                            TOTAL:
                          </td>
                          <td colSpan={2}>${calcularTotal().toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="form-actions" style={{ marginTop: '2rem' }}>
                <button type="submit" className="btn-primary">
                  Registrar Venta
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '20px'
        }}>
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '600' }}>Buscar y Filtrar</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <div style={{ position: 'relative' }}>
              <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                placeholder="Buscar por número, cliente, dirección..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 10px 10px 40px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="completado">Completado</option>
            </select>

            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Todos los clientes</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>

            <select
              value={filtroProducto}
              onChange={(e) => setFiltroProducto(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Todos los productos</option>
              {productos.map((producto) => {
                let texto = producto.nombre
                let medidas = ''
                if (producto.altura_m) medidas += `${producto.altura_m}m`
                if (producto.largo_m) medidas += ` x ${producto.largo_m}m`
                if (producto.separacion_cm) medidas += ` - ${producto.separacion_cm}cm`
                if (medidas) texto += ` (${medidas})`
                if (producto.precio_venta) texto += ` - $${Number(producto.precio_venta).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                return (
                  <option key={producto.id} value={producto.id}>
                    {texto}
                  </option>
                )
              })}
            </select>

            <select
              value={filtroDepartamento}
              onChange={(e) => {
                setFiltroDepartamento(e.target.value)
                setFiltroLocalidad('')
              }}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Todos los departamentos</option>
              {departamentosTodos.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>

            <select
              value={filtroLocalidad}
              onChange={(e) => setFiltroLocalidad(e.target.value)}
              disabled={!filtroDepartamento}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white',
                opacity: !filtroDepartamento ? 0.5 : 1,
                cursor: !filtroDepartamento ? 'not-allowed' : 'pointer'
              }}
            >
              <option value="">Todas las localidades</option>
              {localidadesDisponiblesFiltro.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <select
              value={filtroTipoEntrega}
              onChange={(e) => setFiltroTipoEntrega(e.target.value)}
              style={{
                padding: '10px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            >
              <option value="">Todos los tipos</option>
              <option value="reparto">Reparto</option>
              <option value="envio">Envío</option>
              <option value="sin_envio">Sin Envío</option>
            </select>
          </div>

          {(searchTerm || filtroEstado || filtroCliente || filtroProducto || filtroDepartamento || filtroLocalidad || filtroTipoEntrega) && (
            <button
              onClick={() => {
                setSearchTerm('')
                setFiltroEstado('')
                setFiltroCliente('')
                setFiltroProducto('')
                setFiltroDepartamento('')
                setFiltroLocalidad('')
                setFiltroTipoEntrega('')
              }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Cargando ventas...</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Dirección</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Acciones</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ventasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      {searchTerm || filtroEstado || filtroCliente || filtroProducto || filtroDepartamento || filtroLocalidad || filtroTipoEntrega
                        ? 'No se encontraron ventas con los filtros aplicados'
                        : 'No hay ventas registradas'}
                    </td>
                  </tr>
                ) : (
                  ventasFiltradas.map((venta) => (
                    <React.Fragment key={venta.id}>
                      <tr
                        style={{
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5f9'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = ''
                        }}
                      >
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {venta.numero_venta}
                        </td>
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {venta.cliente?.nombre || 'Sin cliente'}
                        </td>
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {venta.localidad || venta.departamento ? (
                            <>
                              {venta.localidad && `${venta.localidad}, `}
                              {venta.departamento}
                              {venta.direccion && (
                                <>
                                  <br />
                                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                    {venta.direccion}
                                  </span>
                                </>
                              )}
                            </>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          {new Date(venta.fecha_venta).toLocaleDateString()}
                        </td>
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          ${venta.total?.toFixed(2) || '0.00'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              compartirVentaPorWhatsApp(venta)
                            }}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#dcfce7',
                              color: '#16a34a',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            title="Compartir por WhatsApp"
                          >
                            <MessageCircle size={16} />
                          </button>
                        </td>
                        <td
                          onClick={() => toggleVentaExpandida(venta.id)}
                          style={{ textAlign: 'center', cursor: 'pointer' }}
                        >
                          {ventaExpandida === venta.id ? (
                            <ChevronDown size={20} color="#64748b" />
                          ) : (
                            <ChevronRight size={20} color="#64748b" />
                          )}
                        </td>
                      </tr>
                      {ventaExpandida === venta.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: 0, backgroundColor: '#f8fafc' }}>
                            <div style={{ padding: '1rem 2rem' }}>
                              <h4 style={{ marginBottom: '0.5rem', color: '#1e293b' }}>
                                Detalle de Productos
                              </h4>
                              {!detallesVentas[venta.id] ? (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                                  Cargando detalles...
                                </div>
                              ) : detallesVentas[venta.id].length === 0 ? (
                                <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b', backgroundColor: 'white', borderRadius: '4px' }}>
                                  Esta venta no tiene productos asociados
                                </div>
                              ) : (
                                <table
                                  style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    backgroundColor: 'white',
                                  }}
                                >
                                  <thead>
                                    <tr style={{ backgroundColor: '#e2e8f0' }}>
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
                                    {detallesVentas[venta.id].map((detalle: any, idx: number) => {
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

                                      return (
                                        <tr key={idx}>
                                          <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>
                                            {nombreCompleto}
                                          </td>
                                          <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                                            {detalle.cantidad}
                                          </td>
                                          <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                            ${detalle.precio_unitario?.toFixed(2)}
                                          </td>
                                          <td style={{ padding: '0.5rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                                            ${detalle.subtotal_item?.toFixed(2)}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  )
}
