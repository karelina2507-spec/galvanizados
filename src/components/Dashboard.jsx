import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

export default function Dashboard() {
  const [ventasMensuales, setVentasMensuales] = useState({
    uyu: 0,
    usd: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    obtenerVentasMensuales();
  }, []);

  const obtenerVentasMensuales = async () => {
    try {
      const ahora = new Date();
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const ultimoDiaMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);

      const primerDiaStr = primerDiaMes.toISOString().split('T')[0];
      const ultimoDiaStr = ultimoDiaMes.toISOString().split('T')[0];

      const { data: ventas, error } = await supabase
        .from('ventas')
        .select(`
          id,
          total,
          fecha_venta,
          detalle_ventas (
            producto_id,
            cantidad,
            precio_unitario,
            subtotal_item,
            productos (
              precio_venta_usd
            )
          )
        `)
        .gte('fecha_venta', primerDiaStr)
        .lte('fecha_venta', ultimoDiaStr);

      if (error) throw error;

      let totalUSD = 0;
      let totalUYU = 0;

      ventas?.forEach(venta => {
        venta.detalle_ventas?.forEach(detalle => {
          if (detalle.productos?.precio_venta_usd && detalle.productos.precio_venta_usd > 0) {
            totalUSD += Number(detalle.subtotal_item);
          } else {
            totalUYU += Number(detalle.subtotal_item);
          }
        });
      });

      setVentasMensuales({
        uyu: totalUYU,
        usd: totalUSD,
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      setVentasMensuales(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }));
    }
  };

  const formatearMoneda = (valor, moneda) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: moneda,
      minimumFractionDigits: 2
    }).format(valor);
  };

  const obtenerMesActual = () => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[new Date().getMonth()];
  };

  if (ventasMensuales.loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Cargando datos...</div>
      </div>
    );
  }

  if (ventasMensuales.error) {
    return (
      <div className="dashboard-container">
        <div className="error">Error: {ventasMensuales.error}</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard de Ventas</h1>
        <p className="mes-actual">{obtenerMesActual()} {new Date().getFullYear()}</p>
      </header>

      <div className="metricas-container">
        <div className="metrica-card uyu">
          <div className="metrica-icon">$</div>
          <div className="metrica-contenido">
            <h2>Ventas en Pesos</h2>
            <p className="metrica-valor">{formatearMoneda(ventasMensuales.uyu, 'UYU')}</p>
            <p className="metrica-label">Total mensual en UYU</p>
          </div>
        </div>

        <div className="metrica-card usd">
          <div className="metrica-icon">US$</div>
          <div className="metrica-contenido">
            <h2>Ventas en Dólares</h2>
            <p className="metrica-valor">{formatearMoneda(ventasMensuales.usd, 'USD')}</p>
            <p className="metrica-label">Total mensual en USD</p>
          </div>
        </div>
      </div>

      <button className="btn-actualizar" onClick={obtenerVentasMensuales}>
        Actualizar datos
      </button>
    </div>
  );
}
