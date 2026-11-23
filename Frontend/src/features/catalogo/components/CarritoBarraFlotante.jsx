import { NavLink } from 'react-router-dom';
import { ArrowRight, ShoppingCart } from 'lucide-react';
import { useCatalogoCart } from '../context/CatalogoCartContext';
import { formatCOP } from '../../cliente/utils/catalogo';

/** Barra inferior con el resumen del carrito (como la de la app). Oculta si está vacío. */
export default function CarritoBarraFlotante() {
  const { totalItems, total } = useCatalogoCart();
  if (totalItems === 0) return null;

  return (
    <div className="sticky bottom-4 z-30">
      <NavLink
        to="/catalogo/carrito"
        className="flex items-center justify-between gap-3 rounded-2xl bg-[#C1502D] px-4 py-3 text-white shadow-lg shadow-[#C1502D]/25 transition-colors hover:bg-[#A84223] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold">
          <ShoppingCart className="size-5" />
          <span>
            {totalItems} {totalItems === 1 ? 'producto' : 'productos'} ·{' '}
            <span className="font-extrabold tabular-nums">{formatCOP(total)}</span>
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm font-bold">
          Ver carrito
          <ArrowRight className="size-4" />
        </span>
      </NavLink>
    </div>
  );
}
