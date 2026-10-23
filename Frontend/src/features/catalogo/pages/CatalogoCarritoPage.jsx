import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Trash2 } from 'lucide-react';
import { useCatalogoCart } from '../context/CatalogoCartContext';
import { useCatalogoPublico } from '../hooks/useCatalogoPublico';
import CarritoItem from '../components/CarritoItem';
import CarritoResumen from '../components/CarritoResumen';
import { estaDisponible, estaVencido, stockDe } from '../../cliente/utils/catalogo';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import EmptyState from '../../../shared/components/EmptyState';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/utils/toast.jsx';

/** Qué impide pedir este ítem hoy (null si nada): lo mismo que rechaza el backend. */
function problemaDe({ producto, cantidad }, idsVigentes) {
  if (idsVigentes && !idsVigentes.has(producto.id_producto)) return 'Ya no está en el catálogo.';
  if (!estaDisponible(producto)) return estaVencido(producto) ? 'Está vencido.' : 'Se agotó.';
  const stock = stockDe(producto);
  if (cantidad > stock) return `Solo hay ${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}.`;
  return null;
}

/** Carrito del catálogo público (carrito_screen.dart). */
export default function CatalogoCarritoPage() {
  const navigate = useNavigate();
  const { items, cambiarCantidad, eliminar, vaciar, sincronizar, totalItems, total } = useCatalogoCart();
  // Precios, stock y disponibilidad vigentes: el carrito guardado puede tener días.
  const { productos, cargando, error, recargar } = useCatalogoPublico({ categorias: false });
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  useEffect(() => {
    if (!cargando && !error) sincronizar(productos);
  }, [cargando, error, productos, sincronizar]);

  const idsVigentes = useMemo(
    () => (cargando || error ? null : new Set(productos.map((p) => p.id_producto))),
    [cargando, error, productos]
  );
  const problemas = useMemo(
    () => new Map(items.map((i) => [i.producto.id_producto, problemaDe(i, idsVigentes)])),
    [items, idsVigentes]
  );
  const hayProblemas = [...problemas.values()].some(Boolean);

  const alVaciar = () => {
    vaciar();
    setConfirmarVaciar(false);
    toast.success('Carrito vaciado');
  };

  // Sin sesión no se crea el pedido: se pide iniciar sesión.
  const alConfirmar = () => {
    toast.info('Inicia sesión para confirmar tu pedido.');
    navigate('/admin/login', { state: { desde: 'confirmar-pedido' } });
  };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Tu carrito</h1>
        <div className="rounded-3xl border border-dashed border-border bg-card">
          <EmptyState
            icon={ShoppingCart}
            title="Tu carrito está vacío"
            description="Explora las categorías y agrega tus arepas favoritas."
          />
          <div className="flex justify-center pb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C1502D] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A84223]"
            >
              <ArrowLeft className="size-4" />
              Ver categorías
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Seguir comprando
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Tu carrito</h1>
        </div>
        <button
          type="button"
          onClick={() => setConfirmarVaciar(true)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
        >
          <Trash2 className="size-4 text-[#C1502D]" />
          Vaciar carrito
        </button>
      </div>

      <ErrorBanner message={error} onRetry={recargar} />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((item) => (
            <CarritoItem
              key={item.producto.id_producto}
              item={item}
              problema={problemas.get(item.producto.id_producto)}
              onCambiarCantidad={cambiarCantidad}
              onEliminar={eliminar}
            />
          ))}
        </ul>

        <CarritoResumen
          totalItems={totalItems}
          subtotal={total}
          puedeConfirmar={!cargando && !hayProblemas}
          aviso={
            hayProblemas
              ? 'Corrige los productos marcados para continuar.'
              : 'Para confirmar el pedido te pediremos iniciar sesión.'
          }
          onConfirmar={alConfirmar}
        />
      </div>

      <ConfirmDialog
        isOpen={confirmarVaciar}
        title="Vaciar carrito"
        message="¿Seguro que deseas quitar todos los productos del carrito?"
        confirmText="Vaciar todo"
        onConfirm={alVaciar}
        onCancel={() => setConfirmarVaciar(false)}
      />
    </div>
  );
}
