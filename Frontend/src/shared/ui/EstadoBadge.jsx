import { cn } from './utils';

const COLOR_CLASSES = {
  neutral: 'bg-muted text-muted-foreground border-border',
  warning: 'bg-warning/10 text-warning border-warning/25',
  success: 'bg-success/10 text-success border-success/25',
  destructive: 'bg-destructive/10 text-destructive border-destructive/25',
  primary: 'bg-primary/10 text-primary border-primary/20',
};

// Heurística de respaldo para módulos que no pasen un `statusMap` propio.
const DEFAULT_STATUS_MAP = {
  activo: { color: 'success' },
  disponible: { color: 'success' },
  completado: { color: 'success' },
  completada: { color: 'success' },
  entregado: { color: 'success' },
  terminado: { color: 'success' },
  vigente: { color: 'success' },
  'en proceso': { color: 'warning' },
  pendiente: { color: 'warning' },
  'bajo stock': { color: 'warning' },
  programado: { color: 'warning' },
  inactivo: { color: 'neutral' },
  anulado: { color: 'destructive' },
  anulada: { color: 'destructive' },
  cancelado: { color: 'destructive' },
  cancelada: { color: 'destructive' },
  vencido: { color: 'destructive' },
};

/**
 * Badge genérico para estados de múltiples valores (no binarios).
 * A diferencia de StatusSwitch (activo/inactivo), no asume 2 estados:
 * cada valor se resuelve a un color/label vía `statusMap`, con una
 * heurística de respaldo para los textos de estado más comunes del sistema.
 */
export function EstadoBadge({ value, statusMap, defaultColor = 'neutral', className }) {
  const raw = value == null ? '' : String(value);
  const key = raw.trim().toLowerCase();

  const entry = (statusMap && (statusMap[key] || statusMap[raw])) || DEFAULT_STATUS_MAP[key] || null;

  const label = entry?.label ?? (raw || '—');
  const color = entry?.color ?? defaultColor;
  const colorClasses = COLOR_CLASSES[color] || COLOR_CLASSES.neutral;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap',
        colorClasses,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current shrink-0" />
      {label}
    </span>
  );
}

export default EstadoBadge;
