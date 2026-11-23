import { Search, X } from 'lucide-react';

/** Buscador del catálogo (categorías o productos de una categoría). */
export default function BuscadorCatalogo({ id, valor, onCambiar, placeholder, etiqueta }) {
  return (
    <div className="relative max-w-xl">
      <label htmlFor={id} className="sr-only">{etiqueta}</label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        type="search"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#C1502D] focus:outline-none focus:ring-2 focus:ring-[#C1502D]/15"
      />
      {valor && (
        <button
          type="button"
          onClick={() => onCambiar('')}
          aria-label="Borrar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
