import React from 'react';

/**
 * Transición suave e invisible en el punto de unión (últimos/primeros ~120-160px)
 * entre secciones consecutivas con fondos alternados (oscuro ↔ claro).
 *
 * Utiliza interpolación perceptual en espacio OKLCH (`in oklch`), garantizando que
 * la luminosidad varíe directamente entre los dos tonos exactos de marca sin pasar
 * por ningún punto gris, oliva ni desaturado intermedio.
 */
export function SectionTransition({
  from,
  to,
  via = [], // paradas intermedias opcionales, p. ej. la rampa cálida oscuro → claro

  height = 'h-28 sm:h-36 md:h-44',
  position = 'top', // 'top' | 'bottom'
  className = '',
}) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 ${
        position === 'top' ? 'top-0' : 'bottom-0'
      } ${height} z-0 overflow-hidden ${className}`}
      style={{
        backgroundImage: `linear-gradient(in oklch to ${
          position === 'top' ? 'bottom' : 'top'
        }, ${[from, ...via, to].join(', ')})`,
      }}
    />
  );
}
