import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Edit2, Save, X, Search } from 'lucide-react'

interface StockItem {
  id: string
  producto_id: string
  cantidad_disponible: number
  cantidad_minima: number
  cantidad_maxima: number
  ubicacion: string | null
  producto?: {
    codigo_producto: string
    nombre: string
    subtipo: string
    altura_m: number | null
    largo_m: number | null
    separacion_cm: number | null
    categoria?: {
      nombre: string
    }
  }
}

export default function Stock() {
  const [stock, setStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ cantidad_disponible: number; cantidad_minima: number }>({
    cantidad_disponible: 0,
    cantidad_minima: 0
  })
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchStock()
  }, [])

  const fetchStock = async () => {
    try {
      const { data, error } = await supabase
        .from('stock')
        .select(`
          *,
          producto:productos (
            codigo_producto,
            nombre,
            subtipo,
            altura_m,
            largo_m,
            separacion_cm,
            categoria:categorias (
              nombre
            )
          )
        `)
        .order('cantidad_disponible', { ascending: true })

      if (error) throw error
      setStock(data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: StockItem) => {
    setEditingId(item.id)
    setEditValues({
      cantidad_disponible: Number(item.cantidad_disponible),
      cantidad_minima: Number(item.cantidad_minima)
    })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({ cantidad_disponible: 0, cantidad_minima: 0 })
  }

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('stock')
        .update({
          cantidad_disponible: editValues.cantidad_disponible,
          cantidad_minima: editValues.cantidad_minima,
          actualizado_en: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      await fetchStock()
      setEditingId(null)
    } catch (error) {
      console.error('Error al actualizar stock:', error)
      alert('Error al actualizar stock')
    }
  }

  const stockFiltrado = stock.filter((item) => {
    if (!item.producto) return false
    const searchLower = searchTerm.toLowerCase()
    return (
      item.producto.codigo_producto.toLowerCase().includes(searchLower) ||
      item.producto.nombre.toLowerCase().includes(searchLower) ||
      item.producto.subtipo?.toLowerCase().includes(searchLower) ||
      item.producto.categoria?.nombre?.toLowerCase().includes(searchLower)
    )
  })

  if (loading) return <Layout><div>Cargando...</div></Layout>

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', marginBottom: '24px' }}>
          Control de Stock ({stockFiltrado.length})
        </h1>

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
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Categoría</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>Stock Actual</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: '600' }}>Stock Mínimo</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Estado</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600' }}>Ubicación</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {stockFiltrado.map((item) => {
                const producto = item.producto
                if (!producto) return null

                let nombreProducto = `${producto.nombre}`
                if (producto.subtipo) nombreProducto += ` - ${producto.subtipo}`
                if (producto.altura_m || producto.largo_m || producto.separacion_cm) {
                  nombreProducto += ' ('
                  if (producto.altura_m) nombreProducto += `${producto.altura_m}m`
                  if (producto.largo_m) nombreProducto += ` x ${producto.largo_m}m`
                  if (producto.separacion_cm) nombreProducto += ` - ${producto.separacion_cm}cm`
                  nombreProducto += ')'
                }

                const cantidad = Number(item.cantidad_disponible)
                const minimo = Number(item.cantidad_minima)
                const estado = cantidad <= minimo ? 'Crítico' : cantidad <= minimo * 2 ? 'Bajo' : 'Normal'
                const color = cantidad <= minimo ? '#ef4444' : cantidad <= minimo * 2 ? '#f59e0b' : '#10b981'
                const isEditing = editingId === item.id

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px', fontWeight: '600' }}>{producto.codigo_producto}</td>
                    <td style={{ padding: '16px' }}>{nombreProducto}</td>
                    <td style={{ padding: '16px' }}>{producto.categoria?.nombre || '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '600', fontSize: '16px' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.cantidad_disponible}
                          onChange={(e) => setEditValues({ ...editValues, cantidad_disponible: Number(e.target.value) })}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            fontSize: '16px',
                            fontWeight: '600',
                            textAlign: 'right'
                          }}
                          min="0"
                        />
                      ) : (
                        cantidad
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', color: '#6b7280' }}>
                      {isEditing ? (
                        <input
                          type="number"
                          value={editValues.cantidad_minima}
                          onChange={(e) => setEditValues({ ...editValues, cantidad_minima: Number(e.target.value) })}
                          style={{
                            width: '80px',
                            padding: '6px 10px',
                            border: '2px solid #3b82f6',
                            borderRadius: '6px',
                            fontSize: '14px',
                            textAlign: 'right'
                          }}
                          min="0"
                        />
                      ) : (
                        minimo
                      )}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        background: `${color}20`,
                        color: color
                      }}>
                        {estado}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#6b7280' }}>{item.ubicacion || '-'}</td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleSave(item.id)}
                            style={{
                              padding: '8px 12px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600'
                            }}
                          >
                            <Save size={16} />
                            Guardar
                          </button>
                          <button
                            onClick={handleCancel}
                            style={{
                              padding: '8px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: '600'
                            }}
                          >
                            <X size={16} />
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(item)}
                          style={{
                            padding: '8px 16px',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600'
                          }}
                        >
                          <Edit2 size={16} />
                          Editar
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {stockFiltrado.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {searchTerm ? 'No se encontraron productos' : 'No hay stock disponible'}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
