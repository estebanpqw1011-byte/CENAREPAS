import { api } from '../../../shared/services/api.js';

/** Pedidos del cliente del token (opcionalmente de un estado). */
export const getMisPedidos = (estado) =>
  api.get(`/mi/pedidos${estado ? `?estado=${encodeURIComponent(estado)}` : ''}`);

/** Detalle con productos, abonos, crédito e historial de estados. */
export const getMiPedido = (id) => api.get(`/mi/pedidos/${id}`);

export const anularMiPedido = (id, motivo) => api.post(`/mi/pedidos/${id}/anular`, { motivo });
