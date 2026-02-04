import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import { Plus, Edit2, Trash2, Search, Video, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react'
import '../styles/pages.css'

interface Tutorial {
  id: string
  empresa_id: string
  categoria_id: string
  titulo: string
  descripcion: string | null
  video_url: string | null
  tips: string | null
  activo: boolean
  created_at: string
  categorias?: {
    nombre: string
  }
}

export default function Tutoriales() {
  const [tutoriales, setTutoriales] = useState<Tutorial[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    categoria_id: '',
    titulo: '',
    descripcion: '',
    video_url: '',
    tips: '',
    activo: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      const { data: empresaData, error: empresaError } = await supabase
        .from('empresas')
        .select('id')
        .limit(1)
        .maybeSingle()

      if (empresaError) throw empresaError
      if (!empresaData) throw new Error('No se encontró la empresa')

      setEmpresaId(empresaData.id)

      const [tutorialesRes, categoriasRes] = await Promise.all([
        supabase
          .from('tutoriales')
          .select('*, categorias(nombre)')
          .eq('empresa_id', empresaData.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('categorias')
          .select('*')
          .eq('empresa_id', empresaData.id)
          .order('nombre')
      ])

      if (tutorialesRes.error) throw tutorialesRes.error
      if (categoriasRes.error) throw categoriasRes.error

      setTutoriales(tutorialesRes.data || [])
      setCategorias(categoriasRes.data || [])
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

    if (!formData.categoria_id || !formData.titulo) {
      setError('Complete los campos obligatorios')
      return
    }

    if (!empresaId) {
      setError('No se pudo obtener la información de la empresa')
      return
    }

    try {
      const tutorialData = {
        empresa_id: empresaId,
        categoria_id: formData.categoria_id,
        titulo: formData.titulo,
        descripcion: formData.descripcion || null,
        video_url: formData.video_url || null,
        tips: formData.tips || null,
        activo: formData.activo,
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from('tutoriales')
          .update({ ...tutorialData, updated_at: new Date().toISOString() })
          .eq('id', editingId)

        if (updateError) throw updateError
        setSuccess('Tutorial actualizado exitosamente')
      } else {
        const { error: insertError } = await supabase
          .from('tutoriales')
          .insert([tutorialData])

        if (insertError) throw insertError
        setSuccess('Tutorial creado exitosamente')
      }

      resetForm()
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleEdit = (tutorial: Tutorial) => {
    setFormData({
      categoria_id: tutorial.categoria_id,
      titulo: tutorial.titulo,
      descripcion: tutorial.descripcion || '',
      video_url: tutorial.video_url || '',
      tips: tutorial.tips || '',
      activo: tutorial.activo,
    })
    setEditingId(tutorial.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este tutorial?')) return

    try {
      const { error } = await supabase
        .from('tutoriales')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSuccess('Tutorial eliminado exitosamente')
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      const { error } = await supabase
        .from('tutoriales')
        .update({ activo: !activo, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setSuccess(`Tutorial ${!activo ? 'activado' : 'desactivado'} exitosamente`)
      loadData()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      categoria_id: '',
      titulo: '',
      descripcion: '',
      video_url: '',
      tips: '',
      activo: true,
    })
    setEditingId(null)
    setShowForm(false)
  }

  const filteredTutoriales = tutoriales.filter((tutorial) => {
    const matchesSearch =
      tutorial.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tutorial.categorias?.nombre.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategoria = !categoriaFilter || tutorial.categoria_id === categoriaFilter

    return matchesSearch && matchesCategoria
  })

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <h1>Tutoriales de Instalación</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={20} />
          Nuevo Tutorial
        </button>
      </div>

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
        <div className="form-card" style={{ marginBottom: '2rem' }}>
          <h2>{editingId ? 'Editar Tutorial' : 'Nuevo Tutorial'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label>Categoría *</label>
                <select
                  value={formData.categoria_id}
                  onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                  required
                >
                  <option value="">Seleccione una categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Instalación de Malla Sombra"
                  required
                />
              </div>

              <div className="form-group">
                <label>URL del Video</label>
                <input
                  type="url"
                  value={formData.video_url}
                  onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción breve del tutorial"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Tips y Buenas Prácticas</label>
              <textarea
                value={formData.tips}
                onChange={(e) => setFormData({ ...formData, tips: e.target.value })}
                placeholder="Consejos para una correcta instalación..."
                rows={5}
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                Tutorial activo
              </label>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn-primary">
                {editingId ? 'Actualizar' : 'Crear'} Tutorial
              </button>
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search
            size={20}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}
          />
          <input
            type="text"
            placeholder="Buscar tutoriales..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '40px' }}
          />
        </div>

        <select
          value={categoriaFilter}
          onChange={(e) => setCategoriaFilter(e.target.value)}
          style={{ minWidth: '200px' }}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredTutoriales.map((tutorial) => (
          <div
            key={tutorial.id}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: `2px solid ${tutorial.activo ? '#e5e7eb' : '#fca5a5'}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: '600' }}>
                  {tutorial.titulo}
                </h3>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
                  {tutorial.categorias?.nombre}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {tutorial.activo ? (
                  <CheckCircle size={20} color="#16a34a" />
                ) : (
                  <XCircle size={20} color="#dc2626" />
                )}
              </div>
            </div>

            {tutorial.descripcion && (
              <p style={{ margin: '0 0 1rem 0', color: '#374151', fontSize: '0.9rem' }}>
                {tutorial.descripcion}
              </p>
            )}

            {tutorial.video_url && (
              <div style={{ marginBottom: '1rem' }}>
                <a
                  href={tutorial.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#2563eb',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                  }}
                >
                  <Video size={16} />
                  Ver video tutorial
                </a>
              </div>
            )}

            {tutorial.tips && (
              <div
                style={{
                  background: '#f0fdf4',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  marginBottom: '1rem',
                  border: '1px solid #bbf7d0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <FileText size={16} color="#16a34a" />
                  <strong style={{ fontSize: '0.875rem', color: '#16a34a' }}>Tips:</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#166534', whiteSpace: 'pre-wrap' }}>
                  {tutorial.tips}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={() => handleEdit(tutorial)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button
                onClick={() => toggleActivo(tutorial.id, tutorial.activo)}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: tutorial.activo ? '#f59e0b' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                {tutorial.activo ? 'Desactivar' : 'Activar'}
              </button>
              <button
                onClick={() => handleDelete(tutorial.id)}
                style={{
                  padding: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTutoriales.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Video size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p>No hay tutoriales disponibles</p>
        </div>
      )}
    </Layout>
  )
}
