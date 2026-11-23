import { AlertTriangle, Trash2 } from 'lucide-react';
import ProductoImagen from '../../cliente/components/ProductoImagen';
import CantidadStepper from '../../cliente/components/CantidadStepper';
import { formatCOP, precioDe, stockDe } from '../../cliente/utils/catalogo';

/**
 * Fila del carrito: imagen, nombre, precio, cantidad, subtotal y eliminar.
 * `problema` (texto) avisa si el producto ya no se puede pedir así.
 */
export default function CarritoItem({ item, problema, onCambiarCantidad, onEliminar }) {
  const { producto, cantidad } = item;
  const precio = precioDe(producto);

  return (
    <li className="flex gap-4 p-4">
      <ProductoImagen producto={producto} className="size-20 shrink-0 rounded-xl sm:size-24" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground sm:text-base">{producto.nombre}</h3>
            <p className="text-xs text-muted-foreground tabular-nums">{formatCOP(precio)} c/u</p>
          </div>
          <button
            type="button"
            onClick={() => onEliminar(producto.id_producto)}
            aria-label={`Eliminar ${producto.nombre} del carrito`}
            title="Eliminar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-[#C1502D] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {problema && (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-[#8A5A14] dark:text-[#E8B23D]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            {problema}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <CantidadStepper
            cantidad={cantidad}
            max={Math.max(stockDe(producto), cantidad)}
            nombre={producto.nombre}
            size="sm"
            onChange={(nueva) => onCambiarCantidad(producto.id_producto, nueva)}
          />
          <span className="text-base font-extrabold tabular-nums text-foreground">{formatCOP(precio * cantidad)}</span>
        </div>
      </div>
    </li>
  );
}
