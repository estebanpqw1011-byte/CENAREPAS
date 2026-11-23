import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MOTIVO_ANULACION_MAX, MOTIVO_ANULACION_MIN } from '../hooks/useAnularVenta';

/** Confirmación de "Anular venta" con motivo obligatorio (mismo diseño que anular un pedido). */
export default function AnularVentaModal({ venta, enviando, error, onConfirmar, onCerrar, onEscribir }) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (venta) setMotivo('');
  }, [venta]);

  if (!venta) return null;
  const largo = motivo.trim().length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-anular-venta">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="titulo-anular-venta" className="text-base font-bold text-foreground">¿Anular la venta #{venta.id_venta}?</h2>
        <p className="text-sm text-muted-foreground">
          La venta queda Anulada (no se borra), se repone el inventario y se anula su crédito. Esta acción no se puede deshacer.
        </p>
        <div className="space-y-1.5">
          <label htmlFor="motivo-anulacion-venta" className="block text-sm font-semibold text-foreground">
            Motivo de anulación <span className="text-destructive">*</span>
          </label>
          <textarea
            id="motivo-anulacion-venta"
            rows={3}
            maxLength={MOTIVO_ANULACION_MAX}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              onEscribir?.();
            }}
            autoFocus
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-[#C1502D] focus:outline-none focus:ring-2 focus:ring-[#C1502D]/15"
            placeholder="Ej.: se registró la venta al cliente equivocado"
          />
          <p className="text-xs text-muted-foreground">
            {largo < MOTIVO_ANULACION_MIN ? `Mínimo ${MOTIVO_ANULACION_MIN} caracteres (llevas ${largo}).` : `${largo}/${MOTIVO_ANULACION_MAX}`}
          </p>
          {error && <p role="alert" className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onCerrar} disabled={enviando} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(motivo)}
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Anular venta
          </button>
        </div>
      </div>
    </div>
  );
}
