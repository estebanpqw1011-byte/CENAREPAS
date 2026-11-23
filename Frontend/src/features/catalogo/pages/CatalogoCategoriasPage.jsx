import { useMemo, useState } from 'react';
import { LayoutGrid, Leaf } from 'lucide-react';
import { useCatalogoPublico } from '../hooks/useCatalogoPublico';
import BuscadorCatalogo from '../components/BuscadorCatalogo';
import CategoriaCard from '../components/CategoriaCard';
import CatalogoGridSkeleton from '../components/CatalogoGridSkeleton';
import CarritoBarraFlotante from '../components/CarritoBarraFlotante';
import { normalizarTexto } from '../../cliente/utils/catalogo';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import EmptyState from '../../../shared/components/EmptyState';

/** Entrada del catálogo público: las categorías (catalogo_publico_screen.dart). */
export default function CatalogoCategoriasPage() {
  const { categorias, cargando, error, recargar } = useCatalogoPublico({ productos: false });
  const [busqueda, setBusqueda] = useState('');

  const visibles = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    return categorias
      .filter((c) => !texto || normalizarTexto(c.nombre).includes(texto) || normalizarTexto(c.descripcion).includes(texto))
      .sort((a, b) => normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)));
  }, [categorias, busqueda]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#C1502D] dark:text-[#E8B23D]">
          Explora nuestro catálogo
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Categorías</h1>
        <p className="text-sm text-muted-foreground">Selecciona una línea tradicional de arepas artesanales.</p>
      </header>

      <BuscadorCatalogo
        id="buscar-categoria"
        etiqueta="Buscar categoría"
        placeholder="Buscar categoría…"
        valor={busqueda}
        onCambiar={setBusqueda}
      />

      <ErrorBanner message={error} onRetry={recargar} />

      {cargando ? (
        <CatalogoGridSkeleton />
      ) : error ? null : visibles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card">
          <EmptyState
            icon={LayoutGrid}
            isFiltered={busqueda.trim() !== ''}
            title={busqueda.trim() ? 'No encontramos categorías' : 'Aún no hay categorías disponibles'}
            description={busqueda.trim() ? `Nada coincide con "${busqueda.trim()}".` : 'Vuelve pronto: estamos preparando nuevas arepas.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((c) => (
            <CategoriaCard key={c.id_categoria} categoria={c} />
          ))}
        </div>
      )}

      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#5A7A3A]/15">
          <Leaf className="size-5 text-[#5A7A3A] dark:text-[#AEC094]" />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">100% Maíz Natural</p>
          <p className="text-xs text-muted-foreground">Sin conservantes artificiales. Empaques biodegradables.</p>
        </div>
      </div>

      <CarritoBarraFlotante />
    </div>
  );
}
