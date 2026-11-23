import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Sun, Moon, User, Settings, LogOut, Menu, ChevronRight, Home, Shield, ClipboardList, Briefcase } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import { NotificationCenter } from '../components/NotificationCenter';

const ROUTE_LABELS = {
  '/admin': 'Dashboard',
  '/admin/usuarios': 'Usuarios',
  '/admin/roles': 'Roles y Permisos',
  '/admin/proveedores': 'Proveedores',
  '/admin/clientes': 'Clientes',
  '/admin/categorias': 'Categorías',
  '/admin/productos': 'Productos',
  '/admin/insumos': 'Insumos',
  '/admin/fichas-tecnicas': 'Fichas Técnicas',
  '/admin/produccion': 'Control de Producción',
  '/admin/compras': 'Gestión de Compras',
  '/admin/pedidos': 'Gestión de Pedidos',
  '/admin/ventas': 'Gestión de Ventas',
  '/admin/configuracion': 'Configuración del Sistema',
  '/admin/profile': 'Mi Perfil',
};

export default function Header({ onLogout, onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { can, roleId, roleName, currentUserMeta, defaultRoute, setActiveRole } = usePermissions();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const currentLabel = ROUTE_LABELS[location.pathname] || 'Panel';

  const userInitials = currentUserMeta?.iniciales || 'US';
  const userName = currentUserMeta?.nombre || 'Usuario';
  const userEmail = currentUserMeta?.correo || 'usuario@cenarepas.com';

  const handleSwitchRole = (newRoleId) => {
    setActiveRole(newRoleId);
    setShowUserMenu(false);
    navigate(newRoleId === 3 ? '/admin/pedidos' : '/admin');
  };

  return (
    <header className="bg-card border-b border-border px-3.5 py-2.5 sm:px-6 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-20 backdrop-blur-md bg-card/95">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-1.5 sm:p-2 -ml-1 sm:-ml-2 hover:bg-muted rounded-lg transition-colors lg:hidden shrink-0 cursor-pointer text-foreground"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Link to={defaultRoute} className="flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="w-3.5 h-3.5 text-primary" />
            <span>Inicio</span>
          </Link>
          {location.pathname !== '/admin' && (
            <>
              <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
              <span className="text-foreground font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                {currentLabel}
              </span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0 max-w-xs sm:max-w-md ml-auto">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar arepas, insumos, clientes..."
            className="w-full min-w-0 pl-9 pr-3 py-1.5 sm:py-2 border border-input bg-input-background rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm transition-all shadow-xs placeholder:text-muted-foreground/60"
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={toggleTheme}
          className="p-1.5 sm:p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer text-foreground"
          title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {theme === 'dark' ? <Sun className="w-4.5 sm:w-5 h-4.5 sm:h-5 text-[#E8B23D]" /> : <Moon className="w-4.5 sm:w-5 h-4.5 sm:h-5 text-muted-foreground" />}
        </button>

        {/* Centro de Notificaciones */}
        <NotificationCenter />
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 sm:gap-3 p-1 sm:p-2 hover:bg-muted rounded-lg transition-colors cursor-pointer"
          >
            <div className={`size-8 sm:size-10 rounded-full flex items-center justify-center shrink-0 ${
              roleId === 2 ? 'bg-[#5A7A3A] text-white' : roleId === 3 ? 'bg-[#E8B23D] text-slate-900 font-bold' : 'bg-primary text-primary-foreground'
            }`}>
              <span className="text-xs sm:text-sm font-semibold">{userInitials}</span>
            </div>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1.5">
                <p className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{userName}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                  roleId === 2 ? 'bg-[#5A7A3A]/15 text-[#5A7A3A] dark:text-[#AEC094]' : roleId === 3 ? 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]' : 'bg-primary/10 text-primary'
                }`}>
                  {roleName}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{userEmail}</p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowUserMenu(false)}
              ></div>
              <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-border">
                
                {/* Selector rápido de rol */}
                <div className="p-2 bg-muted/40">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Cambiar Rol Activo
                  </p>
                  <div className="space-y-1 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSwitchRole(1)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        roleId === 1 ? 'bg-primary text-white shadow-xs' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="size-3.5 shrink-0" />
                        <span>Administrador</span>
                      </span>
                      {roleId === 1 && <span className="text-[9.5px] bg-white/20 px-1.5 py-0.2 rounded font-bold">Activo</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchRole(2)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        roleId === 2 ? 'bg-[#5A7A3A] text-white shadow-xs' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardList className="size-3.5 shrink-0" />
                        <span>Secretaria</span>
                      </span>
                      {roleId === 2 && <span className="text-[9.5px] bg-white/20 px-1.5 py-0.2 rounded font-bold">Activo</span>}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSwitchRole(3)}
                      className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                        roleId === 3 ? 'bg-[#E8B23D] text-slate-900 font-bold shadow-xs' : 'hover:bg-muted text-foreground'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Briefcase className="size-3.5 shrink-0" />
                        <span>Vendedor</span>
                      </span>
                      {roleId === 3 && <span className="text-[9.5px] bg-black/15 px-1.5 py-0.2 rounded font-bold">Activo</span>}
                    </button>
                  </div>
                </div>

                {/* Acciones de Cuenta */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      navigate('/admin/profile');
                      setShowUserMenu(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted text-left text-xs font-medium cursor-pointer"
                  >
                    <User className="w-4 h-4 text-muted-foreground" />
                    Mi Perfil
                  </button>
                  {can('configuracion', 'ver') && (
                    <button
                      onClick={() => {
                        navigate('/admin/configuracion');
                        setShowUserMenu(false);
                      }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted text-left text-xs font-medium cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      Configuración
                    </button>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onLogout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-destructive/10 text-destructive text-left text-xs font-medium cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>

              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}