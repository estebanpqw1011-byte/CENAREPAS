// ventasService.js - Servicio para la gestión de ventas en Masarepas
import { api, apiBlob } from '../../../shared/services/api.js';

// incluir_anuladas=1: también las ventas anuladas (siguen visibles en Ventas).
export const getVentas = async () => {
  return api.get('/ventas?incluir_anuladas=1');
};

/** Anula la venta (queda Anulada, no se borra). El backend valida rol, motivo y plazo. */
export const anularVenta = async (idVenta, motivo) => {
  return api.post(`/ventas/${idVenta}/anular`, { motivo });
};

/**
 * Comprobante de pago (privado): el backend da una URL firmada temporal de
 * Cloudinary o, sin Cloudinary (solo local), el archivo del disco con la
 * sesión. local = true → la URL es un blob que hay que liberar.
 */
export const obtenerUrlComprobante = async (idVenta) => {
  const enlace = await api.get(`/ventas/${idVenta}/comprobante`);
  if (enlace?.tipo === 'local') {
    const blob = await apiBlob(`/ventas/${idVenta}/comprobante/archivo`);
    return { url: URL.createObjectURL(blob), local: true };
  }
  return { url: enlace?.url, local: false };
};

// Ventas de solo lectura: son los pedidos Entregado (POST, PUT y DELETE /ventas → 405);
// la única acción es anular, dentro del plazo (POST /ventas/:id/anular).