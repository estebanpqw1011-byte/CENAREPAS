import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { useCatalogoPublico } from '../hooks/useCatalogoPublico';
import BuscadorCatalogo from '../components/BuscadorCatalogo';
import ProductoCard from '../components/ProductoCard';
import CatalogoGridSkeleton from '../components/CatalogoGridSkeleton';
import CarritoBarraFlotante from '../components/CarritoBarraFlotante';
import { normalizarTexto } from '../../cliente/utils/catalogo';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import EmptyState from '../../../shared/components/EmptyState';

function VolverACategorias() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 rounded-lg text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
    >
      <ArrowLeft className="size-4" />
      Volver a categorías
    </Link>
  );
}

/** Productos de una categoría (productos_categoria_screen.dart), filtrados por id_categoria. */
export default function CatalogoProductosPage() {
  const { id } = useParams();
  const idCategoria = Number(id);
  const { categorias, productos, cargando, error, recargar } = useCatalogoPublico();
  const [busqueda, setBusqueda] = useState('');

  const categoria = categorias.find((c) => c.id_categoria === idCategoria);

  const visibles = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    return productos
      .filter((p) => p.id_categoria === idCategoria)
      .filter((p) => !texto || normalizarTexto(p.nombre).includes(texto) || normalizarTexto(p.descripcion).includes(texto))
      .sort((a, b) => normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)));
  }, [productos, idCategoria, busqueda]);

  // La categoría no existe o está inactiva (el backend no la devuelve sin sesión).
  if (!cargando && !error && !categoria) {
    return (
      <div className="space-y-6">
        <VolverACategorias />
        <div className="rounded-3xl border border-dashed border-border bg-card">
          <EmptyState
            icon={ShoppingBag}
            title="Esta categoría no está disponible"
            description="Puede que se haya retirado del catálogo. Elige otra categoría."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VolverACategorias />

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          {categoria?.nombre || 'Productos'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {categoria?.descripcion || 'Selección artesanal de la mejor calidad.'}
        </p>
      </header>

      <BuscadorCatalogo
        id="buscar-producto"
        etiqueta="Buscar en esta categoría"
        placeholder="Buscar en esta categoría…"
        valor={busqueda}
        onCambiar={setBusqueda}
      />

      <ErrorBanner message={error} onRetry={recargar} />

      {cargando ? (
        <CatalogoGridSkeleton />
      ) : error ? null : visibles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card">
          <EmptyState
            icon={ShoppingBag}
            isFiltered={busqueda.trim() !== ''}
            title={busqueda.trim() ? 'No encontramos productos' : 'Aún no hay productos en esta categoría'}
            description={busqueda.trim() ? 'Prueba con otra palabra.' : 'Vuelve pronto o explora otra categoría.'}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => (
            <ProductoCard key={p.id_producto} producto={p} />
          ))}
        </div>
      )}

      <CarritoBarraFlotante />
    </div>
  );
}
