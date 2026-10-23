import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Menu, X } from 'lucide-react';
import { useConfiguracion } from '../../../shared/contexts/ConfiguracionContext';
import cenarepasLogo from '../../../assets/cenarepas-icon.svg';

const NAV_LINKS = [
  { label: 'Inicio', href: '#inicio' },
  { label: 'Nosotros', href: '#nosotros' },
  // Sección que invita al catálogo público; se llega con scroll suave.
  { label: 'Catálogo', href: '#catalogo', suave: true },
  { label: 'Ventajas', href: '#ventajas' },
  { label: 'Contacto', href: '#contacto' },
];

/** Scroll suave hasta la sección (sin animación si se pidió reducir el movimiento). */
function irASeccion(event, href) {
  const destino = document.getElementById(href.slice(1));
  if (!destino) return;
  event.preventDefault();
  const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  window.history.replaceState(null, '', href);
}

export function SiteHeader() {
  const { nombreProyecto } = useConfiguracion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('inicio');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter(Boolean);
    if (!sections.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const isHero = activeSection === 'inicio';

  const linkClass = (isActive) => {
    if (isActive) {
      return 'relative rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide bg-[#c1502d] text-white shadow-xs transition-colors duration-200';
    }
    if (isHero) {
      return 'relative rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white/90 hover:bg-white/15 hover:text-white transition-colors duration-200';
    }
    return 'relative rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide text-slate-700 hover:bg-black/5 hover:text-slate-900 transition-colors duration-200';
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
      <div
        className={`mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full border px-3 transition-all duration-300 sm:h-16 sm:px-5 ${
          isHero
            ? 'bg-transparent border-white/15 backdrop-blur-[2px] shadow-none hover:bg-white/[0.04]'
            : 'bg-white/40 border-[#e8dcc0] shadow-sm backdrop-blur-md hover:bg-white/55'
        }`}
      >
        {/* Logo */}
        <a href="#inicio" className="group flex shrink-0 items-center gap-2.5">
          <img
            src={cenarepasLogo}
            alt={nombreProyecto}
            className="h-8 w-8 shrink-0 object-contain drop-shadow-sm transition-transform group-hover:scale-105 sm:h-9 sm:w-9"
          />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className={`text-sm font-extrabold tracking-tight transition-colors ${isHero ? 'text-white' : 'text-slate-900'}`}>
              {nombreProyecto}
            </span>
            <span className={`text-[10px] font-semibold tracking-[0.16em] uppercase transition-colors ${isHero ? 'text-white/85' : 'text-slate-600'}`}>
              FÁBRICA DE AREPAS
            </span>
          </span>
        </a>

        {/* Navegación Desktop */}
        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={link.suave ? (e) => irASeccion(e, link.href) : undefined}
                className={linkClass(isActive)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                {link.label}
              </motion.a>
            );
          })}
        </nav>

        {/* Acciones */}
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#C1502D] px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#C1502D]/25 transition-all hover:-translate-y-0.5 hover:bg-[#8A3418] active:translate-y-0 active:scale-95"
          >
            <LogIn className="size-3.5" aria-hidden />
            <span>Ingresar</span>
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`flex size-9 items-center justify-center rounded-full transition-colors lg:hidden ${
              isHero ? 'text-white hover:bg-white/15' : 'text-slate-900 hover:bg-black/5'
            }`}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Menú Mobile Desplegable */}
      <div
        className={`mx-auto mt-2 max-w-6xl overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300 lg:hidden ${
          open ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
        } ${isHero ? 'border-white/15 bg-[#120b07]/80' : 'border-[#e8dcc0] bg-white/95'}`}
      >
        <nav className="flex flex-col gap-1 px-3 py-3">
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  if (link.suave) irASeccion(e, link.href);
                  setOpen(false);
                }}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  isActive
                    ? 'bg-[#c1502d] text-white'
                    : isHero
                    ? 'text-white/80 hover:bg-white/10 hover:text-white'
                    : 'text-slate-700 hover:bg-black/5 hover:text-slate-900'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

