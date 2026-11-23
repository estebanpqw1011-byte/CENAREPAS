import { Plus } from 'lucide-react';
import { useCatalogoCart } from '../context/CatalogoCartContext';
import ProductoImagen from '../../cliente/components/ProductoImagen';
import CantidadStepper from '../../cliente/components/CantidadStepper';
import { estaDisponible, estaVencido, formatCOP, precioDe, stockDe } from '../../cliente/utils/catalogo';
import { toast } from '../../../shared/utils/toast.jsx';

/** Tarjeta de producto: "Agregar" o, si ya está en el carrito, − cantidad +. */
export default function ProductoCard({ producto }) {
  const { cantidadDe, agregar, cambiarCantidad } = useCatalogoCart();
  const cantidad = cantidadDe(producto.id_producto);
  const stock = stockDe(producto);
  const disponible = estaDisponible(producto);

  const alAgregar = () => {
    if (agregar(producto) > 0) toast.success(`${producto.nombre} quedó en tu carrito`);
  };

  const alCambiar = (nueva) => {
    if (nueva > stock) {
      toast.warning(`Solo hay ${stock} unidades disponibles de ${producto.nombre}`);
      return;
    }
    cambiarCantidad(producto.id_producto, nueva);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-lg hover:shadow-[#C1502D]/10">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductoImagen producto={producto} className="absolute inset-0 size-full" />
        {!disponible && (
          <span className="absolute left-3 top-3 rounded-full bg-[#2D2926]/85 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-white">
            {estaVencido(producto) ? 'Vencido' : 'Agotado'}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
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
          ) : cantidad > 0 ? (
            <CantidadStepper cantidad={cantidad} max={stock} nombre={producto.nombre} size="sm" onChange={alCambiar} />
          ) : (
            <button
              type="button"
              onClick={alAgregar}
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
