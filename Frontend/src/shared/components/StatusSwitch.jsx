import { useState, useEffect } from 'react';
import { toast } from '../utils/toast';

export default function StatusSwitch({
  value,
  onChange,
  onToggle,
  activeValue = 'activo',
  inactiveValue = 'inactivo',
  entityLabel = 'Estado',
  activeLabel,
  inactiveLabel,
  disabled = false,
}) {
  const checkIsActive = (val) => {
    const s = String(val ?? '').toLowerCase().trim();
    return (
      s === String(activeValue).toLowerCase() ||
      s === 'activo' ||
      s === 'disponible' ||
      s === 'completada' ||
      s === 'completado' ||
      s === 'entregado' ||
      s === 'true'
    );
  };

  const [enabled, setEnabled] = useState(() => checkIsActive(value));

  useEffect(() => {
    setEnabled(checkIsActive(value));
  }, [value, activeValue]);

  const getDisplayLabel = () => {
    if (enabled) {
      if (activeLabel) return activeLabel;
      if (String(activeValue).toLowerCase() === 'completada') return 'Completada';
      if (String(value).toLowerCase() === 'disponible') return 'Disponible';
      return 'Activo';
    } else {
      if (inactiveLabel) return inactiveLabel;
      if (String(inactiveValue).toLowerCase() === 'anulada') return 'Anulada';
      return 'Inactivo';
    }
  };

  const displayLabel = getDisplayLabel();

  const handleToggle = (e) => {
    e?.stopPropagation?.();
    if (disabled) return;
    if (onToggle) {
      onToggle(e);
      return;
    }
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    const nextVal = nextEnabled ? activeValue : inactiveValue;
    onChange?.(nextVal);
    toast.success(`${entityLabel} cambiado a ${nextEnabled ? (activeLabel || 'Activo') : (inactiveLabel || 'Inactivo')}`);
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={`${entityLabel}: ${displayLabel}`}
      disabled={disabled}
      onClick={handleToggle}
      className={`inline-flex items-center gap-2.5 px-2 py-1 -mx-2 -my-1 rounded-full transition-colors duration-150 select-none group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5A7A3A]/40 ${
        disabled
          ? 'cursor-default opacity-85'
          : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 cursor-pointer'
      }`}
    >
      {/* Track del Switch */}
      <div
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          enabled
            ? 'bg-[#5A7A3A] dark:bg-[#5A7A3A]'
            : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        {/* Thumb Deslizante */}
        <span
          className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200 ease-in-out ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </div>

      {/* Etiqueta de Texto Separada */}
      <span
        className={`text-xs font-semibold select-none transition-colors duration-200 ${
          enabled
            ? 'text-[#5A7A3A] dark:text-[#AEC094]'
            : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {displayLabel}
      </span>
    </button>
  );
}
