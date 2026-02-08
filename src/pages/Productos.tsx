import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Search, DollarSign, X, Check, ArrowUp, ArrowDown } from 'lucide-react'

interface Producto {
  id: string
  codigo_producto: string
  nombre: string
  subtipo: string
  descripcion: string
  categoria_id: string
  categoria?: { nombre: string }
  precio_compra: number
  precio_venta: number
  precio_compra_uyu?: number
  precio_venta_usd?: number
  precio_costo_m2?: number
  precio_venta_m2?: number
  altura_m?: number
  largo_m?: number
  separacion_cm?: number
  m2_rollo?: number
  imagen_url?: string
  creado_en: string
}

interface Categoria {
  id: string
  nombre: string
}

export default function Productos() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [cotizacionDolar, setCotizacionDolar] = useState<number | null>(null)
  const [showCotizacionModal, setShowCotizacionModal] = useState(false)
  const [nuevaCotizacion, setNuevaCotizacion] = useState('')
  const [editingInlineId, setEditingInlineId] = useState<string | null>(null)
  const [inlineFormData, setInlineFormData] = useState<any>({})
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [columnFilters, setColumnFilters] = useState({
    codigo: '',
    nombre: '',
    subtipo: '',
    altura: '',
    largo: '',
    separacion: '',
    precio_costo: '',
    precio_costo_m2: '',
    precio_venta: '',
    precio_venta_m2: ''
  })
  const [imagenFile, setImagenFile] = useState<File | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    codigo_producto: '',
    nombre: '',
    subtipo: '',
    descripcion: '',
    categoria_id: '',
    precio_compra: '',
    precio_venta: '',
    precio_compra_uyu: '',
    precio_venta_usd: '',
    precio_costo_m2: '',
    precio_venta_m2: '',
    altura_m: '',
    largo_m: '',
    separacion_cm: '',
    m2_rollo: '',
  })

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      console.log('Sesión actual:', session?.user?.email)

      const { data: empresaData } = await supabase
        .from('empresas')
        .select('id')
        .single()

      if (empresaData) {
        setEmpresaId(empresaData.id)
        fetchCotizacion(empresaData.id)
      }

      fetchProductos()
      fetchCategorias()
    }
    checkAuthAndFetch()
  }, [])

  const fetchCotizacion = async (empresaIdParam: string) => {
    try {
      const { data } = await supabase
        .from('cotizacion_dolar')
        .select('valor')
        .eq('empresa_id', empresaIdParam)
        .eq('fecha', new Date().toISOString().split('T')[0])
        .maybeSingle()

      if (data) {
        setCotizacionDolar(data.valor)
      } else {
        const { data: ultimaCotizacion } = await supabase
          .from('cotizacion_dolar')
          .select('valor')
          .eq('empresa_id', empresaIdParam)
          .lte('fecha', new Date().toISOString().split('T')[0])
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (ultimaCotizacion) {
          setCotizacionDolar(ultimaCotizacion.valor)
        }
      }
    } catch (error) {
      console.error('Error fetching cotizacion:', error)
    }
  }

  const fetchCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('id, nombre')
        .order('nombre')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error fetching categorias:', error)
    }
  }

  const fetchProductos = async () => {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(`
          *,
          categoria:categorias(nombre)
        `)
        .order('creado_en', { ascending: false })

      if (error) {
        console.error('Error fetching productos:', error)
        throw error
      }

      console.log('Productos cargados:', data?.length, data)
      setProductos(data || [])
    } catch (error) {
      console.error('Error en fetchProductos:', error)
      alert('Error al cargar productos: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const handlePrecioChange = (field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value)
    const newFormData = { ...formData, [field]: value }

    const altura = parseFloat(newFormData.altura_m) || 0
    const largo = parseFloat(newFormData.largo_m) || 0
    const m2Total = altura * largo

    if (cotizacionDolar) {
      if (field === 'precio_costo_m2' && numValue > 0 && altura > 0) {
        newFormData.precio_compra = (numValue * altura * 25).toFixed(2)
        newFormData.precio_compra_uyu = (numValue * altura * 25 * cotizacionDolar).toFixed(2)
      } else if (field === 'precio_compra' && numValue > 0) {
        newFormData.precio_compra_uyu = (numValue * cotizacionDolar).toFixed(2)
        if (altura > 0) {
          newFormData.precio_costo_m2 = (numValue / (altura * 25)).toFixed(2)
        }
      } else if (field === 'precio_compra_uyu' && numValue > 0) {
        newFormData.precio_compra = (numValue / cotizacionDolar).toFixed(2)
        if (altura > 0) {
          newFormData.precio_costo_m2 = (numValue / cotizacionDolar / (altura * 25)).toFixed(2)
        }
      } else if (field === 'precio_venta_m2' && numValue > 0 && m2Total > 0) {
        newFormData.precio_venta = (numValue * m2Total).toFixed(2)
        newFormData.precio_venta_usd = (numValue * m2Total / cotizacionDolar).toFixed(2)
      } else if (field === 'precio_venta' && numValue > 0) {
        newFormData.precio_venta_usd = (numValue / cotizacionDolar).toFixed(2)
        if (m2Total > 0) {
          newFormData.precio_venta_m2 = (numValue / m2Total).toFixed(2)
        }
      } else if (field === 'precio_venta_usd' && numValue > 0) {
        newFormData.precio_venta = (numValue * cotizacionDolar).toFixed(2)
        if (m2Total > 0) {
          newFormData.precio_venta_m2 = (numValue * cotizacionDolar / m2Total).toFixed(2)
        }
      }
    }

    setFormData(newFormData)
  }

  const handleDimensionChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value }

    const altura = parseFloat(field === 'altura_m' ? value : formData.altura_m) || 0
    const largo = parseFloat(field === 'largo_m' ? value : formData.largo_m) || 0
    const m2Total = altura * largo

    if (cotizacionDolar) {
      const precioCostoM2 = parseFloat(formData.precio_costo_m2) || 0
      const precioVentaM2 = parseFloat(formData.precio_venta_m2) || 0

      if (precioCostoM2 > 0 && altura > 0) {
        newFormData.precio_compra = (precioCostoM2 * altura * 25).toFixed(2)
        newFormData.precio_compra_uyu = (precioCostoM2 * altura * 25 * cotizacionDolar).toFixed(2)
      }

      if (precioVentaM2 > 0 && m2Total > 0) {
        newFormData.precio_venta = (precioVentaM2 * m2Total).toFixed(2)
        newFormData.precio_venta_usd = (precioVentaM2 * m2Total / cotizacionDolar).toFixed(2)
      }
    }

    setFormData(newFormData)
  }

  const guardarCotizacion = async () => {
    if (!empresaId || !nuevaCotizacion) return

    try {
      const { error } = await supabase
        .from('cotizacion_dolar')
        .upsert({
          empresa_id: empresaId,
          fecha: new Date().toISOString().split('T')[0],
          valor: parseFloat(nuevaCotizacion)
        }, {
          onConflict: 'fecha,empresa_id'
        })

      if (error) throw error

      setCotizacionDolar(parseFloat(nuevaCotizacion))
      setShowCotizacionModal(false)
      setNuevaCotizacion('')
      alert('Cotización guardada correctamente')
    } catch (error: any) {
      alert('Error al guardar cotización: ' + error.message)
    }
  }

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5242880) {
        alert('La imagen no puede superar 5MB')
        return
      }
      setImagenFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagenPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImagen = async (file: File, productoId: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${productoId}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('producto-imagenes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('producto-imagenes')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error: any) {
      console.error('Error al subir imagen:', error)
      alert('Error al subir la imagen: ' + error.message)
      return null
    }
  }

  const handleEdit = (producto: Producto) => {
    setEditingId(producto.id)

    const altura = producto.altura_m || 0
    const largo = producto.largo_m || 0
    const m2Total = altura * largo
    const precioCostoM2 = producto.precio_costo_m2 || 0
    const precioVentaM2 = producto.precio_venta_m2 || 0

    let precioCostoUSD = ''
    let precioCostoUYU = ''
    let precioVentaUYU = ''
    let precioVentaUSD = ''

    if (cotizacionDolar) {
      if (precioCostoM2 > 0 && altura > 0) {
        precioCostoUSD = (precioCostoM2 * altura * 25).toFixed(2)
        precioCostoUYU = (precioCostoM2 * altura * 25 * cotizacionDolar).toFixed(2)
      }

      if (precioVentaM2 > 0 && m2Total > 0) {
        precioVentaUYU = (precioVentaM2 * m2Total).toFixed(2)
        precioVentaUSD = (precioVentaM2 * m2Total / cotizacionDolar).toFixed(2)
      }
    }

    setFormData({
      codigo_producto: producto.codigo_producto,
      nombre: producto.nombre,
      subtipo: producto.subtipo || '',
      descripcion: producto.descripcion || '',
      categoria_id: producto.categoria_id,
      precio_compra: precioCostoUSD || producto.precio_compra.toString(),
      precio_venta: precioVentaUYU || producto.precio_venta.toString(),
      precio_compra_uyu: precioCostoUYU || producto.precio_compra_uyu?.toString() || '',
      precio_venta_usd: precioVentaUSD || producto.precio_venta_usd?.toString() || '',
      precio_costo_m2: producto.precio_costo_m2?.toString() || '',
      precio_venta_m2: producto.precio_venta_m2?.toString() || '',
      altura_m: producto.altura_m?.toString() || '',
      largo_m: producto.largo_m?.toString() || '',
      separacion_cm: producto.separacion_cm?.toString() || '',
      m2_rollo: producto.m2_rollo?.toString() || '',
    })
    setImagenPreview(producto.imagen_url || null)
    setImagenFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return

    try {
      const dataToSave = {
        ...formData,
        empresa_id: empresaId,
        precio_compra: parseFloat(formData.precio_compra) || 0,
        precio_venta: parseFloat(formData.precio_venta) || 0,
        precio_compra_uyu: formData.precio_compra_uyu ? parseFloat(formData.precio_compra_uyu) : null,
        precio_venta_usd: formData.precio_venta_usd ? parseFloat(formData.precio_venta_usd) : null,
        precio_costo_m2: formData.precio_costo_m2 ? parseFloat(formData.precio_costo_m2) : null,
        precio_venta_m2: formData.precio_venta_m2 ? parseFloat(formData.precio_venta_m2) : null,
        altura_m: formData.altura_m ? parseFloat(formData.altura_m) : null,
        largo_m: formData.largo_m ? parseFloat(formData.largo_m) : null,
        separacion_cm: formData.separacion_cm ? parseFloat(formData.separacion_cm) : null,
        m2_rollo: formData.m2_rollo ? parseFloat(formData.m2_rollo) : null,
      }

      let productoId = editingId

      if (editingId) {
        const { error } = await supabase
          .from('productos')
          .update(dataToSave)
          .eq('id', editingId)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('productos')
          .insert([dataToSave])
          .select()
          .single()

        if (error) throw error
        productoId = data.id
      }

      if (imagenFile && productoId) {
        const imagenUrl = await uploadImagen(imagenFile, productoId)
        if (imagenUrl) {
          const { error: updateError } = await supabase
            .from('productos')
            .update({ imagen_url: imagenUrl })
            .eq('id', productoId)

          if (updateError) throw updateError
        }
      }

      fetchProductos()
      setShowForm(false)
      resetForm()
      alert(editingId ? 'Producto actualizado' : 'Producto creado')
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
      codigo_producto: '',
      nombre: '',
      subtipo: '',
      descripcion: '',
      categoria_id: '',
      precio_compra: '',
      precio_venta: '',
      precio_compra_uyu: '',
      precio_venta_usd: '',
      precio_costo_m2: '',
      precio_venta_m2: '',
      altura_m: '',
      largo_m: '',
      separacion_cm: '',
      m2_rollo: '',
    })
    setEditingId(null)
    setImagenFile(null)
    setImagenPreview(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return

    try {
      const { error } = await supabase
        .from('productos')
        .delete()
        .eq('id', id)

      if (error) throw error
      fetchProductos()
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleInlineEdit = (producto: Producto) => {
    setEditingInlineId(producto.id)
    setInlineFormData({
      codigo_producto: producto.codigo_producto,
      nombre: producto.nombre,
      subtipo: producto.subtipo || '',
      altura_m: producto.altura_m?.toString() || '',
      largo_m: producto.largo_m?.toString() || '',
      separacion_cm: producto.separacion_cm?.toString() || '',
      precio_costo_m2: producto.precio_costo_m2?.toString() || '',
      precio_venta: producto.precio_venta.toString(),
      precio_venta_m2: producto.precio_venta_m2?.toString() || '',
    })
  }

  const handleInlineSave = async () => {
    if (!editingInlineId) return

    try {
      const dataToSave = {
        codigo_producto: inlineFormData.codigo_producto,
        nombre: inlineFormData.nombre,
        subtipo: inlineFormData.subtipo,
        altura_m: inlineFormData.altura_m ? parseFloat(inlineFormData.altura_m) : null,
        largo_m: inlineFormData.largo_m ? parseFloat(inlineFormData.largo_m) : null,
        separacion_cm: inlineFormData.separacion_cm ? parseFloat(inlineFormData.separacion_cm) : null,
        precio_costo_m2: inlineFormData.precio_costo_m2 ? parseFloat(inlineFormData.precio_costo_m2) : null,
        precio_venta: parseFloat(inlineFormData.precio_venta) || 0,
        precio_venta_m2: inlineFormData.precio_venta_m2 ? parseFloat(inlineFormData.precio_venta_m2) : null,
      }

      const { error } = await supabase
        .from('productos')
        .update(dataToSave)
        .eq('id', editingInlineId)

      if (error) throw error

      fetchProductos()
      setEditingInlineId(null)
      setInlineFormData({})
    } catch (error: any) {
      alert('Error: ' + error.message)
    }
  }

  const handleInlineCancel = () => {
    setEditingInlineId(null)
    setInlineFormData({})
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const productosFiltrados = productos.filter((producto) => {
    const searchLower = searchTerm.toLowerCase()
    const matchesGlobalSearch = (
      (producto.codigo_producto?.toLowerCase() || '').includes(searchLower) ||
      (producto.nombre?.toLowerCase() || '').includes(searchLower) ||
      (producto.subtipo?.toLowerCase() || '').includes(searchLower) ||
      (producto.categoria?.nombre?.toLowerCase() || '').includes(searchLower)
    )

    const matchesColumnFilters = (
      (producto.codigo_producto?.toLowerCase() || '').includes(columnFilters.codigo.toLowerCase()) &&
      (
        (producto.nombre?.toLowerCase() || '').includes(columnFilters.nombre.toLowerCase()) ||
        (producto.subtipo?.toLowerCase() || '').includes(columnFilters.nombre.toLowerCase())
      ) &&
      (columnFilters.altura === '' || (producto.altura_m?.toString() || '').includes(columnFilters.altura)) &&
      (columnFilters.largo === '' || (producto.largo_m?.toString() || '').includes(columnFilters.largo)) &&
      (columnFilters.separacion === '' || (producto.separacion_cm?.toString() || '').includes(columnFilters.separacion)) &&
      (columnFilters.precio_costo_m2 === '' || (producto.precio_costo_m2?.toString() || '').includes(columnFilters.precio_costo_m2)) &&
      (columnFilters.precio_venta === '' || (producto.precio_venta?.toString() || '').includes(columnFilters.precio_venta)) &&
      (columnFilters.precio_venta_m2 === '' || (producto.precio_venta_m2?.toString() || '').includes(columnFilters.precio_venta_m2))
    )

    return matchesGlobalSearch && matchesColumnFilters
  }).sort((a, b) => {
    if (!sortColumn) return 0

    let aValue: any
    let bValue: any

    switch (sortColumn) {
      case 'codigo':
        aValue = a.codigo_producto
        bValue = b.codigo_producto
        break
      case 'nombre':
        aValue = a.nombre
        bValue = b.nombre
        break
      case 'altura':
        aValue = a.altura_m || 0
        bValue = b.altura_m || 0
        break
      case 'largo':
        aValue = a.largo_m || 0
        bValue = b.largo_m || 0
        break
      case 'separacion':
        aValue = a.separacion_cm || 0
        bValue = b.separacion_cm || 0
        break
      case 'precio_costo':
        aValue = (a.altura_m && a.precio_costo_m2)
          ? a.altura_m * 25 * a.precio_costo_m2
          : 0
        bValue = (b.altura_m && b.precio_costo_m2)
          ? b.altura_m * 25 * b.precio_costo_m2
          : 0
        break
      case 'precio_costo_m2':
        aValue = a.precio_costo_m2 || 0
        bValue = b.precio_costo_m2 || 0
        break
      case 'precio_venta':
        aValue = a.precio_venta || 0
        bValue = b.precio_venta || 0
        break
      case 'precio_venta_m2':
        aValue = a.precio_venta_m2 || 0
        bValue = b.precio_venta_m2 || 0
        break
      default:
        return 0
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    return sortDirection === 'asc'
      ? aValue - bValue
      : bValue - aValue
  })

  if (loading) return <Layout><div style={{ padding: '24px' }}>Cargando productos...</div></Layout>

  console.log('Renderizando con productos:', productos.length)

  return (
    <Layout>
      <div style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937' }}>
              Productos ({productosFiltrados.length})
            </h1>
            {cotizacionDolar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', color: '#6b7280' }}>
                <DollarSign size={16} />
                <span>Cotización: ${cotizacionDolar.toFixed(2)}</span>
                <button
                  onClick={() => setShowCotizacionModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontSize: '14px'
                  }}
                >
                  Actualizar
                </button>
              </div>
            )}
            {!cotizacionDolar && (
              <button
                onClick={() => setShowCotizacionModal(true)}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Configurar cotización del dólar
              </button>
            )}
          </div>
          <button
            onClick={() => {
              resetForm()
              setShowForm(true)
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <Plus size={20} />
            Nuevo Producto
          </button>
        </div>

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
                <th
                  onClick={() => handleSort('codigo')}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Código
                    {sortColumn === 'codigo' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombre')}
                  style={{
                    padding: '16px',
                    textAlign: 'left',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Producto
                    {sortColumn === 'nombre' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('altura')}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Altura (m)
                    {sortColumn === 'altura' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('largo')}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Largo (m)
                    {sortColumn === 'largo' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('separacion')}
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    Separación (cm)
                    {sortColumn === 'separacion' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precio_costo')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Precio Costo
                    {sortColumn === 'precio_costo' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precio_costo_m2')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Precio Costo m²
                    {sortColumn === 'precio_costo_m2' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precio_venta')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Precio Venta
                    {sortColumn === 'precio_venta' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('precio_venta_m2')}
                  style={{
                    padding: '16px',
                    textAlign: 'right',
                    fontWeight: '600',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                    Precio Venta m²
                    {sortColumn === 'precio_venta_m2' && (
                      sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />
                    )}
                  </div>
                </th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: '600' }}>Acciones</th>
              </tr>
              <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.codigo}
                    onChange={(e) => setColumnFilters({...columnFilters, codigo: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.nombre}
                    onChange={(e) => setColumnFilters({...columnFilters, nombre: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.altura}
                    onChange={(e) => setColumnFilters({...columnFilters, altura: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.largo}
                    onChange={(e) => setColumnFilters({...columnFilters, largo: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.separacion}
                    onChange={(e) => setColumnFilters({...columnFilters, separacion: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'center'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.precio_costo_m2}
                    onChange={(e) => setColumnFilters({...columnFilters, precio_costo_m2: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'right'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.precio_venta}
                    onChange={(e) => setColumnFilters({...columnFilters, precio_venta: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'right'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                  <input
                    type="text"
                    placeholder="Filtrar..."
                    value={columnFilters.precio_venta_m2}
                    onChange={(e) => setColumnFilters({...columnFilters, precio_venta_m2: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '6px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '13px',
                      textAlign: 'right'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                </th>
                <th style={{ padding: '8px' }}>
                </th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((producto) => {
                const isEditingInline = editingInlineId === producto.id
                return (
                  <tr
                    key={producto.id}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      background: isEditingInline ? '#f0f9ff' : 'transparent',
                      cursor: isEditingInline ? 'default' : 'pointer'
                    }}
                    onDoubleClick={() => !isEditingInline && handleInlineEdit(producto)}
                    title={!isEditingInline ? 'Doble clic para editar' : ''}
                  >
                    <td style={{ padding: '8px' }}>
                      {isEditingInline ? (
                        <input
                          type="text"
                          value={inlineFormData.codigo_producto}
                          onChange={(e) => setInlineFormData({...inlineFormData, codigo_producto: e.target.value})}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px'
                          }}
                        />
                      ) : (
                        producto.codigo_producto
                      )}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {isEditingInline ? (
                        <>
                          <input
                            type="text"
                            value={inlineFormData.nombre}
                            onChange={(e) => setInlineFormData({...inlineFormData, nombre: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              fontSize: '14px',
                              marginBottom: '4px'
                            }}
                            placeholder="Nombre"
                          />
                          <input
                            type="text"
                            value={inlineFormData.subtipo}
                            onChange={(e) => setInlineFormData({...inlineFormData, subtipo: e.target.value})}
                            style={{
                              width: '100%',
                              padding: '6px',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                            placeholder="Subtipo"
                          />
                        </>
                      ) : (
                        <>
                          <div style={{ fontWeight: '600' }}>{producto.nombre}</div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>{producto.subtipo}</div>
                        </>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.altura_m}
                          onChange={(e) => setInlineFormData({...inlineFormData, altura_m: e.target.value})}
                          style={{
                            width: '80px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                      ) : (
                        producto.altura_m ? producto.altura_m : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.largo_m}
                          onChange={(e) => setInlineFormData({...inlineFormData, largo_m: e.target.value})}
                          style={{
                            width: '80px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                      ) : (
                        producto.largo_m ? producto.largo_m : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.separacion_cm}
                          onChange={(e) => setInlineFormData({...inlineFormData, separacion_cm: e.target.value})}
                          style={{
                            width: '80px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                      ) : (
                        producto.separacion_cm ? producto.separacion_cm : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {isEditingInline ? (
                        inlineFormData.altura_m && inlineFormData.precio_costo_m2
                          ? `US$${(parseFloat(inlineFormData.altura_m) * 25 * parseFloat(inlineFormData.precio_costo_m2)).toFixed(2)}`
                          : '-'
                      ) : (
                        producto.altura_m && producto.precio_costo_m2
                          ? `US$${(producto.altura_m * 25 * producto.precio_costo_m2).toFixed(2)}`
                          : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.precio_costo_m2}
                          onChange={(e) => setInlineFormData({...inlineFormData, precio_costo_m2: e.target.value})}
                          style={{
                            width: '100px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'right'
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        producto.precio_costo_m2 ? `US$${Number(producto.precio_costo_m2).toFixed(2)}` : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.precio_venta}
                          onChange={(e) => setInlineFormData({...inlineFormData, precio_venta: e.target.value})}
                          style={{
                            width: '100px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'right'
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        `$U${Number(producto.precio_venta || 0).toLocaleString()}`
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      {isEditingInline ? (
                        <input
                          type="number"
                          step="0.01"
                          value={inlineFormData.precio_venta_m2}
                          onChange={(e) => setInlineFormData({...inlineFormData, precio_venta_m2: e.target.value})}
                          style={{
                            width: '100px',
                            padding: '6px',
                            border: '1px solid #3b82f6',
                            borderRadius: '4px',
                            fontSize: '14px',
                            textAlign: 'right'
                          }}
                          placeholder="0.00"
                        />
                      ) : (
                        producto.precio_venta_m2 ? `$U${Number(producto.precio_venta_m2).toFixed(2)}` : '-'
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {isEditingInline ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={handleInlineSave}
                            style={{ padding: '8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Guardar"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={handleInlineCancel}
                            style={{ padding: '8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Cancelar"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEdit(producto)}
                            style={{ padding: '8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Editar en modal"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(producto.id)}
                            style={{ padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {productosFiltrados.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {searchTerm ? 'No se encontraron productos' : 'No hay productos registrados'}
            </div>
          )}
        </div>

        {showCotizacionModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
                Cotización del Dólar
              </h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Valor en Pesos Uruguayos
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={nuevaCotizacion}
                  onChange={(e) => setNuevaCotizacion(e.target.value)}
                  placeholder="Ej: 40.50"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => {
                    setShowCotizacionModal(false)
                    setNuevaCotizacion('')
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#e5e7eb',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarCotizacion}
                  style={{
                    padding: '10px 20px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {showForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflowY: 'auto',
            padding: '20px'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
                  {editingId ? 'Editar Producto' : 'Nuevo Producto'}
                </h2>
                <button
                  onClick={() => {
                    setShowForm(false)
                    resetForm()
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Código *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.codigo_producto}
                      onChange={(e) => setFormData({ ...formData, codigo_producto: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Seleccionar categoría</option>
                      {categorias.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Subtipo
                    </label>
                    <input
                      type="text"
                      value={formData.subtipo}
                      onChange={(e) => setFormData({ ...formData, subtipo: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Descripción
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                      Imagen del Producto
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImagenChange}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                    {imagenPreview && (
                      <div style={{ marginTop: '12px', textAlign: 'center' }}>
                        <img
                          src={imagenPreview}
                          alt="Preview"
                          style={{
                            maxWidth: '200px',
                            maxHeight: '200px',
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagenFile(null)
                            setImagenPreview(null)
                          }}
                          style={{
                            display: 'block',
                            margin: '8px auto 0',
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer'
                          }}
                        >
                          Eliminar imagen
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                      Precios
                    </h3>
                    {!cotizacionDolar && (
                      <div style={{
                        padding: '12px',
                        background: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        fontSize: '14px'
                      }}>
                        Configure la cotización del dólar para cálculos automáticos
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Costo m² (USD) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.precio_costo_m2}
                          onChange={(e) => handlePrecioChange('precio_costo_m2', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Costo (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_compra}
                          onChange={(e) => handlePrecioChange('precio_compra', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#f9fafb'
                          }}
                          readOnly
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Costo (UYU)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_compra_uyu}
                          onChange={(e) => handlePrecioChange('precio_compra_uyu', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#f9fafb'
                          }}
                          readOnly
                          disabled={!cotizacionDolar}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Venta m² (UYU) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.precio_venta_m2}
                          onChange={(e) => handlePrecioChange('precio_venta_m2', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Venta (UYU)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_venta}
                          onChange={(e) => handlePrecioChange('precio_venta', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#f9fafb'
                          }}
                          readOnly
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Precio Venta (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.precio_venta_usd}
                          onChange={(e) => handlePrecioChange('precio_venta_usd', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px',
                            background: '#f9fafb'
                          }}
                          readOnly
                          disabled={!cotizacionDolar}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#1f2937' }}>
                      Dimensiones
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Altura (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.altura_m}
                          onChange={(e) => handleDimensionChange('altura_m', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Largo (m)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.largo_m}
                          onChange={(e) => handleDimensionChange('largo_m', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          Separación (cm)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.separacion_cm}
                          onChange={(e) => setFormData({ ...formData, separacion_cm: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                          m² por Rollo
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.m2_rollo}
                          onChange={(e) => setFormData({ ...formData, m2_rollo: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      resetForm()
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#e5e7eb',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      background: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {editingId ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
