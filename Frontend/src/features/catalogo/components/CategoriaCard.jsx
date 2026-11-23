import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductoImagen from '../../cliente/components/ProductoImagen';

/** Tarjeta de categoría: imagen, nombre y cantidad de productos (category_card.dart). */
export default function CategoriaCard({ categoria }) {
  const cantidad = Number(categoria.cantidad_productos) || 0;
  return (
    <Link
      to={`/catalogo/categoria/${categoria.id_categoria}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xs transition-shadow hover:shadow-lg hover:shadow-[#C1502D]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <ProductoImagen
          producto={categoria}
          className="absolute inset-0 size-full transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <h2 className="text-base font-bold leading-snug text-foreground">{categoria.nombre}</h2>
        {categoria.descripcion && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{categoria.descripcion}</p>
        )}
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#5A7A3A] dark:text-[#AEC094]">
            {cantidad} {cantidad === 1 ? 'producto' : 'productos'}
          </span>
          <ArrowRight className="size-4 text-[#C1502D] transition-transform group-hover:translate-x-0.5 dark:text-[#E8B23D]" />
        </div>
      </div>
    </Link>
  );
}
