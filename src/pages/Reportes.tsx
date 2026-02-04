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
}

export default function Reportes() {
  const [reporte, setReporte] = useState<Reporte>({
    ventasHoy: 0,
    ventasMes: 0,
    totalVentas: 0,
    gananciaTotal: 0,
    productosVendidos: 0,
    comprasMes: 0,
  })
  const [ventasRecientes, setVentasRecientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportes()
  }, [])

  const loadReportes = async () => {
    try {
      const hoy = new Date()
      const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0)).toISOString()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

      const [ventasHoyRes, ventasMesRes, todasVentasRes, comprasMesRes, ventasRecientesRes] =
        await Promise.all([
          supabase
            .from('ventas')
            .select('total')
            .gte('fecha_venta', inicioHoy),
          supabase
            .from('ventas')
            .select('total')
            .gte('fecha_venta', inicioMes),
          supabase.from('ventas').select('total'),
          supabase
            .from('compras')
            .select('total')
            .gte('fecha_compra', inicioMes),
          supabase
            .from('ventas')
            .select('numero_venta, fecha_venta, total, cliente_id')
            .order('fecha_venta', { ascending: false })
            .limit(10),
        ])

      const ventasHoy =
        ventasHoyRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const ventasMes =
        ventasMesRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const totalVentas =
        todasVentasRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const comprasMes =
        comprasMesRes.data?.reduce((sum, c) => sum + (c.total || 0), 0) || 0

      const gananciaTotal = totalVentas - comprasMes

      setReporte({
        ventasHoy,
        ventasMes,
        totalVentas,
        gananciaTotal,
        productosVendidos: 0,
        comprasMes,
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
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-state">
                        No hay ventas recientes
                      </td>
                    </tr>
                  ) : (
                    ventasRecientes.map((venta) => (
                      <tr key={venta.numero_venta}>
                        <td>{venta.numero_venta}</td>
                        <td>
                          {new Date(venta.fecha_venta).toLocaleDateString()}
                        </td>
                        <td>{venta.cliente_id || 'Sin cliente'}</td>
                        <td>${venta.total?.toFixed(2) || '0.00'}</td>
                      </tr>
                    ))
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
