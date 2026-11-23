import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Shield,
  Truck,
  ShoppingCart,
  FolderTree,
  BookOpen,
  Package,
  Factory,
  Box,
  UserCircle,
  ClipboardList,
  DollarSign,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Settings,
  X,
} from 'lucide-react';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import { useConfiguracion } from '../../../shared/contexts/ConfiguracionContext';

export const dashboardItem = {
  path: '/admin',
  icon: LayoutDashboard,
  label: 'Dashboard',
  permission: 'dashboard',
};

export const menuGroups = [
  {
    category: 'Configuración',
    items: [
      { path: '/admin/roles', icon: Shield, label: 'Roles', permission: 'roles' },
      { path: '/admin/usuarios', icon: Users, label: 'Usuarios', permission: 'usuarios' },
    ],
  },
  {
    category: 'Compras',
    items: [
      { path: '/admin/categorias', icon: FolderTree, label: 'Categorías', permission: 'categorias' },
      { path: '/admin/proveedores', icon: Truck, label: 'Proveedores', permission: 'proveedores' },
      { path: '/admin/compras', icon: ShoppingCart, label: 'Compras', permission: 'compras' },
    ],
  },
  {
    category: 'Producción',
    items: [
      { path: '/admin/insumos', icon: Package, label: 'Insumos', permission: 'insumos' },
      { path: '/admin/produccion', icon: Factory, label: 'Producción', permission: 'produccion' },
      { path: '/admin/fichas-tecnicas', icon: BookOpen, label: 'Fichas Técnicas', permission: 'fichas-tecnicas' },
      { path: '/admin/productos', icon: Box, label: 'Productos', permission: 'productos' },
    ],
  },
  {
    category: 'Ventas y Pedidos',
    items: [
      { path: '/admin/clientes', icon: UserCircle, label: 'Clientes', permission: 'clientes' },
      { path: '/admin/pedidos', icon: ClipboardList, label: 'Pedidos', permission: 'pedidos' },
      { path: '/admin/ventas', icon: DollarSign, label: 'Ventas', permission: 'ventas' },
    ],
  },
];

