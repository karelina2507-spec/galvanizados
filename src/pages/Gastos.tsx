import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Trash2, AlertCircle, CheckCircle, Edit2, X } from 'lucide-react'
import '../styles/pages.css'

interface Gasto {
  id: string
  empresa_id: string
  fecha: string
  concepto: string
  subcategoria: string | null
  descripcion: string | null
  monto: number
  moneda: string
  metodo_pago: string | null
  comprobante: string | null
  created_at: string
}

const CONCEPTOS = {
  'Transporte': ['Combustible', 'Reparación', 'Infracciones', 'Mantenimiento'],
  'Mano de obra': [],
  'Servicios básicos': ['UTE', 'Internet', 'Publicidad', 'Web', 'Mercado Pago', 'Redes Sociales', 'CRM']
}

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta de Débito', 'Tarjeta de Crédito', 'Mercado Pago', 'Otro']

export default function Gastos() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroConcepto, setFiltroConcepto] = useState('')
  const [filtroSubcategoria, setFiltroSubcategoria] = useState('')

  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    subcategoria: '',
    descripcion: '',
    monto: '',
    moneda: 'UYU',
    metodo_pago: '',
    comprobante: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [gastosRes, empresaRes] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
      ])

      if (gastosRes.error) throw gastosRes.error
      if (empresaRes.error) throw empresaRes.error

      setGastos(gastosRes.data || [])
      setEmpresaId(empresaRes.data?.id || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConceptoChange = (concepto: string) => {
    setFormData({
      ...formData,
      concepto,
      subcategoria: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!empresaId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    if (!formData.concepto || !formData.monto) {
      setError('El concepto y el monto son requeridos')
      return
    }

    try {
      const gastoData = {
        empresa_id: empresaId,
        fecha: formData.fecha,
        concepto: formData.concepto,
        subcategoria: formData.subcategoria || null,
        descripcion: formData.descripcion || null,
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        metodo_pago: formData.metodo_pago || null,
        comprobante: formData.comprobante || null,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('gastos')
          .update({ ...gastoData, updated_at: new Date().toISOString() })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Gasto actualizado exitosamente')
      } else {
        const { error: insertError } = await supabase
          .from('gastos')
          .insert([gastoData])

        if (insertError) throw insertError
        setSuccess('Gasto registrado exitosamente')
      }

      resetForm()
      loadData()

      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (gasto: Gasto) => {
    setFormData({
      fecha: gasto.fecha,
      concepto: gasto.concepto,
      subcategoria: gasto.subcategoria || '',
      descripcion: gasto.descripcion || '',
      monto: gasto.monto.toString(),
      moneda: gasto.moneda,
      metodo_pago: gasto.metodo_pago || '',
      comprobante: gasto.comprobante || '',
    })
    setEditingId(gasto.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este gasto?')) return

    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id)
      if (error) throw error

      setSuccess('Gasto eliminado exitosamente')
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      subcategoria: '',
      descripcion: '',
      monto: '',
      moneda: 'UYU',
      metodo_pago: '',
      comprobante: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const gastosFiltrados = gastos.filter((gasto) => {
    const matchSearch = !searchTerm ||
      gasto.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gasto.comprobante?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchConcepto = !filtroConcepto || gasto.concepto === filtroConcepto
    const matchSubcategoria = !filtroSubcategoria || gasto.subcategoria === filtroSubcategoria

    return matchSearch && matchConcepto && matchSubcategoria
  })

  const totalGastos = gastosFiltrados.reduce((sum, g) => sum + g.monto, 0)

  const subcategoriasDisponibles = formData.concepto ? CONCEPTOS[formData.concepto as keyof typeof CONCEPTOS] : []
  const subcategoriasParaFiltro = filtroConcepto ? CONCEPTOS[filtroConcepto as keyof typeof CONCEPTOS] : []

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
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            padding: '2rem',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>Gastos</h1>
              <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Gestiona los gastos de tu empresa</p>
            </div>
            <button
              onClick={() => {
                resetForm()
                setShowForm(!showForm)
              }}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#dc2626',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              {showForm ? <X size={20} /> : <Plus size={20} />}
              {showForm ? 'Cancelar' : 'Nuevo Gasto'}
            </button>
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

            {showForm && (
              <div style={{
                background: '#f8fafc',
                padding: '2rem',
                borderRadius: '12px',
                marginBottom: '2rem',
              }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
                  {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
                </h3>

                <form onSubmit={handleSubmit}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div className="form-group">
                      <label>Fecha *</label>
                      <input
                        type="date"
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Concepto *</label>
                      <select
                        value={formData.concepto}
                        onChange={(e) => handleConceptoChange(e.target.value)}
                        required
                      >
                        <option value="">Seleccionar concepto...</option>
                        {Object.keys(CONCEPTOS).map((concepto) => (
                          <option key={concepto} value={concepto}>
                            {concepto}
                          </option>
                        ))}
                      </select>
                    </div>

                    {subcategoriasDisponibles.length > 0 && (
                      <div className="form-group">
                        <label>Subcategoría</label>
                        <select
                          value={formData.subcategoria}
                          onChange={(e) => setFormData({ ...formData, subcategoria: e.target.value })}
                        >
                          <option value="">Seleccionar subcategoría...</option>
                          {subcategoriasDisponibles.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Monto *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Método de Pago</label>
                      <select
                        value={formData.metodo_pago}
                        onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                      >
                        <option value="">Seleccionar método...</option>
                        {METODOS_PAGO.map((metodo) => (
                          <option key={metodo} value={metodo}>
                            {metodo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Comprobante</label>
                      <input
                        type="text"
                        value={formData.comprobante}
                        onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
                        placeholder="Número de comprobante"
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                    <label>Descripción</label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción adicional del gasto"
                      rows={3}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={resetForm}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      style={{
                        padding: '0.75rem 2rem',
                        backgroundColor: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      {editingId ? 'Actualizar' : 'Guardar'} Gasto
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
            }}>
              <input
                type="text"
                placeholder="Buscar por descripción o comprobante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  flex: '1',
                  minWidth: '250px',
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                }}
              />

              <select
                value={filtroConcepto}
                onChange={(e) => {
                  setFiltroConcepto(e.target.value)
                  setFiltroSubcategoria('')
                }}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  minWidth: '200px',
                }}
              >
                <option value="">Todos los conceptos</option>
                {Object.keys(CONCEPTOS).map((concepto) => (
                  <option key={concepto} value={concepto}>
                    {concepto}
                  </option>
                ))}
              </select>

              {subcategoriasParaFiltro.length > 0 && (
                <select
                  value={filtroSubcategoria}
                  onChange={(e) => setFiltroSubcategoria(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    minWidth: '200px',
                  }}
                >
                  <option value="">Todas las subcategorías</option>
                  {subcategoriasParaFiltro.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div style={{
              background: '#f8fafc',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151' }}>
                Total de Gastos:
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#dc2626' }}>
                ${totalGastos.toFixed(2)}
              </span>
            </div>

            {gastosFiltrados.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#9ca3af',
              }}>
                <p style={{ fontSize: '1.1rem' }}>No hay gastos registrados</p>
              </div>
            ) : (
              <div style={{
                background: 'white',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Fecha</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Concepto</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Subcategoría</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Descripción</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: '600' }}>Método Pago</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600' }}>Monto</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: '600' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gastosFiltrados.map((gasto) => (
                      <tr key={gasto.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '0.75rem' }}>
                          {new Date(gasto.fecha).toLocaleDateString('es-UY')}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '500',
                            backgroundColor: gasto.concepto === 'Transporte' ? '#dbeafe' : gasto.concepto === 'Mano de obra' ? '#fef3c7' : '#dcfce7',
                            color: gasto.concepto === 'Transporte' ? '#1e40af' : gasto.concepto === 'Mano de obra' ? '#ca8a04' : '#16a34a'
                          }}>
                            {gasto.concepto}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {gasto.subcategoria || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', maxWidth: '200px' }}>
                          {gasto.descripcion ? (
                            <span style={{ fontSize: '0.9rem', color: '#6b7280' }}>{gasto.descripcion}</span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {gasto.metodo_pago || '-'}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: '600', color: '#dc2626' }}>
                          ${gasto.monto.toFixed(2)}
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => handleEdit(gasto)}
                              style={{
                                padding: '0.5rem',
                                backgroundColor: '#dbeafe',
                                color: '#2563eb',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(gasto.id)}
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
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
