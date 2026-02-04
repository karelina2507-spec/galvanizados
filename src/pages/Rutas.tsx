import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { Package, Navigation } from 'lucide-react'
import '../styles/pages.css'

const EMPRESA_COORDS = { lat: -34.8705, lng: -56.2208 }
const RENDIMIENTO_KM_POR_LITRO = 13

interface VentaReparto {
  id: string
  numero_venta: string
  cliente_id: string
  fecha_venta: string
  estado: string
  direccion: string
  localidad: string
  departamento: string
  latitud: number
  longitud: number
  total: number
  cliente?: { nombre: string }
}

interface DetalleVenta {
  id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal_item: number
  producto?: {
    codigo_producto: string
    nombre: string
    altura_m?: number
    largo_m?: number
    separacion_cm?: number
  }
}

const estadosDisponibles = [
  { value: 'pendiente', label: 'Pendiente', color: '#94a3b8' },
  { value: 'pagado', label: 'Pagado', color: '#3b82f6' },
  { value: 'en_reparto', label: 'En Reparto', color: '#f59e0b' },
  { value: 'enviado', label: 'Enviado', color: '#8b5cf6' },
  { value: 'entregado', label: 'Entregado', color: '#10b981' },
  { value: 'completado', label: 'Completado', color: '#059669' },
]

const calcularDistancia = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

const optimizarRuta = (ventas: VentaReparto[]): VentaReparto[] => {
  if (ventas.length <= 1) return ventas

  const rutaOptimizada: VentaReparto[] = []
  const ventasPendientes = [...ventas]
  let ubicacionActual = EMPRESA_COORDS

  while (ventasPendientes.length > 0) {
    let indexMasCercano = 0
    let distanciaMinima = Infinity

    ventasPendientes.forEach((venta, index) => {
      const distancia = calcularDistancia(
        ubicacionActual.lat,
        ubicacionActual.lng,
        venta.latitud,
        venta.longitud
      )
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia
        indexMasCercano = index
      }
    })

    const ventaMasCercana = ventasPendientes.splice(indexMasCercano, 1)[0]
    rutaOptimizada.push(ventaMasCercana)
    ubicacionActual = { lat: ventaMasCercana.latitud, lng: ventaMasCercana.longitud }
  }

  return rutaOptimizada
}

const getMarkerIcon = (estado: string) => {
  const estadoInfo = estadosDisponibles.find((e) => e.value === estado)
  const color = estadoInfo?.color || '#94a3b8'

  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="36" height="36">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    `)}`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  })
}

