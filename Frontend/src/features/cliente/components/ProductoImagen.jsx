import React, { useState } from 'react';
import { Wheat } from 'lucide-react';
import { getImageUrl } from '../../../shared/services/api';

/** Imagen del producto; sin imagen (o si no carga), un fondo de marca con un ícono. */
export default function ProductoImagen({ producto, className = '' }) {
  const [fallo, setFallo] = useState(false);
  const url = producto?.imagen_url && !fallo ? getImageUrl(producto.imagen_url) : '';

  if (url) {
    return (
      <img
        src={url}
        alt={producto.nombre}
        loading="lazy"
        onError={() => setFallo(true)}
        className={`object-cover bg-muted ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-gradient-to-br from-[#E8B23D]/25 via-[#E8B23D]/10 to-[#C1502D]/15 dark:from-[#E8B23D]/15 dark:via-transparent dark:to-[#C1502D]/20 ${className}`}
    >
      <Wheat className="size-1/3 max-w-12 text-[#C1502D]/70 dark:text-[#E8B23D]/80" strokeWidth={1.5} />
    </div>
  );
}
