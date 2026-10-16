import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  ShoppingBag,
  Package,
  CreditCard,
  User,
  ShoppingCart,
  Bell,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { useClienteCart } from '../context/ClienteCartContext';
import { useClienteNotifications } from '../context/ClienteNotificationContext';
import cenarepasLogo from '../../../assets/cenarepas-icon.svg';

export default function ClienteLayout({ onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const { totalCount } = useClienteCart();
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas } = useClienteNotifications();
  const navigate = useNavigate();
  const location = useLocation();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  // Leer usuario actual de localStorage
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const nombreUsuario = user.nombre || 'Cliente CENAREPAS';
  const correoUsuario = user.correo || '';
  const inicial = (nombreUsuario[0] || 'C').toUpperCase();

  // Cerrar dropdowns al hacer clic afuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // onLogout (routes.jsx) borra la sesión guardada.
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    if (onLogout) onLogout();
    navigate('/admin/login');
  };

  const navLinks = [
    { to: '/cliente', label: 'Inicio', icon: Home, end: true },
    { to: '/cliente/catalogo', label: 'Catálogo', icon: ShoppingBag },
    { to: '/cliente/pedidos', label: 'Mis Pedidos', icon: Package },
    { to: '/cliente/creditos', label: 'Mis Créditos', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans selection:bg-[#C1502D]/15 selection:text-[#C1502D] transition-colors duration-200">
      
      {/* ════════════════════ BARRA SUPERIOR ════════════════════ */}
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo y Marca */}
          <div className="flex items-center gap-6">
            <NavLink
              to="/cliente"
              className="flex items-center gap-2.5 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] rounded-lg"
            >
              <img
                src={cenarepasLogo}
                alt="CENAREPAS"
                className="h-9 w-9 object-contain rounded-lg drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col leading-none">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-tight text-foreground">
                    CENAREPAS
                  </span>
                  <span className="hidden sm:inline-flex text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-[#C1502D]/10 text-[#C1502D] dark:bg-[#E8B23D]/15 dark:text-[#E8B23D]">
                    CLIENTES
                  </span>
                </div>
                <span className="text-[9px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Sabor Tradicional
                </span>
              </div>
            </NavLink>

            {/* Enlaces Principales de Navegación (Desktop) */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Navegación principal cliente">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-[13px] font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-[#C1502D] text-white shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
                      }`
                    }
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Utilidades de la derecha */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Botón Carrito */}
            <NavLink
              to="/cliente/carrito"
              className={({ isActive }) =>
                `relative p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'border-[#C1502D] bg-[#C1502D]/10 text-[#C1502D] dark:border-[#E8B23D] dark:text-[#E8B23D]'
                    : 'border-border bg-card text-foreground hover:bg-muted/80'
                }`
              }
              title="Ver mi carrito"
              aria-label={`Carrito de compras con ${totalCount} productos`}
            >
              <ShoppingCart className="size-4.5" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[#C1502D] text-white text-[10px] font-extrabold shadow-sm animate-in zoom-in-75">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </NavLink>

            {/* Dropdown de Notificaciones */}
            <div className="relative" ref={notifDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  setUserDropdownOpen(false);
                }}
                className={`relative p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
                  notifDropdownOpen
                    ? 'border-[#C1502D] bg-[#C1502D]/10 text-[#C1502D] dark:border-[#E8B23D] dark:text-[#E8B23D]'
                    : 'border-border bg-card text-foreground hover:bg-muted/80'
                }`}
                title="Notificaciones"
                aria-label={`Notificaciones: ${noLeidas} sin leer`}
              >
                <Bell className="size-4.5" />
                {noLeidas > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[#E8B23D] text-[#2D2926] text-[10px] font-extrabold shadow-sm">
                    {noLeidas}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {notifDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-3 z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-border">
                      <div className="flex items-center gap-2">
                        <Bell className="size-4 text-[#C1502D] dark:text-[#E8B23D]" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Notificaciones
                        </span>
                        {noLeidas > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-[#E8B23D]/20 text-[#B87D0E] dark:text-[#E8B23D] text-[10px] font-bold">
                            {noLeidas} nuevas
                          </span>
                        )}
                      </div>
                      {noLeidas > 0 && (
                        <button
                          type="button"
                          onClick={() => marcarTodasLeidas()}
                          className="text-[11px] font-semibold text-[#C1502D] dark:text-[#E8B23D] hover:underline"
                        >
                          Marcar leídas
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                      {notificaciones.length === 0 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">
                          No tienes notificaciones pendientes.
                        </div>
                      ) : (
                        notificaciones.slice(0, 5).map((n) => (
                          <div
                            key={n.id_notificacion}
                            onClick={() => {
                              if (!n.leida) marcarLeida(n.id_notificacion);
                            }}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                              n.leida
                                ? 'border-transparent bg-muted/30 opacity-75'
                                : 'border-[#C1502D]/20 bg-[#C1502D]/5 dark:bg-[#C1502D]/10 font-medium'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-foreground mb-0.5">
                              <span>{n.titulo}</span>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {n.fecha_creacion ? new Date(n.fecha_creacion).toLocaleDateString() : ''}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-muted-foreground leading-snug">
                              {n.mensaje}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 mt-2 border-t border-border text-center">
                      <NavLink
                        to="/cliente/notificaciones"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs font-bold text-[#C1502D] dark:text-[#E8B23D] hover:underline"
                      >
                        Ver todas las notificaciones →
                      </NavLink>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toggle de Modo Claro/Oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-border bg-card text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              aria-label="Cambiar tema visual"
            >
              {theme === 'dark' ? (
                <Sun className="size-4.5 text-[#E8B23D]" />
              ) : (
                <Moon className="size-4.5 text-muted-foreground" />
              )}
            </button>

            {/* Menú de Usuario / Perfil */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setNotifDropdownOpen(false);
                }}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-border bg-card hover:bg-muted/70 transition-all cursor-pointer"
                aria-expanded={userDropdownOpen}
              >
                <div className="size-7 rounded-lg bg-[#C1502D] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {inicial}
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none max-w-[120px]">
                  <span className="text-xs font-bold text-foreground truncate">
                    {nombreUsuario.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    Cliente
                  </span>
                </div>
                <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
              </button>

              <AnimatePresence>
                {userDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-2 z-50"
                  >
                    <div className="px-3 py-2 border-b border-border mb-1">
                      <p className="text-xs font-bold text-foreground truncate">{nombreUsuario}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{correoUsuario}</p>
                    </div>

                    <NavLink
                      to="/cliente/perfil"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                      <User className="size-4 text-[#C1502D] dark:text-[#E8B23D]" />
                      <span>Mi Perfil y Contraseña</span>
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="size-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>
      </header>

      {/* ════════════════════ CONTENIDO DE LA PÁGINA ════════════════════ */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
        <Outlet />
      </main>

      {/* ════════════════════ NAVEGACIÓN INFERIOR PARA MÓVILES ════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg"
        aria-label="Navegación móvil inferior"
      >
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive
                  ? 'text-[#C1502D] dark:text-[#E8B23D] font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`size-5 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}

        <NavLink
          to="/cliente/perfil"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
            location.pathname === '/cliente/perfil'
              ? 'text-[#C1502D] dark:text-[#E8B23D] font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <User className="size-5" />
          <span className="text-[10px] mt-0.5">Perfil</span>
        </NavLink>
      </nav>

      {/* ════════════════════ MODAL DE CONFIRMACIÓN DE CERRAR SESIÓN ════════════════════ */}
      <AnimatePresence>
        {showLogoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-[#C1502D]/10 text-[#C1502D]">
                  <LogOut className="size-5" />
                </div>
                <h3 className="text-base font-bold text-foreground">
                  ¿Cerrar sesión en CENAREPAS?
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
                Tu carrito guardado se conservará para tu próxima visita. ¿Deseas salir ahora?
              </p>
              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmLogout}
                  className="px-4 py-2 rounded-xl bg-[#C1502D] hover:bg-[#A84223] text-white text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm"
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
