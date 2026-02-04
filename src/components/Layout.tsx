import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Package, ShoppingCart, BarChart3, Users, Truck, DollarSign, Menu, X, Navigation, Tag, FileText, ClipboardList } from 'lucide-react'
import '../styles/layout.css'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="layout">
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <Package size={28} />
          <span>TejidosApp</span>
        </div>

        <nav className="sidebar-nav">
          <Link
            to="/dashboard"
            className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/productos"
            className={`nav-item ${isActive('/productos') ? 'active' : ''}`}
          >
            <Package size={20} />
            <span>Productos</span>
          </Link>

          <Link
            to="/stock"
            className={`nav-item ${isActive('/stock') ? 'active' : ''}`}
          >
            <Package size={20} />
            <span>Stock</span>
          </Link>

          <Link
            to="/pedidos"
            className={`nav-item ${isActive('/pedidos') ? 'active' : ''}`}
          >
            <ClipboardList size={20} />
            <span>Pedidos</span>
          </Link>

          <Link
            to="/ventas"
            className={`nav-item ${isActive('/ventas') ? 'active' : ''}`}
          >
            <DollarSign size={20} />
            <span>Ventas</span>
          </Link>

          <Link
            to="/promociones"
            className={`nav-item ${isActive('/promociones') ? 'active' : ''}`}
          >
            <Tag size={20} />
            <span>Promociones</span>
          </Link>

          <Link
            to="/presupuestos"
            className={`nav-item ${isActive('/presupuestos') ? 'active' : ''}`}
          >
            <FileText size={20} />
            <span>Presupuestos</span>
          </Link>

          <Link
            to="/rutas"
            className={`nav-item ${isActive('/rutas') ? 'active' : ''}`}
          >
            <Navigation size={20} />
            <span>Rutas</span>
          </Link>

          <Link
            to="/compras"
            className={`nav-item ${isActive('/compras') ? 'active' : ''}`}
          >
            <ShoppingCart size={20} />
            <span>Compras</span>
          </Link>

          <Link
            to="/clientes"
            className={`nav-item ${isActive('/clientes') ? 'active' : ''}`}
          >
            <Users size={20} />
            <span>Clientes</span>
          </Link>

          <Link
            to="/proveedores"
            className={`nav-item ${isActive('/proveedores') ? 'active' : ''}`}
          >
            <Truck size={20} />
            <span>Proveedores</span>
          </Link>

          <Link
            to="/reportes"
            className={`nav-item ${isActive('/reportes') ? 'active' : ''}`}
          >
            <BarChart3 size={20} />
            <span>Reportes</span>
          </Link>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}
