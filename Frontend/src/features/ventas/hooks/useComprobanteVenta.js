import { useState } from 'react';
import { obtenerUrlComprobante } from '../services/ventasService';

const MENSAJES = {
  401: 'Tu sesión expiró. Inicia sesión de nuevo para ver el comprobante.',
  403: 'No tienes permiso para ver el comprobante de esta venta.',
  404: 'Esta venta no tiene comprobante adjunto.',
};

/** Abre el comprobante de pago de una venta en una pestaña nueva (con la sesión). */
export function useComprobanteVenta(idVenta) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const abrir = async () => {
    setError('');
    // La pestaña se abre antes de esperar al servidor para que el navegador no la bloquee.
    const ventana = window.open('', '_blank');
    setCargando(true);
    try {
      const { url, local } = await obtenerUrlComprobante(idVenta);
      if (!url) throw Object.assign(new Error(MENSAJES[404]), { status: 404 });
      if (ventana) {
        ventana.opener = null;
        ventana.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener');
      }
      if (local) setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      ventana?.close();
      setError(MENSAJES[err.status] || err.message || 'No se pudo abrir el comprobante');
    } finally {
      setCargando(false);
    }
  };

  return { abrir, cargando, error };
}
