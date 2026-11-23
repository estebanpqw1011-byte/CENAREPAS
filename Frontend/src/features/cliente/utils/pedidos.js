// Pedidos del cliente: anulación (misma regla que
// PedidosService.anularPorCliente) y resumen de pagos.
import { ANTICIPACION_ANULAR_HORAS } from '../../../shared/config/negocio.js';

/** 00:00 (hora local) del día de entrega. */
const inicioDelDiaDeEntrega = (fechaEntrega) => {
  if (!fechaEntrega) return null;
  const texto = String(fechaEntrega);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T00:00:00`) : new Date(texto);
  fecha.setHours(0, 0, 0, 0);
  return fecha;
};

/**
 * Por qué no se puede anular (null si se puede): solo Pendiente y hasta
 * ANTICIPACION_ANULAR_HORAS antes de las 00:00 del día de entrega.
 */
export function motivoNoAnulable(pedido, ahora = new Date()) {
  if (pedido.estado !== 'Pendiente') {
    return `Solo puedes anular pedidos Pendientes (este está ${pedido.estado}).`;
  }
  const inicio = inicioDelDiaDeEntrega(pedido.fecha_entrega);
  if (!inicio || inicio.getTime() - ANTICIPACION_ANULAR_HORAS * 3600 * 1000 <= ahora.getTime()) {
    return `Solo puedes anular hasta ${ANTICIPACION_ANULAR_HORAS} horas antes del día de entrega.`;
  }
  return null;
}

/**
 * Pagos del pedido. Los abonos "En revisión" no descuentan el saldo del
 * crédito hasta que el personal los aprueba.
 */
export function resumenPagos(pedido) {
  const total = Number(pedido.valor_total) || 0;
  const abonos = pedido.abonos || [];
  const suma = (estado) =>
    abonos.filter((a) => a.estado === estado).reduce((s, a) => s + (Number(a.valor_abonado) || 0), 0);
  const aprobado = suma('Aprobado');
  const enRevision = suma('En revisión');
  const saldo = pedido.id_credito ? Number(pedido.credito_saldo) || 0 : total - aprobado;
  return { total, aprobado, enRevision, saldo };
}

export const fechaCorta = (valor) =>
  valor ? new Date(valor).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export const fechaHora = (valor) =>
  valor
    ? new Date(valor).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : '';
