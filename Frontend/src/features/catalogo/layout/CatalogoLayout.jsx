import { Link, NavLink, Outlet } from 'react-router-dom';
import { LogIn, Moon, Sun } from 'lucide-react';
import { CatalogoCartProvider } from '../context/CatalogoCartContext';
import CarritoBoton from '../components/CarritoBoton';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import cenarepasLogo from '../../../assets/cenarepas-icon.svg';

/**
 * Catálogo público (sin sesión): encabezado con logo, "Conócenos" (landing),
 * carrito siempre visible, tema e "Iniciar sesión". El carrito se conserva al
 * navegar porque el proveedor envuelve todas las páginas del catálogo.
 */
export default function CatalogoLayout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <CatalogoCartProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md transition-colors">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <Link
              to="/"
              className="group flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
            >
              <img
                src={cenarepasLogo}
                alt="CENAREPAS"
                className="h-9 w-9 rounded-lg object-contain drop-shadow-xs transition-transform group-hover:scale-105"
              />
              <span className="flex flex-col leading-none">
                <span className="text-base font-extrabold tracking-tight text-foreground">CENAREPAS</span>
                <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sabor Tradicional
                </span>
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <NavLink
                to="/inicio"
                className="rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:text-sm"
              >
                Conócenos
              </NavLink>
              <CarritoBoton />
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-xl border border-border bg-card p-2 text-foreground transition-colors hover:bg-muted/80 cursor-pointer"
                title={theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}
                aria-label="Cambiar tema visual"
              >
                {theme === 'dark' ? <Sun className="size-4.5 text-[#E8B23D]" /> : <Moon className="size-4.5 text-muted-foreground" />}
              </button>
              <Link
                to="/admin/login"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1502D] px-3 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#A84223] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] focus-visible:ring-offset-2 sm:px-3.5 sm:text-sm"
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Iniciar sesión</span>
                <span className="sm:hidden">Entrar</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <Outlet />
        </main>
      </div>
    </CatalogoCartProvider>
  );
}
