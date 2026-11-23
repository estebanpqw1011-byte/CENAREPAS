import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Search, X, ShoppingBag, ShoppingCart, ArrowRight, Plus, ShieldAlert } from 'lucide-react';
import { useClienteCart } from '../context/ClienteCartContext';
import { getCategoriasCatalogo, getProductosCatalogo } from '../services/catalogoService';
import {
  estaDisponible,
  estaVencido,
  formatCOP,
  normalizarTexto,
  precioDe,
  stockDe,
} from '../utils/catalogo';
import ProductoImagen from '../components/ProductoImagen';
import CantidadStepper from '../components/CantidadStepper';
import { tieneFicha } from '../utils/sesion';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import EmptyState from '../../../shared/components/EmptyState';
import { Skeleton } from '../../../shared/components/Skeleton';
import { toast } from '../../../shared/utils/toast.jsx';

function TarjetaProducto({ producto, puedePedir }) {
  const { cantidadDe, addItem, updateQuantity } = useClienteCart();
  const cantidad = cantidadDe(producto.id_producto);
  const stock = stockDe(producto);
  const disponible = estaDisponible(producto);
  const motivo = estaVencido(producto) ? 'Vencido' : 'Agotado';

  const agregar = () => {
    if (addItem(producto, 1) > 0) toast.success(`${producto.nombre} quedó en tu carrito`);
  };

  const cambiarCantidad = (nueva) => {
    if (nueva > stock) {
      toast.warning(`Solo hay ${stock} unidades disponibles de ${producto.nombre}`);
      return;
    }
    updateQuantity(producto.id_producto, nueva);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-lg hover:shadow-[#C1502D]/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductoImagen producto={producto} className="absolute inset-0 size-full" />
        {!disponible && (
          <span className="absolute left-3 top-3 rounded-full bg-[#2D2926]/85 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white">
            {motivo}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#5A7A3A] dark:text-[#AEC094]">
          {producto.categoria_nombre}
        </span>
        <h3 className="text-base font-bold leading-snug text-foreground">{producto.nombre}</h3>
        {producto.descripcion && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{producto.descripcion}</p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
          <span className="text-lg font-extrabold tabular-nums text-[#C1502D] dark:text-[#E8B23D]">
            {formatCOP(precioDe(producto))}
          </span>

          {!disponible ? (
            <span className="text-xs font-semibold text-muted-foreground">No disponible</span>
          ) : !puedePedir ? null : cantidad > 0 ? (
            <CantidadStepper
              cantidad={cantidad}
              max={stock}
              nombre={producto.nombre}
              size="sm"
              onChange={cambiarCantidad}
            />
          ) : (
            <button
              type="button"
              onClick={agregar}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1502D] px-3.5 py-2 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A84223] active:bg-[#8C341A] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] focus-visible:ring-offset-2"
            >
              <Plus className="size-4" />
              Agregar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CatalogoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ClienteCatalogoPage() {
  const { totalCount, totalAmount } = useClienteCart();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState(null);
  // Sin ficha (fila en cliente) solo puede mirar el catálogo.
  const puedePedir = tieneFicha();

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [listaProductos, listaCategorias] = await Promise.all([
        getProductosCatalogo(),
        getCategoriasCatalogo(),
      ]);
      setProductos(Array.isArray(listaProductos) ? listaProductos : []);
      setCategorias(Array.isArray(listaCategorias) ? listaCategorias : []);
    } catch (err) {
      setError(err?.message || 'No se pudo cargar el catálogo.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Solo las categorías que tienen productos en el catálogo, con su cantidad.
  const chips = useMemo(() => {
    const conteo = new Map();
    productos.forEach((p) => conteo.set(p.id_categoria, (conteo.get(p.id_categoria) || 0) + 1));
    return categorias
      .filter((c) => conteo.has(c.id_categoria))
      .map((c) => ({ id: c.id_categoria, nombre: c.nombre, cantidad: conteo.get(c.id_categoria) }));
  }, [productos, categorias]);

  const visibles = useMemo(() => {
    const texto = normalizarTexto(busqueda);
    return productos
      .filter((p) => categoriaId === null || p.id_categoria === categoriaId)
      .filter(
        (p) =>
          !texto ||
          normalizarTexto(p.nombre).includes(texto) ||
          normalizarTexto(p.descripcion).includes(texto) ||
          normalizarTexto(p.categoria_nombre).includes(texto)
      )
      .sort((a, b) => normalizarTexto(a.nombre).localeCompare(normalizarTexto(b.nombre)));
  }, [productos, categoriaId, busqueda]);

  const filtrando = busqueda.trim() !== '' || categoriaId !== null;

  const chipClase = (activo) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] ${
      activo
        ? 'border-[#C1502D] bg-[#C1502D] text-white'
        : 'border-border bg-card text-foreground hover:bg-muted'
    }`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Arepas recién hechas y complementos para tu pedido. Despachamos desde la sede Aranjuez.
        </p>
      </header>

      {!puedePedir && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#E8B23D]/40 bg-[#E8B23D]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2.5 text-sm text-foreground">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[#8A5A14] dark:text-[#E8B23D]" />
            Completa tu perfil para poder hacer pedidos.
          </p>
          <NavLink to="/cliente/perfil" className="shrink-0 rounded-xl bg-[#C1502D] px-4 py-2 text-center text-sm font-bold text-white hover:bg-[#A84223]">
            Completar perfil
          </NavLink>
        </div>
      )}

      <div className="space-y-3">
        <div className="relative max-w-xl">
          <label htmlFor="buscar-catalogo" className="sr-only">Buscar productos</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="buscar-catalogo"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar arepas, bebidas…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C1502D] focus:outline-none focus:ring-2 focus:ring-[#C1502D]/15"
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => setBusqueda('')}
              aria-label="Borrar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {chips.length > 0 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por categoría">
            <button type="button" aria-pressed={categoriaId === null} onClick={() => setCategoriaId(null)} className={chipClase(categoriaId === null)}>
              Todas
              <span className="tabular-nums opacity-75">{productos.length}</span>
            </button>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={categoriaId === c.id}
                onClick={() => setCategoriaId(categoriaId === c.id ? null : c.id)}
                className={chipClase(categoriaId === c.id)}
              >
                {c.nombre}
                <span className="tabular-nums opacity-75">{c.cantidad}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <ErrorBanner message={error} onRetry={cargar} />

      {cargando ? (
        <CatalogoSkeleton />
      ) : error ? null : visibles.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card">
          <EmptyState
            icon={ShoppingBag}
            isFiltered={filtrando}
            title={filtrando ? 'No encontramos productos' : 'Aún no hay productos disponibles'}
            description={
              filtrando
                ? 'Prueba con otra palabra o elige otra categoría.'
                : 'Vuelve pronto: estamos preparando nuevas arepas para ti.'
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => (
            <TarjetaProducto key={p.id_producto} producto={p} puedePedir={puedePedir} />
          ))}
        </div>
      )}

      {puedePedir && totalCount > 0 && (
        <div className="sticky bottom-20 z-30 md:bottom-4">
          <NavLink
            to="/cliente/carrito"
            className="flex items-center justify-between gap-3 rounded-2xl bg-[#C1502D] px-4 py-3 text-white shadow-lg shadow-[#C1502D]/25 transition-colors hover:bg-[#A84223] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2"
          >
            <span className="flex items-center gap-2.5 text-sm font-semibold">
              <ShoppingCart className="size-5" />
              <span>
                {totalCount} {totalCount === 1 ? 'producto' : 'productos'} ·{' '}
                <span className="font-extrabold tabular-nums">{formatCOP(totalAmount)}</span>
              </span>
            </span>
            <span className="flex items-center gap-1 text-sm font-bold">
              Ver carrito
              <ArrowRight className="size-4" />
            </span>
          </NavLink>
        </div>
      )}
    </div>
  );
}
