import React from 'react';

const ESTILOS = {
  Pendiente: 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]',
  'En proceso': 'bg-[#C1502D]/15 text-[#C1502D] dark:text-[#FFAAA0]',
  Entregado: 'bg-[#5A7A3A]/15 text-[#5A7A3A] dark:text-[#AEC094]',
  Anulado: 'bg-muted text-muted-foreground',
  // Estados de los abonos
  Aprobado: 'bg-[#5A7A3A]/15 text-[#5A7A3A] dark:text-[#AEC094]',
  'En revisión': 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]',
  Rechazado: 'bg-destructive/10 text-destructive',
  // Estados de los créditos
  Activo: 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]',
  Pagado: 'bg-[#5A7A3A]/15 text-[#5A7A3A] dark:text-[#AEC094]',
};

export default function EstadoPedidoBadge({ estado }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTILOS[estado] || 'bg-muted text-foreground'}`}>
      {estado}
    </span>
  );
}
