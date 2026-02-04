import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Productos from './pages/Productos'
import Stock from './pages/Stock'
import Pedidos from './pages/Pedidos'
import Ventas from './pages/Ventas'
import NuevaVenta from './pages/NuevaVenta'
import Rutas from './pages/Rutas'
import Compras from './pages/Compras'
import Reportes from './pages/Reportes'
import Clientes from './pages/Clientes'
import Proveedores from './pages/Proveedores'
import Promociones from './pages/Promociones'
import Presupuestos from './pages/Presupuestos'
import NuevoPresupuesto from './pages/NuevoPresupuesto'
import Tutoriales from './pages/Tutoriales'
import Servicios from './pages/Servicios'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading-screen">Cargando...</div>
  }

  return user ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/productos"
            element={
              <PrivateRoute>
                <Productos />
              </PrivateRoute>
            }
          />
          <Route
            path="/stock"
            element={
              <PrivateRoute>
                <Stock />
              </PrivateRoute>
            }
          />
          <Route
            path="/pedidos"
            element={
              <PrivateRoute>
                <Pedidos />
              </PrivateRoute>
            }
          />
          <Route
            path="/ventas"
            element={
              <PrivateRoute>
                <Ventas />
              </PrivateRoute>
            }
          />
          <Route
            path="/nueva-venta"
            element={
              <PrivateRoute>
                <NuevaVenta />
              </PrivateRoute>
            }
          />
          <Route
            path="/rutas"
            element={
              <PrivateRoute>
                <Rutas />
              </PrivateRoute>
            }
          />
          <Route
            path="/compras"
            element={
              <PrivateRoute>
                <Compras />
              </PrivateRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <PrivateRoute>
                <Reportes />
              </PrivateRoute>
            }
          />
          <Route
            path="/clientes"
            element={
              <PrivateRoute>
                <Clientes />
              </PrivateRoute>
            }
          />
          <Route
            path="/proveedores"
            element={
              <PrivateRoute>
                <Proveedores />
              </PrivateRoute>
            }
          />
          <Route
            path="/promociones"
            element={
              <PrivateRoute>
                <Promociones />
              </PrivateRoute>
            }
          />
          <Route
            path="/presupuestos"
            element={
              <PrivateRoute>
                <Presupuestos />
              </PrivateRoute>
            }
          />
          <Route
            path="/nuevo-presupuesto"
            element={
              <PrivateRoute>
                <NuevoPresupuesto />
              </PrivateRoute>
            }
          />
          <Route
            path="/tutoriales"
            element={
              <PrivateRoute>
                <Tutoriales />
              </PrivateRoute>
            }
          />
          <Route
            path="/servicios"
            element={
              <PrivateRoute>
                <Servicios />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