function findActiveCategory(pathname) {
  const group = menuGroups.find((g) =>
    g.items.some((item) => item.path === pathname || (item.path !== '/admin' && pathname.startsWith(item.path)))
  );
  return group ? group.category : null;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen, mobileOpen, setMobileOpen, onLogout }) {
  const location = useLocation();
  const { can } = usePermissions();
  const { nombreProyecto, logoUrl } = useConfiguracion();
  const shouldReduceMotion = useReducedMotion();
  const [openSection, setOpenSection] = useState(() => findActiveCategory(location.pathname));

  // Nav body is shared between the desktop rail and the mobile drawer: when the
  // mobile drawer is open it must always show full labels, regardless of the
  // desktop icon-only collapse preference (which is meaningless off-canvas).
  const expanded = sidebarOpen || mobileOpen;

  const toggleSection = (category) => {
    setOpenSection((prev) => (prev === category ? null : category));
  };

  useEffect(() => {
    const activeCategory = findActiveCategory(location.pathname);
    if (activeCategory) {
      setOpenSection(activeCategory);
    }
    setMobileOpen?.(false);
  }, [location.pathname, setMobileOpen]);

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={() => setMobileOpen?.(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`${sidebarOpen ? 'lg:w-64' : 'lg:w-20'} ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-sidebar text-sidebar-foreground transition-all duration-300 flex flex-col h-screen lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 shadow-2xl lg:shadow-none border-r border-sidebar-border`}
      >
        {/* Mobile header: always full width, closes the drawer */}
        <div className="flex items-center justify-between border-b border-sidebar-border h-16 shrink-0 p-4 lg:hidden">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={logoUrl} alt={nombreProyecto} className="h-9 w-9 object-contain shrink-0 rounded-lg drop-shadow-sm" />
            <h2 className="text-base font-bold tracking-wide truncate" title={nombreProyecto}>
              {nombreProyecto}
            </h2>
          </div>
          <button
            onClick={() => setMobileOpen?.(false)}
            className="p-2 hover:bg-sidebar-accent rounded-lg text-sidebar-foreground transition-colors cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Desktop header: collapsible icon-only / full width */}
        <div className="hidden lg:flex p-4 items-center justify-between border-b border-sidebar-border h-16 shrink-0">
          {sidebarOpen ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <img src={logoUrl} alt={nombreProyecto} className="h-9 w-9 object-contain shrink-0 rounded-lg drop-shadow-sm" />
              <h2 className="text-base font-bold tracking-wide truncate" title={nombreProyecto}>
                {nombreProyecto}
              </h2>
            </div>
          ) : (
            <img src={logoUrl} alt={nombreProyecto} className="h-9 w-9 object-contain mx-auto rounded-lg drop-shadow-sm" />
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-sidebar-accent rounded-lg text-sidebar-foreground transition-colors cursor-pointer"
            aria-label={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
          >
            {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-3 space-y-2">
          {/* Dashboard: ítem individual en la parte superior sin grupo desplegable */}
          {can(dashboardItem.permission, 'ver') && (() => {
            const isDashboardActive = location.pathname === dashboardItem.path;
            const DashboardIcon = dashboardItem.icon;
            return (
              <div className="pb-1">
                <Link
                  to={dashboardItem.path}
                  title={!expanded ? dashboardItem.label : undefined}
                  className={`flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                    isDashboardActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'hover:bg-sidebar-accent text-sidebar-foreground'
                  }`}
                >
                  <DashboardIcon className="w-5 h-5 flex-shrink-0" />
                  {expanded && <span>{dashboardItem.label}</span>}
                </Link>
                <div className="border-t border-sidebar-border/50 my-2" />
              </div>
            );
          })()}

          {/* Grupos desplegables en acordeón */}
          {menuGroups.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => {
              const permKey =
                item.permission ||
                (item.path === '/admin' ? 'dashboard' : item.path.replace('/admin/', ''));
              return can(permKey, 'ver');
            });

            if (visibleItems.length === 0) return null;

            const hasActiveRoute = visibleItems.some(
              (item) => location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
            );
            const isOpen = openSection === group.category;

            return (
              <div key={group.category} className="space-y-1">
                {expanded ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(group.category)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 group cursor-pointer select-none rounded-lg ${
                      hasActiveRoute && !isOpen
                        ? 'bg-sidebar-primary/10 text-sidebar-primary font-bold border border-sidebar-primary/20 shadow-2xs'
                        : hasActiveRoute && isOpen
                        ? 'text-sidebar-primary font-bold'
                        : 'text-muted-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50'
                    }`}
                    aria-expanded={isOpen}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {hasActiveRoute && (
                        <span className="size-1.5 rounded-full bg-sidebar-primary shrink-0" />
                      )}
                      <span className="truncate">{group.category}</span>
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                        hasActiveRoute
                          ? 'text-sidebar-primary'
                          : 'text-muted-foreground/50 group-hover:text-sidebar-foreground'
                      } ${isOpen ? 'rotate-0' : '-rotate-90'}`}
                    />
                  </button>
                ) : (
                  groupIdx > 0 && <div className="border-t border-sidebar-border/50 my-2" />
                )}

                {expanded ? (
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="accordion-content"
                        initial={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        animate={shouldReduceMotion ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                        exit={shouldReduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden space-y-1 pt-0.5"
                      >
                        {visibleItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <Link
                              key={item.path}
                              to={item.path}
                              className={`flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                                isActive
                                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                                  : 'hover:bg-sidebar-accent text-sidebar-foreground'
                              }`}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              <span>{item.label}</span>
                            </Link>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : (
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          title={item.label}
                          className={`flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-all ${
                            isActive
                              ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                              : 'hover:bg-sidebar-accent text-sidebar-foreground'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border shrink-0">
          <button
            onClick={onLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 hover:text-destructive w-full text-left text-sm font-medium transition-colors"
            title={!expanded ? 'Cerrar Sesión' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {expanded && <span>Cerrar Sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
}