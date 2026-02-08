import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import '../styles/dashboard.css'
import { TrendingUp, Package, ShoppingCart, DollarSign, LogOut, Users, Award, AlertCircle, Trash2 } from 'lucide-react'

interface Metrics {
  totalProductos: number
  ventasHoy: number
  ventasMes: number
  gananciasMes: number
  comprasMes: number
  totalClientes: number
  productoMasVendido: { nombre: string; cantidad: number; codigo: string } | null
  productoMenosVendido: { nombre: string; cantidad: number; codigo: string } | null
  cantidadTotalVendidaMes: number
  costosCombustibleMes: number
  montoEnviosMes: number
  gananciasVentasMes: number
  gananciaFinalMes: number
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [metrics, setMetrics] = useState<Metrics>({
    totalProductos: 0,
    ventasHoy: 0,
    ventasMes: 0,
    gananciasMes: 0,
    comprasMes: 0,
    totalClientes: 0,
    productoMasVendido: null,
    productoMenosVendido: null,
    cantidadTotalVendidaMes: 0,
    costosCombustibleMes: 0,
    montoEnviosMes: 0,
    gananciasVentasMes: 0,
    gananciaFinalMes: 0,
  })
  const [, setLoading] = useState(true)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [reseteando, setReseteando] = useState(false)

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
      loadMetrics()
    }
  }, [empresaId])

  const loadMetrics = async () => {
    if (!empresaId) return

    try {
      const hoy = new Date()
      const inicioHoy = new Date(hoy.setHours(0, 0, 0, 0)).toISOString()
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()

      const [productosRes, ventasHoyRes, ventasMesRes, comprasMesRes, clientesRes, empresaConfigRes] =
        await Promise.all([
          supabase.from('productos').select('*').eq('activo', true).eq('empresa_id', empresaId),
          supabase.from('ventas').select('total').gte('fecha_venta', inicioHoy).eq('empresa_id', empresaId),
          supabase.from('ventas').select('id, total, distancia_km, envio').gte('fecha_venta', inicioMes).eq('empresa_id', empresaId),
          supabase.from('compras').select('total').gte('fecha_compra', inicioMes).eq('empresa_id', empresaId),
          supabase.from('clientes').select('*').eq('activo', true).eq('empresa_id', empresaId),
          supabase.from('empresas').select('precio_nafta_litro, consumo_vehiculo_km_litro').eq('id', empresaId).single(),
        ])

      const totalProductos = productosRes.data?.length || 0
      const ventasHoy =
        ventasHoyRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const ventasMes =
        ventasMesRes.data?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      const comprasMes =
        comprasMesRes.data?.reduce((sum, c) => sum + (c.total || 0), 0) || 0
      const totalClientes = clientesRes.data?.length || 0

      const precioNafta = empresaConfigRes.data?.precio_nafta_litro || 80.30
      const consumoVehiculo = empresaConfigRes.data?.consumo_vehiculo_km_litro || 10

      let costosCombustibleMes = 0
      let montoEnviosMes = 0

      if (ventasMesRes.data) {
        ventasMesRes.data.forEach((venta: any) => {
          const distancia = parseFloat(venta.distancia_km) || 0
          const envio = parseFloat(venta.envio) || 0

          if (distancia > 0) {
            const litrosUsados = distancia / consumoVehiculo
            costosCombustibleMes += litrosUsados * precioNafta
          }

          montoEnviosMes += envio
        })
      }

      const ventasMesIds = ventasMesRes.data?.map(v => v.id) || []

      let detallesVentasMes: any[] = []
      if (ventasMesIds.length > 0) {
        const { data } = await supabase
          .from('detalle_ventas')
          .select(`
            cantidad,
            precio_unitario,
            venta_id,
            producto:productos(id, nombre, codigo_producto, precio_costo_m2, precio_compra_uyu, precio_venta_m2, m2_rollo)
          `)
          .in('venta_id', ventasMesIds)

        detallesVentasMes = data || []
      }

      let gananciasVentasMes = 0
      let cantidadTotalVendidaMes = 0
      const productoVentas: Record<string, { nombre: string; codigo: string; cantidad: number }> = {}

      const { data: cotizacionData } = await supabase
        .from('cotizacion_dolar')
        .select('valor')
        .eq('empresa_id', empresaId)
        .maybeSingle()

      const cotizacionDolar = cotizacionData?.valor || 0

      if (detallesVentasMes) {
        detallesVentasMes.forEach((detalle: any) => {
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

            gananciasVentasMes += (precioVentaM2 - precioCostoM2UYU) * cantidadM2
            cantidadTotalVendidaMes += cantidadM2

            const productoKey = producto.id
            if (!productoVentas[productoKey]) {
              productoVentas[productoKey] = {
                nombre: producto.nombre,
                codigo: producto.codigo_producto,
                cantidad: 0
              }
            }
            productoVentas[productoKey].cantidad += cantidadM2
          }
        })
      }

      const gananciaFinalMes = gananciasVentasMes + montoEnviosMes - costosCombustibleMes

      const productosOrdenados = Object.values(productoVentas).sort((a, b) => b.cantidad - a.cantidad)
      const productoMasVendido = productosOrdenados.length > 0 ? productosOrdenados[0] : null
      const productoMenosVendido = productosOrdenados.length > 0 ? productosOrdenados[productosOrdenados.length - 1] : null

      setMetrics({
        totalProductos,
        ventasHoy,
        ventasMes,
        gananciasMes: gananciasVentasMes,
        comprasMes,
        totalClientes,
        productoMasVendido,
        productoMenosVendido,
        cantidadTotalVendidaMes,
        costosCombustibleMes,
        montoEnviosMes,
        gananciasVentasMes,
        gananciaFinalMes,
      })
    } catch (error) {
      console.error('Error loading metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const handleResetearDatos = async () => {
    const confirmacion1 = window.confirm(
      '⚠️ ADVERTENCIA: Esto eliminará TODAS las ventas, presupuestos, pedidos, compras, promociones, clientes y gastos.\n\n¿Estás seguro de que quieres continuar?'
    )

    if (!confirmacion1) return

    const confirmacion2 = window.confirm(
      '⚠️ ÚLTIMA ADVERTENCIA: Esta acción NO se puede deshacer.\n\nTodos los datos de prueba serán eliminados permanentemente.\n\n¿Confirmas que deseas eliminar todos los datos?'
    )

    if (!confirmacion2) return

    setReseteando(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session || !empresaId) {
        alert('Error: No se pudo obtener la sesión o empresa_id')
        return
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/resetear-datos-prueba`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ empresa_id: empresaId })
      })

      const result = await response.json()

      if (response.ok) {
        alert('✅ Datos eliminados correctamente. La página se recargará.')
        window.location.reload()
      } else {
        alert(`Error al eliminar datos: ${result.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('Error al resetear datos:', error)
      alert('Error al resetear los datos. Verifica la consola.')
    } finally {
      setReseteando(false)
    }
  }

  return (
    <Layout>
      <div className="dashboard">
        <div className="dashboard-header">
          <div>
            <h1>Panel de Control</h1>
            <p>Bienvenido {user?.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => navigate('/nueva-venta')}
            style={{
              width: '100%',
              padding: '1.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              backgroundColor: '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#15803d'
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#16a34a'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <DollarSign size={28} />
            Cargar Nueva Venta
          </button>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#e0e7ff' }}>
              <Package size={24} color="#2563eb" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Productos</p>
              <p className="metric-value">{metrics.totalProductos}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#d1fae5' }}>
              <DollarSign size={24} color="#10b981" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Ventas Hoy</p>
              <p className="metric-value">$ {metrics.ventasHoy.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dbeafe' }}>
              <TrendingUp size={24} color="#0284c7" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Ventas del Mes</p>
              <p className="metric-value">$ {metrics.ventasMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fef3c7' }}>
              <TrendingUp size={24} color="#f59e0b" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Ganancia del Mes</p>
              <p className="metric-value">$ {metrics.gananciasMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fee2e2' }}>
              <ShoppingCart size={24} color="#ef4444" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Compras del Mes</p>
              <p className="metric-value">$ {metrics.comprasMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#e0e7ff' }}>
              <Users size={24} color="#2563eb" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Clientes</p>
              <p className="metric-value">{metrics.totalClientes}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dcfce7' }}>
              <Award size={24} color="#16a34a" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Producto Más Vendido</p>
              {metrics.productoMasVendido ? (
                <>
                  <p className="metric-value" style={{ fontSize: '1rem', lineHeight: '1.2' }}>
                    {metrics.productoMasVendido.codigo}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Cantidad: {metrics.productoMasVendido.cantidad}
                  </p>
                </>
              ) : (
                <p className="metric-value" style={{ fontSize: '0.9rem' }}>Sin datos</p>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fef3c7' }}>
              <AlertCircle size={24} color="#d97706" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Producto Menos Vendido</p>
              {metrics.productoMenosVendido ? (
                <>
                  <p className="metric-value" style={{ fontSize: '1rem', lineHeight: '1.2' }}>
                    {metrics.productoMenosVendido.codigo}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Cantidad: {metrics.productoMenosVendido.cantidad}
                  </p>
                </>
              ) : (
                <p className="metric-value" style={{ fontSize: '0.9rem' }}>Sin datos</p>
              )}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dbeafe' }}>
              <Package size={24} color="#0284c7" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Unidades Vendidas (Mes)</p>
              <p className="metric-value">{metrics.cantidadTotalVendidaMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#fee2e2' }}>
              <TrendingUp size={24} color="#dc2626" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Costo Combustible (Mes)</p>
              <p className="metric-value">$ {metrics.costosCombustibleMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#d1fae5' }}>
              <DollarSign size={24} color="#059669" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Monto Envíos (Mes)</p>
              <p className="metric-value">$ {metrics.montoEnviosMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dbeafe' }}>
              <TrendingUp size={24} color="#0369a1" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Ganancia Ventas (Mes)</p>
              <p className="metric-value">$ {metrics.gananciasVentasMes.toFixed(2)}</p>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon" style={{ backgroundColor: '#dcfce7' }}>
              <DollarSign size={24} color="#16a34a" />
            </div>
            <div className="metric-content">
              <p className="metric-label">Ganancia Final (Mes)</p>
              <p className="metric-value">$ {metrics.gananciaFinalMes.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Acciones Rápidas</h2>
          <div className="actions-grid">
            <button
              onClick={() => navigate('/compras')}
              className="action-btn"
            >
              <ShoppingCart size={20} />
              Nueva Compra
            </button>
            <button
              onClick={() => navigate('/productos')}
              className="action-btn"
            >
              <Package size={20} />
              Gestionar Productos
            </button>
            <button
              onClick={() => navigate('/stock')}
              className="action-btn"
            >
              <Package size={20} />
              Control de Stock
            </button>
            <button
              onClick={() => navigate('/clientes')}
              className="action-btn"
            >
              <Users size={20} />
              Gestionar Clientes
            </button>
            <button
              onClick={() => navigate('/reportes')}
              className="action-btn"
            >
              <TrendingUp size={20} />
              Ver Reportes
            </button>
            <button
              onClick={handleResetearDatos}
              disabled={reseteando}
              className="action-btn"
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                border: '2px solid #fca5a5',
              }}
            >
              <Trash2 size={20} />
              {reseteando ? 'Reseteando...' : 'Resetear Datos de Prueba'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
