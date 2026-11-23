import { api } from '../../../shared/services/api.js';

/** Sube el comprobante (campo "comprobante") y devuelve { url, nombre_original, tipo, tamano }. */
export const subirComprobante = (archivo) => {
  const datos = new FormData();
  datos.append('comprobante', archivo);
  return api.post('/comprobantes', datos);
};

/** Crea el pedido del cliente; responde el pedido completo (detalles, crédito y sede). */
export const crearPedidoCliente = (cuerpo) => api.post('/mi/pedidos', cuerpo);
