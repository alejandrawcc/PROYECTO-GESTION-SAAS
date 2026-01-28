import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';

// Estilos de Mantine
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

// Importación de componentes
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Registrar } from './pages/Registrar';
import { SetupEmpresa } from './pages/SetupEmpresa';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { MainLayout } from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Clientes from './pages/Clientes'; 
import Perfil from './pages/Perfil'; 
import Suscripcion from './pages/Suscripcion'; 
import GestionProductos from './pages/GestionProductos';
import PortalMicroempresa from './pages/PortalMicroempresa';
import HistorialPedidos from './pages/HistorialPedidos';
import GestionProveedores from './pages/GestionProveedores';
import GestionCompras from './pages/GestionCompras';
import GestionVentas from './pages/GestionVentas';
import Ventas from './pages/Ventas';

import { getCurrentUser } from './services/auth';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
});

// Componente de Ruta Protegida
const PrivateRoute = ({ children, requiredRoles = [] }) => {
  const user = getCurrentUser();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
};

// Componente de Ruta Pública
const PublicRoute = ({ children }) => {
  const user = getCurrentUser();
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" zIndex={2000} />
      <BrowserRouter>
        <Routes>
          {/* --- RUTAS PÚBLICAS --- */}
          <Route path="/" element={<Home />} />
          
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />

          <Route path="/registrar" element={
            <PublicRoute>
              <Registrar />
            </PublicRoute>
          } />

          <Route path="/forgot-password" element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          } />

          <Route path="/reset-password/:token" element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          } />

          {/* --- RUTAS PROTEGIDAS --- */}
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/gestion-productos" element={
            <PrivateRoute requiredRoles={['super_admin', 'administrador']}>
              <GestionProductos />
            </PrivateRoute>
          } />

          <Route path="/portal/:microempresaId" element={
            <PortalMicroempresa />
          } />

          <Route path="/clientes" element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          } />
          <Route path="/mis-pedidos" element={<HistorialPedidos />} />

          <Route path="/setup-empresa" element={
            <PrivateRoute>
              <SetupEmpresa />
            </PrivateRoute>
          } />

          <Route path="/usuarios" element={
            <PrivateRoute requiredRoles={['super_admin', 'administrador', 'microempresa_P']}>
              <Usuarios />
            </PrivateRoute>
          } />

          <Route path="/perfil" element={
            <PrivateRoute>
              <Perfil />
            </PrivateRoute>
          } />

          <Route path="/configuracion" element={
            <PrivateRoute requiredRoles={['super_admin', 'administrador']}>
              <Perfil />
            </PrivateRoute>
          } />

          <Route path="/gestion-proveedores" element={
              <PrivateRoute requiredRoles={['super_admin', 'administrador']}>
                  <GestionProveedores />
              </PrivateRoute>
          } />

          <Route path="/gestion-compras" element={
              <PrivateRoute requiredRoles={['super_admin', 'administrador']}>
                  <GestionCompras />
              </PrivateRoute>
          } />

          <Route path="/suscripcion" element={
            <PrivateRoute requiredRoles={['super_admin', 'administrador']}>
              <Suscripcion />
            </PrivateRoute>
          } />

          <Route path="/inventario" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />

          <Route path="/ventas" element={
              <PrivateRoute requiredRoles={['vendedor', 'administrador']}>
                  <Ventas />
              </PrivateRoute>
          } />

          <Route path="/gestion-ventas" element={
              <PrivateRoute requiredRoles={['administrador', 'super_admin']}>
                  <GestionVentas />
              </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;