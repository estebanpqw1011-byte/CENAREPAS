import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './features/landing/pages/LandingPage';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ForgotPassword from './features/auth/pages/ForgotPassword';
import AdminLayout from './features/admin/layout/AdminLayout';

import DashboardPage from './features/dashboard/pages/DashboardPage';
import ProfilePage from './features/profile/pages/ProfilePage';
import UsuariosPage from './features/usuarios/pages/UsuariosPage';
import RolesPage from './features/roles/pages/RolesPage';
import ProveedoresPage from './features/proveedores/pages/ProveedoresPage';
import ClientesPage from './features/clientes/pages/ClientesPage';
import ComprasPage from './features/compras/pages/ComprasPage';
import CategoriasPage from './features/categorias/pages/CategoriasPage';
import FichasTecnicasPage from './features/fichas-tecnicas/pages/FichasTecnicasPage';
import InsumosPage from './features/insumos/pages/InsumosPage';
import ProduccionPage from './features/produccion/pages/ProduccionPage';
import ProductosPage from './features/productos/pages/ProductosPage';
import PedidosPage from './features/pedidos/pages/PedidosPage';
import VentasPage from './features/ventas/pages/VentasPage';
import ConfiguracionPage from './features/configuracion/pages/ConfiguracionPage';
import NotFoundPage from './features/error/pages/NotFoundPage';

// Portal del Cliente
import ClienteLayout from './features/cliente/layout/ClienteLayout';
import { ClienteCartProvider } from './features/cliente/context/ClienteCartContext';
import { ClienteNotificationProvider } from './features/cliente/context/ClienteNotificationContext';
import ClienteInicioPage from './features/cliente/pages/ClienteInicioPage';
import ClienteCatalogoPage from './features/cliente/pages/ClienteCatalogoPage';
import ClienteCarritoPage from './features/cliente/pages/ClienteCarritoPage';
import ClienteCheckoutPage from './features/cliente/pages/ClienteCheckoutPage';
import ClientePedidosPage from './features/cliente/pages/ClientePedidosPage';
import ClientePedidoDetallePage from './features/cliente/pages/ClientePedidoDetallePage';
import ClienteCreditosPage from './features/cliente/pages/ClienteCreditosPage';
import ClienteNotificacionesPage from './features/cliente/pages/ClienteNotificacionesPage';
import ClientePerfilPage from './features/cliente/pages/ClientePerfilPage';

import { usePermissions } from './shared/contexts/PermissionContext';
import { getDefaultRouteForRole } from './shared/config/permisos';

function getSessionInfo() {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const rolName = String(user?.rol || '').toLowerCase().trim();
    const isCliente = rolName === 'cliente';
    return { token, user, rolName, isCliente, isAuthenticated: !!(token && user) };
  } catch {
    return { token: null, user: null, rolName: '', isCliente: false, isAuthenticated: false };
  }
}

function ProtectedModule({ modulo, children }) {
  const { can, defaultRoute } = usePermissions();
  if (can(modulo, 'ver')) {
    return children;
  }
  const safeTarget = defaultRoute && defaultRoute !== '/admin' ? defaultRoute : '/admin/profile';
  return <Navigate to={safeTarget} replace />;
}

function AdminIndexRoute() {
  const { can, defaultRoute } = usePermissions();
  if (can('dashboard', 'ver')) {
    return <DashboardPage />;
  }
  const safeTarget = defaultRoute && defaultRoute !== '/admin' ? defaultRoute : '/admin/pedidos';
  return <Navigate to={safeTarget} replace />;
}

// Guardián para el área administrativa: bloquea clientes y usuarios sin sesión
function AdminRouteGuard({ children }) {
  const { isAuthenticated, isCliente } = getSessionInfo();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Un cliente intentando acceder al panel administrativo es redirigido a su inicio
  if (isCliente) {
    return <Navigate to="/cliente" replace />;
  }

  return children;
}

// Guardián para el portal del cliente: bloquea empleados y usuarios sin sesión
function ClienteRouteGuard({ onLogout }) {
  const { isAuthenticated, isCliente, rolName, user } = getSessionInfo();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Un empleado intentando acceder al layout del cliente es redirigido a su panel
  if (!isCliente) {
    const defaultRoute = getDefaultRouteForRole(rolName);
    return <Navigate to={defaultRoute} replace />;
  }

  return (
    <ClienteCartProvider>
      {/* Sin ficha (fila en cliente) /mi/notificaciones responde 403: no se consulta. */}
      <ClienteNotificationProvider activo={Boolean(user?.id_cliente)}>
        <ClienteLayout onLogout={onLogout} />
      </ClienteNotificationProvider>
    </ClienteCartProvider>
  );
}

// Redireccionador según rol para accesos directos
function ShortcutRedirect({ staffTarget, clienteTarget = '/cliente' }) {
  const { isAuthenticated, isCliente, rolName } = getSessionInfo();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (isCliente) return <Navigate to={clienteTarget} replace />;
  return <Navigate to={staffTarget || getDefaultRouteForRole(rolName)} replace />;
}

