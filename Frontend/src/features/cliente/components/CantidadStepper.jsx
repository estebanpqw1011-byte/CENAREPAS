import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';

/**
 * Menos / cantidad / más. Con 1 unidad, el botón de la izquierda quita el
 * producto (ícono de papelera). El de la derecha se apaga en el máximo.
 */
export default function CantidadStepper({ cantidad, max, onChange, nombre, size = 'md' }) {
  const enMaximo = cantidad >= max;
  const boton = size === 'sm' ? 'size-8' : 'size-9';
  const base = `${boton} inline-flex items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]`;

  return (
    <div className="inline-flex items-center gap-1.5" role="group" aria-label={`Cantidad de ${nombre}`}>
      <button
        type="button"
        onClick={() => onChange(cantidad - 1)}
        className={base}
        aria-label={cantidad <= 1 ? `Quitar ${nombre} del carrito` : `Quitar una unidad de ${nombre}`}
      >
        {cantidad <= 1 ? <Trash2 className="size-4 text-[#C1502D]" /> : <Minus className="size-4" />}
      </button>
      <span className="min-w-8 text-center text-sm font-bold tabular-nums text-foreground" aria-live="polite">
        {cantidad}
      </span>
      <button
        type="button"
        onClick={() => onChange(cantidad + 1)}
        disabled={enMaximo}
        className={base}
        aria-label={`Agregar una unidad de ${nombre}`}
        title={enMaximo ? `Máximo disponible: ${max}` : undefined}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
