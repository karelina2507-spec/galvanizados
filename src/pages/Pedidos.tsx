import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Plus } from 'lucide-react'

interface Pedido {
  id: string
  cliente_id: string
  fecha: string
  estado: string
  total: number
  clientes: {
    nombre: string
  }
}

export default function Pedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPedidos()
  }, [])

  const fetchPedidos = async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          clientes (nombre)
        `)
        .order('fecha', { ascending: false })

      if (error) throw error
      setPedidos(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Layout><div>Cargando...</div></Layout>

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>Pedidos</h1>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600'
            }}
          >
            <Plus size={20} />
            Nuevo Pedido
          </button>
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
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Fecha</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Cliente</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>Total</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((pedido) => (
                <tr key={pedido.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px' }}>{new Date(pedido.fecha).toLocaleDateString()}</td>
                  <td style={{ padding: '16px' }}>{pedido.clientes.nombre}</td>
                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>${pedido.total}</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: '600',
                      background: pedido.estado === 'Completado' ? '#10b98120' : '#f59e0b20',
                      color: pedido.estado === 'Completado' ? '#10b981' : '#f59e0b'
                    }}>
                      {pedido.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {pedidos.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              No hay pedidos registrados
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
