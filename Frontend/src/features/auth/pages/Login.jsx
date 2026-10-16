import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';
import {
  Eye, EyeOff, Sparkles, ShieldCheck, ArrowRight,
  TrendingUp, CheckCircle2, Lock, Mail,
  Package, Laptop, Award, BarChart3, Activity,
  AlertCircle, Shield, ClipboardList, Briefcase,
  Wheat, Truck, Thermometer
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { usePermissions } from '../../../shared/contexts/PermissionContext';
import { getDefaultRouteForRole } from '../../../shared/config/permisos';
import { toast } from '../../../shared/utils/toast.jsx';
import cenarepasLogo from '../../../assets/cenarepas-icon.svg';
import authLoginBg from '../../../assets/auth/auth-login-bg.png';
import { Sun, Moon } from 'lucide-react';

// Variantes de animación para la entrada escalonada (Stagger) del panel derecho
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.09,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const { isLoading, error, setError, handleLogin, navigate } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setActiveRole } = usePermissions();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await handleLogin(email, password);
    if (res?.success && res?.usuario) {
      const userObj = res.usuario;
      if (userObj.id_rol) {
        setActiveRole(userObj.id_rol);
      }
      if (onLogin) onLogin();
      navigate(getDefaultRouteForRole(userObj.rol));
    }
  };

  // Google: el backend todavía no valida el token de Google (Parte 6). Hasta
  // entonces no se inicia sesión: antes se entraba con el rol 1 sin backend.
  const loginWithGoogle = useGoogleLogin({
    onSuccess: () => {
      toast.error('El acceso con Google aún no está disponible. Ingresa con tu correo y contraseña.');
    },
    onError: (error) => {
      console.error('Error en la autenticación con Google:', error);
    },
  });
  return (
    <div className="min-h-screen lg:h-screen w-full flex bg-background font-sans text-foreground overflow-y-auto lg:overflow-hidden selection:bg-[#C1502D]/15 selection:text-[#C1502D] transition-colors duration-200">
      
      {/* ════════════════════ PANEL IZQUIERDO — FORMULARIO PROPORCIONADO ════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="w-full lg:w-[50%] xl:w-[48%] min-h-screen lg:h-screen overflow-y-auto flex flex-col justify-between px-4 sm:px-8 md:px-12 lg:px-14 xl:px-18 py-6 sm:py-7 lg:py-8 bg-background text-foreground"
      >
        
        {/* Top bar / Logo + Badge de Estado + Theme Toggle */}
        <div className="w-full max-w-[420px] mx-auto flex items-center justify-between gap-3 mb-4">
          <motion.a
            href="/"
            whileHover={{ scale: 1.02 }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <img
              src={cenarepasLogo}
              alt="CENAREPAS"
              className="h-8 sm:h-9 w-8 sm:w-9 object-contain rounded-lg drop-shadow-sm"
            />
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-foreground">
                CENAREPAS
              </span>
              <span className="text-[8.5px] sm:text-[9px] font-bold tracking-[0.16em] uppercase text-[#C1502D] dark:text-[#E8B23D] mt-0.5">
                SISTEMA DE GESTIÓN
              </span>
            </div>
          </motion.a>
          
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#5A7A3A]/10 border border-[#5A7A3A]/20 dark:bg-[#5A7A3A]/25 dark:border-[#5A7A3A]/40 px-2.5 py-0.5 text-[10px] font-semibold text-[#5A7A3A] dark:text-[#AEC094]">
              <span className="size-1.5 rounded-full bg-[#5A7A3A] dark:bg-[#E8B23D] animate-pulse" />
              Sistema en Línea
            </span>

            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-xl border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="size-3.5 text-[#E8B23D]" /> : <Moon className="size-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Contenedor Central del Formulario */}
        <div className="w-full max-w-[420px] mx-auto my-auto py-2">

          {/* Eyebrow de Marca */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#C1502D]/20 bg-[#C1502D]/10 px-2.5 py-0.5 text-[#C1502D] mb-2.5">
            <Sparkles className="size-3 text-[#C1502D]" />
            <span className="landing-eyebrow text-[10px] text-[#C1502D]">Portal Administrativo</span>
          </div>

          {/* Encabezado con Acento Tipográfico Elegante Scoped al Login */}
          <div className="mb-4">
            <h1 className="text-2xl sm:text-[1.75rem] font-bold text-foreground tracking-tight leading-tight">
              Sistema de Gestión
              <span 
                className="block font-serif italic font-normal text-[#C1502D] dark:text-[#E8B23D] text-[0.96em] mt-0.5 tracking-normal"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                para fábricas de alimentos
              </span>
            </h1>
            <p className="text-muted-foreground text-xs sm:text-[13px] mt-1.5 leading-relaxed font-normal">
              Ingresa tus credenciales para acceder al panel de control en tiempo real.
            </p>
          </div>

          {/* Bloque Estilizado de Credenciales de Prueba con selector de Roles */}
          <div className="bg-card dark:bg-[#111820] border border-border dark:border-[rgba(148,163,184,0.14)] rounded-2xl p-3 sm:p-3.5 mb-4 shadow-[0_2px_8px_rgba(45,41,38,0.03)] dark:shadow-none">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#C1502D]/10 dark:bg-[#E8B23D]/15 px-2.5 py-0.5 text-[9.5px] font-bold text-[#C1502D] dark:text-[#E8B23D] uppercase tracking-wider">
                <ShieldCheck className="size-3 text-[#C1502D] dark:text-[#E8B23D]" />
                Credenciales de prueba por Rol
              </span>
              <span className="text-[10px] font-semibold text-[#5A7A3A] dark:text-[#AEC094]">Story Mapping</span>
            </div>
            
            {/* Botones de Selección Rápida de Rol con Iconos SVG */}
            <div className="grid grid-cols-3 gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@sistema.com');
                  setPassword('admin123');
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  email === 'admin@sistema.com'
                    ? 'bg-[#C1502D] text-white border-[#C1502D] shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground border-border'
                }`}
              >
                <Shield className="size-3.5 shrink-0" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('secretaria@cenarepas.com');
                  setPassword('secretaria123');
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  email === 'secretaria@cenarepas.com'
                    ? 'bg-[#5A7A3A] text-white border-[#5A7A3A] shadow-xs'
                    : 'bg-muted/60 hover:bg-muted text-foreground border-border'
                }`}
              >
                <ClipboardList className="size-3.5 shrink-0" />
                <span>Secretaria</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('vendedor@cenarepas.com');
                  setPassword('vendedor123');
                }}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                  email === 'vendedor@cenarepas.com'
                    ? 'bg-[#E8B23D] text-slate-900 border-[#E8B23D] shadow-xs font-bold'
                    : 'bg-muted/60 hover:bg-muted text-foreground border-border'
                }`}
              >
                <Briefcase className="size-3.5 shrink-0" />
                <span>Vendedor</span>
              </button>
            </div>

            <div className="space-y-1 text-xs text-muted-foreground">
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Email:</span>
                <strong className="font-semibold text-foreground font-mono text-[11.5px] bg-[#FFFBF0] dark:bg-[#0B0F14] px-2 py-0.5 rounded border border-[#E8DCC0] dark:border-[rgba(148,163,184,0.18)]">{email || 'admin@sistema.com'}</strong>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Contraseña:</span>
                <strong className="font-semibold text-foreground font-mono text-[11.5px] bg-[#FFFBF0] dark:bg-[#0B0F14] px-2 py-0.5 rounded border border-[#E8DCC0] dark:border-[rgba(148,163,184,0.18)]">{password ? '••••••••' : 'admin123'}</strong>
              </p>
            </div>
          </div>

          {/* Botón Google con Microinteracciones */}
          <motion.button 
            onClick={() => loginWithGoogle()}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            type="button"
            className="w-full h-11 flex items-center justify-center gap-2.5 bg-card dark:bg-[#111820] border border-border dark:border-[rgba(148,163,184,0.14)] text-foreground font-semibold text-xs sm:text-[13px] rounded-xl hover:bg-muted hover:border-[#C1502D]/40 dark:hover:border-[#E8B23D]/40 hover:shadow-xs transition-all duration-200 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <svg className="size-4.5 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.58c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>Continuar con Google</span>
          </motion.button>

          {/* Divisor Visual */}
          <div className="flex items-center my-3.5">
            <div className="flex-grow border-t border-border dark:border-[rgba(148,163,184,0.14)]"></div>
            <span className="mx-3 text-[10.5px] text-muted-foreground font-medium uppercase tracking-wider">o con tu correo</span>
            <div className="flex-grow border-t border-border dark:border-[rgba(148,163,184,0.14)]"></div>
          </div>

          {/* Formulario Estándar */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Mensaje de Error en Login */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                id="login-error"
                className="flex items-start gap-2.5 p-3 rounded-xl bg-[#C1502D]/10 dark:bg-[#C1502D]/20 border border-[#C1502D]/30 text-[#C1502D] dark:text-[#FFAAA0] text-xs leading-snug"
                role="alert"
              >
                <AlertCircle className="size-4 shrink-0 text-[#C1502D] dark:text-[#FFAAA0] mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{error}</p>
                </div>
              </motion.div>
            )}

            {/* Campo Correo */}
            <div>
              <label htmlFor="login-email" className="block text-[11.5px] font-bold text-foreground/90 mb-1">
                Correo Electrónico <span className="text-[#C1502D] dark:text-[#E8B23D]">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="admin@sistema.com"
                  autoComplete="email"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={`w-full h-11 bg-[#FFFBF0]/60 dark:bg-[#0E141B] border text-foreground text-xs sm:text-sm placeholder:text-muted-foreground rounded-xl pl-10 pr-3.5 transition-all duration-200 focus:bg-white dark:focus:bg-[#111820] focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-[#C1502D] dark:border-[#E05238] focus:border-[#C1502D] dark:focus:border-[#E05238] focus:ring-[#C1502D]/20 dark:focus:ring-[#E05238]/25'
                      : 'border-[#E8DCC0] dark:border-[rgba(148,163,184,0.18)] focus:border-[#C1502D] dark:focus:border-[#E8B23D] focus:ring-[#C1502D]/15 dark:focus:ring-[#E8B23D]/20'
                  }`}
                  required
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="login-password" className="block text-[11.5px] font-bold text-foreground/90 mb-1">
                Contraseña <span className="text-[#C1502D] dark:text-[#E8B23D]">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!error}
                  aria-describedby={error ? 'login-error' : undefined}
                  className={`w-full h-11 bg-[#FFFBF0]/60 dark:bg-[#0E141B] border text-foreground text-xs sm:text-sm placeholder:text-muted-foreground rounded-xl pl-10 pr-11 transition-all duration-200 focus:bg-white dark:focus:bg-[#111820] focus:outline-none focus:ring-2 ${
                    error
                      ? 'border-[#C1502D] dark:border-[#E05238] focus:border-[#C1502D] dark:focus:border-[#E05238] focus:ring-[#C1502D]/20 dark:focus:ring-[#E05238]/25'
                      : 'border-[#E8DCC0] dark:border-[rgba(148,163,184,0.18)] focus:border-[#C1502D] dark:focus:border-[#E8B23D] focus:ring-[#C1502D]/15 dark:focus:ring-[#E8B23D]/20'
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-[#C1502D] dark:hover:text-[#E8B23D] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] rounded-md"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Opciones Recordarme / Olvidó Contraseña */}
            <div className="flex items-center justify-between pt-0.5">
              <label htmlFor="login-remember" className="flex items-center text-[11.5px] text-muted-foreground cursor-pointer select-none">
                <input
                  id="login-remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-3.5 rounded border-border text-[#C1502D] dark:text-[#E8B23D] accent-[#C1502D] dark:accent-[#E8B23D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background mr-1.5 cursor-pointer"
                />
                Recordarme
              </label>

              <button
                type="button"
                onClick={() => navigate('/admin/forgot-password')}
                className="text-[11.5px] font-semibold text-[#C1502D] dark:text-[#E8B23D] hover:text-[#8A3418] dark:hover:text-[#F0C05E] transition-colors bg-transparent border-0 cursor-pointer p-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Principal Iniciar Sesión (Sólido Terracota #C1502D) */}
            <motion.button 
              type="submit" 
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.012, y: -1 }}
              whileTap={{ scale: 0.988 }}
              className={`w-full h-11 text-white font-bold rounded-full text-xs sm:text-[13px] px-6 transition-all duration-200 flex justify-center items-center gap-2 cursor-pointer mt-3.5 shadow-md shadow-[#C1502D]/25 dark:shadow-[#C1502D]/40 ${
                isLoading 
                  ? 'bg-[#C1502D]/70 cursor-not-allowed shadow-none' 
                  : 'bg-[#C1502D] hover:bg-[#8A3418] active:translate-y-[1px]'
              }`}
            >
              {isLoading && (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                  className="size-3.5 border-2 border-white/30 border-t-white rounded-full"
                />
              )}
              <span>{isLoading ? 'Iniciando sesión…' : 'Iniciar Sesión'}</span>
              {!isLoading && <ArrowRight className="size-3.5" />}
            </motion.button>
          </form>

          {/* Registro Link */}
          <div className="text-center mt-3.5">
            <p className="text-xs text-muted-foreground">
              ¿Aún no tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-[#C1502D] dark:text-[#E8B23D] font-bold hover:text-[#8A3418] dark:hover:text-[#F0C05E] hover:underline bg-transparent border-0 cursor-pointer p-0 ml-1 rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] dark:focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Regístrate aquí
              </button>
            </p>
          </div>

        </div>

        {/* Footer del Panel */}
        <div className="w-full max-w-[420px] mx-auto mt-2 text-center lg:text-left text-[11px] text-muted-foreground font-normal">
          © {new Date().getFullYear()} CENAREPAS · Todos los derechos reservados.
        </div>

      </motion.div>

      {/* ════════════════════ PANEL DERECHO — PANEL EDITORIAL & TELEMETRÍA VIVA DE PLANTA ════════════════════ */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="hidden lg:flex lg:w-[50%] xl:w-[52%] relative bg-[#110d0b] flex-col justify-between p-8 sm:p-12 md:p-14 lg:p-14 xl:p-16 overflow-hidden h-screen"
      >
        {/* Fotografía de fondo de producción de arepas */}
        <img
          src={authLoginBg}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Fondo Editorial Orgánico Masarepas con overlay ligero para mantener nitidez de la foto */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a1308] via-[#241b07] to-[#0d1d13] opacity-45 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0402]/65 via-transparent to-[#1E0E07]/35 pointer-events-none" />

        {/* Capa de texturizado y halos orgánicos */}
        <div className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#f66018]/15 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 left-1/4 w-80 h-80 rounded-full bg-[#efc200]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 w-96 h-96 rounded-full bg-[#00b954]/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] bg-[radial-gradient(#ffb599_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Encabezado Editorial Superior */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#161310]/50 backdrop-blur-md border border-white/10 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#4ae176]"></span>
            <span className="text-[11px] font-mono text-[#eae1db] uppercase tracking-wider font-medium">Línea de Ensamble 01 · Activa</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[#e2bfb2] text-[11px] font-mono">
            <Thermometer className="size-4 text-[#efc200]" />
            <span>Cocción Nixtamal: 92°C</span>
          </div>
        </div>

        {/* Títulos Editoriales de Gran Escala y Bento de Tarjetas */}
        <div className="relative z-10 my-auto py-6 max-w-xl">
          <span className="text-[11.5px] font-mono uppercase tracking-widest text-[#ffb599] block mb-2.5 font-semibold">
            Arquitectura Operativa de Alimentos
          </span>
          <h2 className="text-2xl sm:text-3xl xl:text-[34px] text-[#eae1db] font-bold tracking-tight leading-[1.15]">
            Gestiona tu producción, pedidos y ventas en un solo lugar.
          </h2>
          <p className="text-sm sm:text-[14.5px] text-[#e2bfb2] mt-3 leading-relaxed font-light">
            El sistema ERP integral diseñado para la excelencia operativa y el legado artesanal de <span className="text-[#eae1db] font-medium">Masarepas</span>.
          </p>

          {/* Bento de Tarjetas Flotantes Glassmorphic (Telemetría de Planta) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6 sm:mt-7 flex flex-col gap-3.5"
          >
            {/* Tarjeta 1: Lote Maíz Blanco en Producción */}
            <motion.div
              variants={itemVariants}
              className="p-4 rounded-2xl bg-[#161310]/60 backdrop-blur-xl border border-white/15 shadow-xl flex flex-col gap-2.5 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wheat className="size-5 text-[#ffb599]" />
                  <span className="text-[11.5px] font-mono text-[#eae1db] font-semibold tracking-wide">LOTE MAÍZ BLANCO #408</span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00b954]/20 text-[#4ae176] text-[10.5px] font-mono font-semibold border border-[#4ae176]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ae176] animate-ping"></span>
                  En Cocción y Molienda
                </span>
              </div>
              <div className="w-full flex items-center justify-between text-[#e2bfb2] text-xs font-normal">
                <span>Etapa 3 de 5 · Calidad de Masa</span>
                <span className="text-[11.5px] font-mono text-[#ffb599] font-bold">78%</span>
              </div>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#f66018] rounded-full w-[78%] transition-all duration-500"></div>
              </div>
            </motion.div>

            {/* Grid 2 Columnas para Tarjetas 2 y 3 */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
              {/* Tarjeta 2: Producción Diaria */}
              <div className="p-4 rounded-2xl bg-[#161310]/60 backdrop-blur-xl border border-white/15 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#e2bfb2] mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Producción Diaria</span>
                  <div className="flex items-center gap-1 text-[#efc200] text-[11px] font-mono font-semibold">
                    <TrendingUp className="size-3.5" />
                    <span>+14.2%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl text-[#eae1db] font-bold tracking-tight">48,250</div>
                  <div className="text-xs text-[#e2bfb2] mt-0.5">arepas listas empacadas</div>
                </div>
              </div>

              {/* Tarjeta 3: Despacho a CEDIS */}
              <div className="p-4 rounded-2xl bg-[#161310]/60 backdrop-blur-xl border border-white/15 shadow-xl flex flex-col justify-between">
                <div className="flex items-center justify-between text-[#e2bfb2] mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">Despacho a CEDIS</span>
                  <Truck className="size-4 text-[#4ae176]" />
                </div>
                <div>
                  <div className="text-xl sm:text-2xl text-[#eae1db] font-bold tracking-tight">5 rutas</div>
                  <div className="text-xs text-[#e2bfb2] mt-0.5">activas hoy en distribución</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Pie de Panel Editorial */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-4 text-[#e2bfb2] text-[10.5px] font-mono border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10">Módulo Molienda</span>
            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10">Amasado Continuo</span>
            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10">Logística Fría</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#ffb599]">
            <ShieldCheck className="size-3.5" />
            <span>Certificación BPM & Calidad Artesanal</span>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
