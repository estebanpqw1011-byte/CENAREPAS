// comprasService.js - Servicio para la gestión de compras en Masarepas
import { api, apiBlob } from '../../../shared/services/api.js';

export let mockCompras = [];
export const mockDetallesCompra = [];

export const getCompras = async () => {
  return api.get('/compras');
};

export const createCompra = async (compra) => {
  return api.post('/compras', compra);
};

export const updateCompra = async (id_compra, compra) => {
  return api.put(`/compras/${id_compra}`, compra);
};

export const anularCompra = async (id_compra) => {
  return api.delete(`/compras/${id_compra}`);
};

/**
 * Soporte (factura) de la compra, listo para abrir o descargar: devuelve
 * { url, local }. En Cloudinary es un enlace temporal firmado; si el backend
 * lo guardó en disco, se descarga con la sesión y se entrega como objectURL
 * (quien lo use debe liberarlo con URL.revokeObjectURL).
 */
export const getSoporteCompra = async (id_compra) => {
  const enlace = await api.get(`/compras/${id_compra}/comprobante`);
  if (enlace?.tipo === 'local') {
    const blob = await apiBlob(`/compras/${id_compra}/comprobante/archivo`);
    return { url: URL.createObjectURL(blob), local: true };
  }
  return { url: enlace?.url, local: false };
};
