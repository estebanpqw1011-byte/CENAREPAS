import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, LogOut, X } from 'lucide-react';
import { menuGroups } from '../../admin/layout/Sidebar';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import { useConfiguracion } from '../../../shared/contexts/ConfiguracionContext';
import { useDashboard } from '../hooks/useDashboard';

const TABS = {
  operacion: ['Compras', 'Producción', 'Ventas y Pedidos'],
  administracion: ['Configuración'],
};

const SEDES = [
  { key: 'belloOriente', nombre: 'Bello Oriente' },
  { key: 'aranjuez', nombre: 'Aranjuez' },
];

export function DashboardSidebar({ mobileOpen, setMobileOpen, onLogout }) {
  const location = useLocation();
  const { can } = usePermissions();
  const { nombreProyecto, logoUrl } = useConfiguracion();
  const { data } = useDashboard();
  const pedidosFlow = data?.pedidosFlow ?? {};
  const shouldReduceMotion = useReducedMotion();
  const [tab, setTab] = useState('operacion');
  const [sedesOpen, setSedesOpen] = useState(true);

  useEffect(() => {
    setMobileOpen?.(false);
  }, [location.pathname, setMobileOpen]);

  const visibleGroups = useMemo(
    () =>
      menuGroups
        .filter((group) => TABS[tab].includes(group.category))
        .map((group) => ({
          ...group,
          items: group.items.filter((item) =>
            can(item.permission || (item.path === '/admin' ? 'dashboard' : item.path.split('/').pop()), 'ver')
          ),
        }))
        .filter((group) => group.items.length > 0),
    [tab, can]
  );

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen?.(false)} aria-hidden="true" />
      )}
      <aside
        className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 flex h-screen w-72 flex-col bg-[#150c06] text-[#fffbf0] transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:w-64 lg:translate-x-0`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <img src={logoUrl} alt={nombreProyecto} className="h-9 w-9 shrink-0 object-contain rounded-lg drop-shadow-sm" />
            <h2 className="truncate text-base font-bold tracking-wide" title={nombreProyecto}>
              {nombreProyecto}
            </h2>
          </div>
          <button
            onClick={() => setMobileOpen?.(false)}
            className="rounded-lg p-2 text-[#fffbf0] transition-colors hover:bg-white/10 lg:hidden"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="flex rounded-xl bg-white/[0.05] p-1 text-sm font-medium">
            {[
              { key: 'operacion', label: 'Operación' },
              { key: 'administracion', label: 'Administración' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`relative flex-1 rounded-lg py-2 text-center transition-colors cursor-pointer ${
                  tab === t.key ? 'text-[#fffbf0]' : 'text-[#a8916f] hover:text-[#c9a97e]'
                }`}
              >
                {tab === t.key && (
                  <motion.span
                    layoutId={shouldReduceMotion ? undefined : 'sidebar-tab-pill'}
                    className="absolute inset-0 rounded-lg bg-[#c1502d]"
                    transition={{ type: 'spring', stiffness: 400, damping: 32, duration: shouldReduceMotion ? 0 : undefined }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
          {visibleGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-[#a8916f]/70">
                {group.category}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-[#c1502d] text-[#fffbf0] shadow-sm' : 'text-[#e8dcc8] hover:bg-white/[0.06]'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.08] p-4">
          <button
            type="button"
            onClick={() => setSedesOpen((v) => !v)}
            className="flex w-full items-center justify-between px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-[#a8916f]/70 cursor-pointer"
            aria-expanded={sedesOpen}
          >
            <span>Sedes Activas</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${sedesOpen ? 'rotate-0' : '-rotate-90'}`} />
          </button>
          {sedesOpen && (
            <div className="space-y-1">
              {SEDES.map((sede) => (
                <div key={sede.key} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 text-[#e8dcc8]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#e8b23d]" />
                    {sede.nombre}
                  </span>
                  <span className="font-mono text-[#fffbf0]">{pedidosFlow[sede.key] ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onLogout}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#e8dcc8] transition-colors hover:bg-white/[0.06] hover:text-[#fffbf0] cursor-pointer"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
