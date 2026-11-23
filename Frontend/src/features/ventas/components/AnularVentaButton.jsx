import { XCircle } from 'lucide-react';
import { plazoAnulacion } from '../hooks/useAnularVenta';

const botonClass =
  'inline-flex items-center justify-center p-1.5 rounded-full text-destructive hover:bg-destructive/10 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer';

/**
 * "Anular venta" por fila: habilitado solo dentro del plazo y para los roles
 * que pueden anular. Un botón deshabilitado no muestra su title, por eso el
 * tooltip va en el span que lo envuelve.
 */
export default function AnularVentaButton({ venta, onAnular }) {
  const { vigente, horasRestantes, puedeAnularRol } = plazoAnulacion(venta);
  const motivoBloqueo = !vigente
    ? 'El plazo para anular esta venta ya venció'
    : !puedeAnularRol
      ? 'Solo un Administrador puede anular ventas'
      : '';

  return (
    <span className="inline-flex items-center gap-1" title={motivoBloqueo || `Anular venta · Anulable por ${horasRestantes} h`}>
      <button
        type="button"
        onClick={() => onAnular(venta)}
        disabled={Boolean(motivoBloqueo)}
        className={botonClass}
        aria-label={motivoBloqueo || 'Anular venta'}
      >
        <XCircle className="w-4 h-4 shrink-0" />
      </button>
      {vigente && <span className="text-[11px] text-muted-foreground whitespace-nowrap">Anulable por {horasRestantes} h</span>}
    </span>
  );
}
