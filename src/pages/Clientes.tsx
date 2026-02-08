import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Edit, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import '../styles/pages.css'

interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string
  direccion: string
  ciudad: string
  activo: boolean
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [clientesRes, empresaRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('activo', true),
        supabase.from('empresas').select('id').limit(1).maybeSingle(),
      ])

      if (clientesRes.error) throw clientesRes.error
      if (empresaRes.error) throw empresaRes.error

      setClientes(clientesRes.data || [])
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
      if (editingId) {
        const { error: err } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingId)

        if (err) throw err
        setSuccess('Cliente actualizado exitosamente')
      } else {
        const { error: err } = await supabase
          .from('clientes')
          .insert([{ ...formData, empresa_id: empresaId }])

        if (err) throw err
        setSuccess('Cliente creado exitosamente')
      }

      setTimeout(() => setSuccess(''), 3000)
      resetForm()
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este cliente?')) return

    try {
      const { error: err } = await supabase
        .from('clientes')
        .update({ activo: false })
        .eq('id', id)

      if (err) throw err
      setSuccess('Cliente eliminado exitosamente')
      setTimeout(() => setSuccess(''), 3000)
      loadData()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      telefono: '',
      direccion: '',
      ciudad: '',
    })
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (cliente: Cliente) => {
    setFormData({
      nombre: cliente.nombre,
      email: cliente.email || '',
      telefono: cliente.telefono || '',
      direccion: cliente.direccion || '',
      ciudad: cliente.ciudad || '',
    })
    setEditingId(cliente.id)
    setShowForm(true)
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="loading">Cargando...</div>
        </div>
      </Layout>
    )
  }

  if (!showForm) {
    return (
      <Layout>
        <div className="page-container">
          <div className="page-header">
            <div>
              <h1>Gestión de Clientes</h1>
              <p>Administra tu base de clientes</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="btn-primary"
            >
              <Plus size={20} />
              Nuevo Cliente
            </button>
          </div>

          {error && (
            <div className="error-alert">
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

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Ciudad</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-state">
                      No hay clientes registrados
                    </td>
                  </tr>
                ) : (
                  clientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td>{cliente.nombre}</td>
                      <td>{cliente.email || '-'}</td>
                      <td>{cliente.telefono || '-'}</td>
                      <td>{cliente.ciudad || '-'}</td>
                      <td className="action-cell">
                        <button
                          onClick={() => handleEdit(cliente)}
                          className="btn-icon edit"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(cliente.id)}
                          className="btn-icon delete"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            padding: '2rem',
            color: 'white',
          }}>
            <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '700' }}>
              {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              {editingId ? 'Actualiza los datos del cliente' : 'Complete los datos para registrar un nuevo cliente'}
            </p>
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

            <form onSubmit={handleSubmit}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem',
              }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) =>
                      setFormData({ ...formData, nombre: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Ciudad</label>
                  <input
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) =>
                      setFormData({ ...formData, ciudad: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label>Dirección</label>
                <input
                  type="text"
                  value={formData.direccion}
                  onChange={(e) =>
                    setFormData({ ...formData, direccion: e.target.value })
                  }
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
                    fontSize: '1rem',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '1rem',
                  }}
                >
                  {editingId ? 'Guardar Cambios' : 'Crear Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  )
}
