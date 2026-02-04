import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Edit2, Trash2, Search, Wrench } from 'lucide-react'
import '../styles/pages.css'

interface Servicio {
  id: string
  empresa_id: string
  nombre: string
  descripcion: string | null
  tipo_medida: 'metro_lineal' | 'unidad'
  precio_unitario: number
  activo: boolean
  created_at: string
}

export default function Servicios() {
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    tipo_medida: 'metro_lineal' as 'metro_lineal' | 'unidad',
    precio_unitario: '',
    activo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [serviciosRes, empresaRes] = await Promise.all([
        supabase
          .from('servicios')
          .select('*')
          .eq('activo', true)
          .order('nombre'),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
      ])

      if (serviciosRes.error) throw serviciosRes.error
      if (empresaRes.error) throw empresaRes.error

      setServicios(serviciosRes.data || [])
      setEmpresaId(empresaRes.data?.id || null)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!empresaId && !editingId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    try {
      const servicioData = {
        ...formData,
        precio_unitario: parseFloat(formData.precio_unitario) || 0,
        empresa_id: empresaId,
      }

      if (editingId) {
        const { error: err } = await supabase
          .from('servicios')
          .update(servicioData)
          .eq('id', editingId)

        if (err) throw err
        setSuccess('Servicio actualizado exitosamente')
      } else {
        const { error: err } = await supabase
          .from('servicios')
          .insert([servicioData])

        if (err) throw err
        setSuccess('Servicio creado exitosamente')
      }

      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (servicio: Servicio) => {
    setFormData({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion || '',
      tipo_medida: servicio.tipo_medida,
      precio_unitario: servicio.precio_unitario.toString(),
      activo: servicio.activo,
    })
    setEditingId(servicio.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este servicio?')) return

    try {
      const { error: err } = await supabase
        .from('servicios')
        .update({ activo: false })
        .eq('id', id)

      if (err) throw err
      setSuccess('Servicio eliminado exitosamente')
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      tipo_medida: 'metro_lineal',
      precio_unitario: '',
      activo: true,
    })
    setEditingId(null)
  }

  const filteredServicios = servicios.filter(servicio =>
    servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (servicio.descripcion && servicio.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getTipoMedidaLabel = (tipo: string) => {
    switch (tipo) {
      case 'metro_lineal':
        return 'Metro Lineal'
      case 'unidad':
        return 'Unidad'
      default:
        return tipo
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading">Cargando servicios...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-container">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <Wrench size={32} />
              Servicios
            </h1>
            <p className="page-subtitle">Gestión de servicios de instalación</p>
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            className="btn-primary"
          >
            <Plus size={20} />
            Nuevo Servicio
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
            <button onClick={() => setError('')} className="alert-close">×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button onClick={() => setSuccess('')} className="alert-close">×</button>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={() => !editingId && setShowForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingId ? 'Editar Servicio' : 'Nuevo Servicio'}</h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  className="modal-close"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="form">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label required">Nombre del Servicio</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Ej: Instalación de malla"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Tipo de Medida</label>
                    <select
                      className="form-input"
                      value={formData.tipo_medida}
                      onChange={(e) => setFormData({ ...formData, tipo_medida: e.target.value as 'metro_lineal' | 'unidad' })}
                      required
                    >
                      <option value="metro_lineal">Metro Lineal</option>
                      <option value="unidad">Unidad</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label required">Precio Unitario</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-input"
                      value={formData.precio_unitario}
                      onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label className="form-label">Descripción</label>
                    <textarea
                      className="form-input"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      placeholder="Descripción del servicio"
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.activo}
                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      />
                      Servicio Activo
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    className="btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Actualizar' : 'Crear'} Servicio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Tipo de Medida</th>
                <th>Precio Unitario</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredServicios.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No se encontraron servicios
                  </td>
                </tr>
              ) : (
                filteredServicios.map((servicio) => (
                  <tr key={servicio.id}>
                    <td>
                      <strong>{servicio.nombre}</strong>
                    </td>
                    <td>{servicio.descripcion || '-'}</td>
                    <td>
                      <span className="badge badge-info">
                        {getTipoMedidaLabel(servicio.tipo_medida)}
                      </span>
                    </td>
                    <td>${servicio.precio_unitario.toFixed(2)}</td>
                    <td>
                      <span className={`badge ${servicio.activo ? 'badge-success' : 'badge-secondary'}`}>
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleEdit(servicio)}
                          className="btn-icon btn-icon-primary"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(servicio.id)}
                          className="btn-icon btn-icon-danger"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-header">Total de Servicios</div>
            <div className="summary-card-value">{servicios.length}</div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
