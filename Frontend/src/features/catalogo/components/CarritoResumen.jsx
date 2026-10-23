import { ArrowRight } from 'lucide-react';
import { formatCOP } from '../../cliente/utils/catalogo';
import { COSTO_ENVIO } from '../../../shared/config/negocio';

/** Subtotal, envío y total, con el botón para confirmar el pedido. */
export default function CarritoResumen({ totalItems, subtotal, puedeConfirmar, aviso, onConfirmar }) {
  const envio = totalItems > 0 ? COSTO_ENVIO : 0;
  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs lg:sticky lg:top-24">
      <h2 className="text-base font-bold text-foreground">Resumen del pedido</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">
            Subtotal ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
          </dt>
          <dd className="font-semibold tabular-nums text-foreground">{formatCOP(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Envío</dt>
          <dd className="font-semibold text-[#5A7A3A] dark:text-[#AEC094]">{envio > 0 ? formatCOP(envio) : 'Sin costo'}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-border pt-3 text-base">
          <dt className="font-bold text-foreground">Total</dt>
          <dd className="font-extrabold tabular-nums text-[#C1502D] dark:text-[#E8B23D]">{formatCOP(subtotal + envio)}</dd>
        </div>
      </dl>

      {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}

      <button
        type="button"
        onClick={onConfirmar}
        disabled={!puedeConfirmar}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C1502D] px-4 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A84223] active:bg-[#8C341A] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] focus-visible:ring-offset-2"
      >
        Confirmar pedido
        <ArrowRight className="size-4" />
      </button>
    </aside>
  );
}
