import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { TrendingUp, DollarSign, ShoppingCart, Package } from 'lucide-react'
import '../styles/dashboard.css'
import '../styles/pages.css'

interface Reporte {
  ventasHoy: number
  ventasMes: number
  totalVentas: number
  gananciaTotal: number
  productosVendidos: number
  comprasMes: number
  costosCombustibleTotal: number
  montoEnviosTotal: number
  gananciasVentasTotal: number
  gananciaFinalTotal: number
}

export default function Reportes() {
  const [reporte, setReporte] = useState<Reporte>({
    ventasHoy: 0,
    ventasMes: 0,
    totalVentas: 0,
    gananciaTotal: 0,
    productosVendidos: 0,
    comprasMes: 0,
    costosCombustibleTotal: 0,
    montoEnviosTotal: 0,
    gananciasVentasTotal: 0,
    gananciaFinalTotal: 0,
  })
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [precioNafta, setPrecioNafta] = useState(73.50)
  const [consumoVehiculo, setConsumoVehiculo] = useState(10)

  useEffect(() => {
    const fetchEmpresaId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('usuarios')
          .select('empresa_id')
          .eq('auth_id', user.id)
          .single()
        if (data) {
          setEmpresaId(data.empresa_id)
        }
      }
    }
    fetchEmpresaId()
  }, [])

  useEffect(() => {
    if (empresaId) {
      loadReportes()
    }
  }, [empresaId])

  const loadReportes = async () => {
    if (!empresaId) return

    try {
      const hoy = new Date()
      const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0)).toISOString()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

      const [ventasHoyRes, ventasMesRes, todasVentasRes, comprasMesRes, ventasRecientesRes, empresaConfigRes] =
        await Promise.all([
          supabase
            .from('ventas')
            .select('total')
            .eq('empresa_id', empresaId)
            .gte('fecha_venta', inicioHoy),
          supabase
            .from('ventas')
            .select('total')
            .eq('empresa_id', empresaId)
            .gte('fecha_venta', inicioMes),
          supabase
            .from('ventas')
            .select('total, distancia_km, envio')
            .eq('empresa_id', empresaId),
          supabase
            .from('compras')
            .select('total')
            .eq('empresa_id', empresaId)
            .gte('fecha_compra', inicioMes),
          supabase
            .from('ventas')
            .select('numero_venta, fecha_venta, total, cliente_id, distancia_km, envio')
            .eq('empresa_id', empresaId)
            .order('fecha_venta', { ascending: false })
            .limit(10),
          supabase
            .from('empresas')
            .select('precio_nafta_litro, consumo_vehiculo_km_litro')
            .eq('id', empresaId)
            .single(),
        ])

      const ventasHoy =
        ventasHoyRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const ventasMes =
        ventasMesRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const totalVentas =
        todasVentasRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const comprasMes =
        comprasMesRes.data?.reduce((sum, c) => sum + (c.total || 0), 0) || 0

      const precioNaftaValue = empresaConfigRes.data?.precio_nafta_litro || 73.50
      const consumoVehiculoValue = empresaConfigRes.data?.consumo_vehiculo_km_litro || 10

      setPrecioNafta(precioNaftaValue)
      setConsumoVehiculo(consumoVehiculoValue)

      let costosCombustibleTotal = 0
      let montoEnviosTotal = 0

      if (todasVentasRes.data) {
        todasVentasRes.data.forEach((venta: any) => {
          const distancia = parseFloat(venta.distancia_km) || 0
          const envio = parseFloat(venta.envio) || 0

          if (distancia > 0) {
            const litrosUsados = distancia / consumoVehiculoValue
            costosCombustibleTotal += litrosUsados * precioNaftaValue
          }

          montoEnviosTotal += envio
        })
      }

      const { data: todasVentasEmpresa } = await supabase
        .from('ventas')
        .select('id')
        .eq('empresa_id', empresaId)

      const ventasIds = todasVentasEmpresa?.map(v => v.id) || []

      let detallesVentas: any[] = []
      if (ventasIds.length > 0) {
        const { data } = await supabase
          .from('detalle_ventas')
          .select(`
            cantidad,
            precio_unitario,
            producto:productos(
              precio_costo_m2,
              precio_compra_uyu,
              m2_rollo
            )
          `)
          .in('venta_id', ventasIds)

        detallesVentas = data || []
      }

      const { data: cotizacionData } = await supabase
        .from('cotizacion_dolar')
        .select('valor')
        .eq('empresa_id', empresaId)
        .maybeSingle()

      const cotizacionDolar = cotizacionData?.valor || 0

      let gananciasVentasTotal = 0
      if (detallesVentas) {
        detallesVentas.forEach((detalle: any) => {
          const producto = detalle.producto
          if (producto) {
            const cantidadRollos = parseFloat(detalle.cantidad) || 0
            const m2Rollo = parseFloat(producto.m2_rollo) || 1
            const cantidadM2 = cantidadRollos * m2Rollo

            const precioVentaM2 = parseFloat(producto.precio_venta_m2) || 0

            let precioCostoM2UYU = 0
            if (producto.precio_costo_m2 && cotizacionDolar > 0) {
              precioCostoM2UYU = parseFloat(producto.precio_costo_m2) * cotizacionDolar
            } else if (producto.precio_compra_uyu && producto.m2_rollo) {
              precioCostoM2UYU = parseFloat(producto.precio_compra_uyu) / parseFloat(producto.m2_rollo)
            }

            gananciasVentasTotal += (precioVentaM2 - precioCostoM2UYU) * cantidadM2
          }
        })
      }

      const gananciaFinalTotal = gananciasVentasTotal + montoEnviosTotal - costosCombustibleTotal

      setReporte({
        ventasHoy,
        ventasMes,
        totalVentas,
        gananciaTotal: gananciasVentasTotal,
        productosVendidos: 0,
        comprasMes,
        costosCombustibleTotal,
        montoEnviosTotal,
        gananciasVentasTotal,
        gananciaFinalTotal,
      })

      setVentasRecientes(ventasRecientesRes.data || [])
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1>Reportes y Métricas</h1>
            <p>Analiza el rendimiento de tu negocio</p>
          </div>
        </div>

        {loading ? (
          <div className="loading">Cargando reportes...</div>
        ) : (
          <>
            <div className="metrics-grid" style={{ marginBottom: '2rem' }}>
              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#d1fae5' }}
                >
                  <DollarSign size={24} color="#10b981" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ventas Hoy</p>
                  <p className="metric-value">${reporte.ventasHoy.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#dbeafe' }}
                >
                  <TrendingUp size={24} color="#0284c7" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ventas del Mes</p>
                  <p className="metric-value">${reporte.ventasMes.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#e0e7ff' }}
                >
                  <ShoppingCart size={24} color="#2563eb" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Total Ventas</p>
                  <p className="metric-value">${reporte.totalVentas.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#fef3c7' }}
                >
                  <Package size={24} color="#f59e0b" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ganancia Total</p>
                  <p className="metric-value">
                    ${reporte.gananciaTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <ShoppingCart size={24} color="#ef4444" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Compras del Mes</p>
                  <p className="metric-value">${reporte.comprasMes.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#d1fae5' }}
                >
                  <TrendingUp size={24} color="#10b981" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ganancia del Mes</p>
                  <p className="metric-value">
                    ${(reporte.ventasMes - reporte.comprasMes).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#fee2e2' }}
                >
                  <TrendingUp size={24} color="#dc2626" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Costo Combustible</p>
                  <p className="metric-value">${reporte.costosCombustibleTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#d1fae5' }}
                >
                  <DollarSign size={24} color="#059669" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Monto Envíos</p>
                  <p className="metric-value">${reporte.montoEnviosTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#dbeafe' }}
                >
                  <TrendingUp size={24} color="#0369a1" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ganancia Ventas</p>
                  <p className="metric-value">${reporte.gananciasVentasTotal.toFixed(2)}</p>
                </div>
              </div>

              <div className="metric-card">
                <div
                  className="metric-icon"
                  style={{ backgroundColor: '#dcfce7' }}
                >
                  <DollarSign size={24} color="#16a34a" />
                </div>
                <div className="metric-content">
                  <p className="metric-label">Ganancia Final</p>
                  <p className="metric-value">${reporte.gananciaFinalTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="table-container">
              <h2 style={{ padding: '1.5rem', margin: 0, borderBottom: '1px solid var(--neutral-200)' }}>
                Ventas Recientes
              </h2>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Número</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Distancia (km)</th>
                    <th>Envío</th>
                    <th>Costo Combustible</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        No hay ventas recientes
                      </td>
                    </tr>
                  ) : (
                    ventasRecientes.map((venta) => {
                      const distancia = parseFloat(venta.distancia_km) || 0
                      const envio = parseFloat(venta.envio) || 0
                      const costoCombustible = distancia > 0
                        ? (distancia / consumoVehiculo) * precioNafta
                        : 0

                      return (
                        <tr key={venta.numero_venta}>
                          <td>{venta.numero_venta}</td>
                          <td>
                            {new Date(venta.fecha_venta).toLocaleDateString()}
                          </td>
                          <td>{venta.cliente_id || 'Sin cliente'}</td>
                          <td>${venta.total?.toFixed(2) || '0.00'}</td>
                          <td>{distancia > 0 ? distancia.toFixed(2) : '-'}</td>
                          <td>${envio > 0 ? envio.toFixed(2) : '0.00'}</td>
                          <td>${costoCombustible.toFixed(2)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