const getEmpresaIcon = () => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" width="40" height="40">
        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
      </svg>
    `)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  })
}

export default function Rutas() {
  const [ventasReparto, setVentasReparto] = useState<VentaReparto[]>([])
  const [rutaOptimizada, setRutaOptimizada] = useState<VentaReparto[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0])
  const [estadoFiltro, setEstadoFiltro] = useState('todos')
  const [detallesVentas, setDetallesVentas] = useState<Record<string, DetalleVenta[]>>({})

  useEffect(() => {
    fetchVentasReparto()
  }, [fechaFiltro, estadoFiltro])

  useEffect(() => {
    if (ventasReparto.length > 0) {
      const ruta = optimizarRuta(ventasReparto)
      setRutaOptimizada(ruta)
    } else {
      setRutaOptimizada([])
    }
  }, [ventasReparto])

  const fetchVentasReparto = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('ventas')
        .select('*, cliente:clientes(nombre)')
        .eq('reparto', true)
        .eq('fecha_venta', fechaFiltro)
        .not('latitud', 'is', null)
        .not('longitud', 'is', null)
        .order('estado')

      if (estadoFiltro !== 'todos') {
        query = query.eq('estado', estadoFiltro)
      }

      const { data, error } = await query

      if (error) throw error

      setVentasReparto(data || [])

      if (data && data.length > 0) {
        const ventaIds = data.map((v) => v.id)
        cargarDetallesMultiplesVentas(ventaIds)
      }
    } catch (error) {
      console.error('Error al cargar ventas de reparto:', error)
    } finally {
      setLoading(false)
    }
  }

  const cargarDetallesMultiplesVentas = async (ventaIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('detalle_ventas')
        .select('*, producto:productos(codigo_producto, nombre, altura_m, largo_m, separacion_cm)')
        .in('venta_id', ventaIds)

      if (error) throw error

      const detallesPorVenta: Record<string, DetalleVenta[]> = {}
      ventaIds.forEach((id) => {
        detallesPorVenta[id] = []
      })

      data?.forEach((detalle: any) => {
        if (detallesPorVenta[detalle.venta_id]) {
          detallesPorVenta[detalle.venta_id].push(detalle)
        }
      })

      setDetallesVentas(detallesPorVenta)
    } catch (error) {
      console.error('Error al cargar detalles de ventas:', error)
    }
  }

  const actualizarEstado = async (ventaId: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('ventas')
        .update({
          estado: nuevoEstado,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', ventaId)

      if (error) throw error

      setVentasReparto((prev) =>
        prev.map((v) => (v.id === ventaId ? { ...v, estado: nuevoEstado } : v))
      )
    } catch (error) {
      console.error('Error al actualizar estado:', error)
      alert('Error al actualizar el estado')
    }
  }

  const center: [number, number] = [EMPRESA_COORDS.lat, EMPRESA_COORDS.lng]

  const rutaCoords: [number, number][] = [
    [EMPRESA_COORDS.lat, EMPRESA_COORDS.lng],
    ...rutaOptimizada.map(v => [v.latitud, v.longitud] as [number, number])
  ]

  const calcularDistanciaTotal = () => {
    if (rutaOptimizada.length === 0) return 0
    let distanciaTotal = 0
    let ubicacionActual = EMPRESA_COORDS

    rutaOptimizada.forEach(venta => {
      distanciaTotal += calcularDistancia(
        ubicacionActual.lat,
        ubicacionActual.lng,
        venta.latitud,
        venta.longitud
      )
      ubicacionActual = { lat: venta.latitud, lng: venta.longitud }
    })

    distanciaTotal += calcularDistancia(
      ubicacionActual.lat,
      ubicacionActual.lng,
      EMPRESA_COORDS.lat,
      EMPRESA_COORDS.lng
    )

    return distanciaTotal
  }

  const getEstadoInfo = (estado: string) => {
    return estadosDisponibles.find((e) => e.value === estado) || estadosDisponibles[0]
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <h1>
            <Navigation size={32} />
            Rutas de Reparto
          </h1>
        </div>

        <div className="filters-container" style={{ marginBottom: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Fecha</label>
            <input
              type="date"
              value={fechaFiltro}
              onChange={(e) => setFechaFiltro(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Estado</label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              {estadosDisponibles.map((estado) => (
                <option key={estado.value} value={estado.value}>
                  {estado.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>Cargando rutas...</p>
        ) : ventasReparto.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#64748b',
            backgroundColor: '#f8fafc',
            borderRadius: '8px',
            border: '1px dashed #cbd5e1'
          }}>
            <Package size={48} style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No hay pedidos de reparto para esta fecha</p>
            <p style={{ fontSize: '0.9rem' }}>Selecciona otra fecha o cambia los filtros</p>
          </div>
        ) : (
          <>
            <div style={{
              marginBottom: '1rem',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                <strong>Total de pedidos:</strong> {ventasReparto.length}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                <strong>Distancia total:</strong> {calcularDistanciaTotal().toFixed(2)} km
              </div>
              <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                <strong>Combustible necesario:</strong> {(calcularDistanciaTotal() / RENDIMIENTO_KM_POR_LITRO).toFixed(2)} litros
              </div>
              {estadosDisponibles.map((estado) => {
                const count = ventasReparto.filter((v) => v.estado === estado.value).length
                if (count === 0) return null
                return (
                  <div key={estado.value} style={{ fontSize: '0.9rem', color: '#475569' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: estado.color,
                        marginRight: '0.5rem'
                      }}
                    />
                    <strong>{estado.label}:</strong> {count}
                  </div>
                )
              })}
            </div>

            <div style={{
              height: '500px',
              borderRadius: '8px',
              overflow: 'hidden',
              marginBottom: '2rem',
              border: '1px solid #e2e8f0'
            }}>
              <MapContainer
                center={center}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Marker
                  position={[EMPRESA_COORDS.lat, EMPRESA_COORDS.lng]}
                  icon={getEmpresaIcon()}
                >
                  <Popup>
                    <div style={{ minWidth: '200px' }}>
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1rem',
                        color: '#1e293b',
                        fontWeight: 'bold'
                      }}>
                        Punto de Partida
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                        <p style={{ margin: '0.25rem 0' }}>
                          <strong>Dirección:</strong> Antonio Zubillaga 425
                        </p>
                        <p style={{ margin: '0.25rem 0' }}>
                          La Teja, Montevideo
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Marker>

                {rutaCoords.length > 1 && (
                  <Polyline
                    positions={rutaCoords}
                    color="#3b82f6"
                    weight={3}
                    opacity={0.7}
                    dashArray="10, 10"
                  />
                )}

                {rutaOptimizada.map((venta, index) => (
                  <Marker
                    key={venta.id}
                    position={[venta.latitud, venta.longitud]}
                    icon={getMarkerIcon(venta.estado)}
                  >
                    <Popup>
                      <div style={{ minWidth: '250px', maxWidth: '350px' }}>
                        <h3 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '1rem',
                          color: '#1e293b'
                        }}>
                          Parada #{index + 1} - {venta.numero_venta}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                          <p style={{ margin: '0.25rem 0' }}>
                            <strong>Cliente:</strong> {venta.cliente?.nombre || 'Sin cliente'}
                          </p>
                          <p style={{ margin: '0.25rem 0' }}>
                            <strong>Dirección:</strong> {venta.direccion}
                          </p>
                          <p style={{ margin: '0.25rem 0' }}>
                            <strong>Localidad:</strong> {venta.localidad}
                          </p>
                          <p style={{ margin: '0.25rem 0' }}>
                            <strong>Total:</strong> ${venta.total.toFixed(2)}
                          </p>

                          {detallesVentas[venta.id] && detallesVentas[venta.id].length > 0 && (
                            <>
                              <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                              <p style={{ margin: '0.25rem 0', fontWeight: 'bold', color: '#1e293b' }}>
                                Productos:
                              </p>
                              <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.25rem' }}>
                                {detallesVentas[venta.id].map((detalle, detIdx) => {
                                  const producto = detalle.producto
                                  let nombreProducto = producto?.codigo_producto || 'Producto'

                                  if (producto && (producto.altura_m || producto.largo_m || producto.separacion_cm)) {
                                    nombreProducto += ' - '
                                    if (producto.altura_m) nombreProducto += `${producto.altura_m}m`
                                    if (producto.largo_m) nombreProducto += ` x ${producto.largo_m}m`
                                    if (producto.separacion_cm) nombreProducto += ` - ${producto.separacion_cm}cm`
                                  }

                                  return (
                                    <div
                                      key={detIdx}
                                      style={{
                                        padding: '0.25rem',
                                        marginBottom: '0.25rem',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '4px',
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      <div style={{ fontWeight: '500', color: '#1e293b' }}>
                                        {nombreProducto}
                                      </div>
                                      <div style={{ color: '#64748b' }}>
                                        Cantidad: {detalle.cantidad}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </>
                          )}

                          <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                          <p style={{ margin: '0.5rem 0 0.25rem 0' }}>
                            <strong>Estado:</strong>
                          </p>
                          <select
                            value={venta.estado}
                            onChange={(e) => actualizarEstado(venta.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: getEstadoInfo(venta.estado).color,
                              color: 'white',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            {estadosDisponibles.map((estado) => (
                              <option key={estado.value} value={estado.value}>
                                {estado.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="table-container">
              <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>Ruta Optimizada de Entrega</h2>
              <table>
                <thead>
                  <tr>
                    <th>Orden</th>
                    <th>Número Venta</th>
                    <th>Cliente</th>
                    <th>Dirección</th>
                    <th>Productos</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rutaOptimizada.map((venta, index) => {
                    const estadoInfo = getEstadoInfo(venta.estado)
                    const detalles = detallesVentas[venta.id] || []
                    return (
                      <tr key={venta.id}>
                        <td>
                          <span
                            style={{
                              display: 'inline-block',
                              width: '32px',
                              height: '32px',
                              lineHeight: '32px',
                              textAlign: 'center',
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td>{venta.numero_venta}</td>
                        <td>{venta.cliente?.nombre || 'Sin cliente'}</td>
                        <td>
                          <div>{venta.direccion}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{venta.localidad}</div>
                        </td>
                        <td>
                          {detalles.length === 0 ? (
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Sin productos</span>
                          ) : (
                            <div style={{ fontSize: '0.85rem' }}>
                              {detalles.map((detalle, detIdx) => {
                                const producto = detalle.producto
                                let nombreProducto = producto?.codigo_producto || 'Producto'

                                if (producto && (producto.altura_m || producto.largo_m || producto.separacion_cm)) {
                                  nombreProducto += ' - '
                                  if (producto.altura_m) nombreProducto += `${producto.altura_m}m`
                                  if (producto.largo_m) nombreProducto += ` x ${producto.largo_m}m`
                                  if (producto.separacion_cm) nombreProducto += ` - ${producto.separacion_cm}cm`
                                }

                                return (
                                  <div key={detIdx} style={{ marginBottom: '0.25rem' }}>
                                    <strong>{nombreProducto}</strong> - Cant: {detalle.cantidad}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </td>
                        <td>${venta.total.toFixed(2)}</td>
                        <td>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: '500',
                              backgroundColor: estadoInfo.color,
                              color: 'white',
                              display: 'inline-block'
                            }}
                          >
                            {estadoInfo.label}
                          </span>
                        </td>
                        <td>
                          <select
                            value={venta.estado}
                            onChange={(e) => actualizarEstado(venta.id, e.target.value)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '4px',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            {estadosDisponibles.map((estado) => (
                              <option key={estado.value} value={estado.value}>
                                {estado.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
