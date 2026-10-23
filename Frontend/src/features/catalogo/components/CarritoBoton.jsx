import { NavLink } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCatalogoCart } from '../context/CatalogoCartContext';

/** Acceso al carrito del encabezado, con la cantidad de unidades agregadas. */
export default function CarritoBoton() {
  const { totalItems } = useCatalogoCart();
  return (
    <NavLink
      to="/catalogo/carrito"
      className={({ isActive }) =>
        `relative p-2 rounded-xl border transition-all duration-150 cursor-pointer ${
          isActive
            ? 'border-[#C1502D] bg-[#C1502D]/10 text-[#C1502D] dark:border-[#E8B23D] dark:text-[#E8B23D]'
            : 'border-border bg-card text-foreground hover:bg-muted/80'
        }`
      }
      title="Ver carrito"
      aria-label={`Carrito de compras con ${totalItems} ${totalItems === 1 ? 'producto' : 'productos'}`}
    >
      <ShoppingCart className="size-4.5" />
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 flex items-center justify-center rounded-full bg-[#C1502D] text-white text-[0.7rem] font-extrabold shadow-sm animate-in zoom-in-75">
          {totalItems > 99 ? '99+' : totalItems}
        </span>
      )}
    </NavLink>
  );
}