export function AppRoutes({ isAuthenticated, setIsAuthenticated }) {
  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('cenarepas_role_id');
    } catch {}
    setIsAuthenticated(false);
  };

  return (
    <Routes>
      {/* ─── Rutas Públicas ─── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Navigate to="/admin/login" replace />} />
      <Route
        path="/admin/login"
        element={<Login onLogin={() => setIsAuthenticated(true)} />}
      />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword />} />

      {/* ─── Atajos de navegación directa protegidos por rol ─── */}
      <Route path="/dashboard" element={<ShortcutRedirect staffTarget="/admin" />} />
      <Route path="/usuarios" element={<ShortcutRedirect staffTarget="/admin/usuarios" />} />
      <Route path="/roles" element={<ShortcutRedirect staffTarget="/admin/roles" />} />
      <Route path="/clientes" element={<ShortcutRedirect staffTarget="/admin/clientes" />} />
      <Route path="/pedidos" element={<ShortcutRedirect staffTarget="/admin/pedidos" clienteTarget="/cliente/pedidos" />} />
      <Route path="/ventas" element={<ShortcutRedirect staffTarget="/admin/ventas" clienteTarget="/cliente/pedidos" />} />
      <Route path="/compras" element={<ShortcutRedirect staffTarget="/admin/compras" />} />
      <Route path="/productos" element={<ShortcutRedirect staffTarget="/admin/productos" clienteTarget="/cliente/catalogo" />} />
      <Route path="/categorias" element={<ShortcutRedirect staffTarget="/admin/categorias" clienteTarget="/cliente/catalogo" />} />
      <Route path="/catalogo" element={<ShortcutRedirect staffTarget="/admin/productos" clienteTarget="/cliente/catalogo" />} />
      <Route path="/carrito" element={<ShortcutRedirect staffTarget="/admin/pedidos" clienteTarget="/cliente/carrito" />} />

      {/* ─── Portal del Cliente (Solo rol Cliente) ─── */}
      <Route
        path="/cliente"
        element={<ClienteRouteGuard onLogout={handleLogout} />}
      >
        <Route index element={<ClienteInicioPage />} />
        <Route path="catalogo" element={<ClienteCatalogoPage />} />
        <Route path="carrito" element={<ClienteCarritoPage />} />
        <Route path="checkout" element={<ClienteCheckoutPage />} />
        <Route path="pedidos" element={<ClientePedidosPage />} />
        <Route path="pedidos/:id" element={<ClientePedidoDetallePage />} />
        <Route path="creditos" element={<ClienteCreditosPage />} />
        <Route path="notificaciones" element={<ClienteNotificacionesPage />} />
        <Route path="perfil" element={<ClientePerfilPage />} />
      </Route>

      {/* ─── Panel Administrativo (Solo Empleados / Admin / Secretaria / Vendedor) ─── */}
      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AdminLayout onLogout={handleLogout} />
          </AdminRouteGuard>
        }
      >
        <Route index element={<AdminIndexRoute />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="configuracion" element={<ProtectedModule modulo="configuracion"><ConfiguracionPage /></ProtectedModule>} />
        <Route path="usuarios" element={<ProtectedModule modulo="usuarios"><UsuariosPage /></ProtectedModule>} />
        <Route path="roles" element={<ProtectedModule modulo="roles"><RolesPage /></ProtectedModule>} />
        <Route path="proveedores" element={<ProtectedModule modulo="proveedores"><ProveedoresPage /></ProtectedModule>} />
        <Route path="compras" element={<ProtectedModule modulo="compras"><ComprasPage /></ProtectedModule>} />
        <Route path="categorias" element={<ProtectedModule modulo="categorias"><CategoriasPage /></ProtectedModule>} />
        <Route path="fichas-tecnicas" element={<ProtectedModule modulo="fichas-tecnicas"><FichasTecnicasPage /></ProtectedModule>} />
        <Route path="insumos" element={<ProtectedModule modulo="insumos"><InsumosPage /></ProtectedModule>} />
        <Route path="produccion" element={<ProtectedModule modulo="produccion"><ProduccionPage /></ProtectedModule>} />
        <Route path="productos" element={<ProtectedModule modulo="productos"><ProductosPage /></ProtectedModule>} />
        <Route path="clientes" element={<ProtectedModule modulo="clientes"><ClientesPage /></ProtectedModule>} />
        <Route path="pedidos" element={<ProtectedModule modulo="pedidos"><PedidosPage /></ProtectedModule>} />
        <Route path="ventas" element={<ProtectedModule modulo="ventas"><VentasPage /></ProtectedModule>} />
      </Route>

      {/* ─── Ruta comodín 404 para cualquier ruta inexistente ─── */}
      <Route path="*" element={<NotFoundPage isAuthenticated={isAuthenticated} />} />
    </Routes>
  );
}
