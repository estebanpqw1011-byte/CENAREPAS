// Checkout del cliente: validaciones (con los mismos mensajes que
// PedidosService.crearPorCliente del backend) y el cuerpo de POST /mi/pedidos.
import {
  COMPROBANTE_MAX_BYTES,
  COMPROBANTE_TIPOS,
  DIAS_MAXIMOS_ENTREGA,
  MUNICIPIOS_ENTREGA,
} from '../../../shared/config/negocio.js';

export const MEDIOS_PAGO = [
  { valor: 'Efectivo', titulo: 'Efectivo', detalle: 'Paga al recibir tu pedido en la puerta.' },
  { valor: 'Tarjeta', titulo: 'Tarjeta (datáfono al recibir)', detalle: 'Paga con débito o crédito cuando recibas tu pedido.' },
  { valor: 'Transferencia', titulo: 'Transferencia directa', detalle: 'Nequi, Daviplata o Bancolombia. Adjunta el comprobante.' },
];

// Copiadas de la app (checkout/presentation/screens/metodo_pago_screen.dart).
// Nada en los repositorios confirma que sean las cuentas reales de CENAREPAS:
// confirmarlas antes de producción.
export const CUENTAS_TRANSFERENCIA = [
  { entidad: 'Bancolombia · Ahorros', numero: '302-849201-44', copiar: '30284920144' },
  { entidad: 'Nequi / Daviplata', numero: '314 582 9901', copiar: '3145829901' },
];

const aISO = (fecha) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

/** Hoy y el último día elegible, en la fecha local del navegador (AAAA-MM-DD). */
export const hoyISO = () => aISO(new Date());
export const fechaMaximaISO = () => {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + DIAS_MAXIMOS_ENTREGA);
  return aISO(fecha);
};

/** Errores por campo de la entrega ({} si todo está bien). */
export function validarEntrega({ municipio, direccion, barrio, fechaEntrega }) {
  const errores = {};
  if (!fechaEntrega) errores.fecha_entrega = 'Elige el día de entrega';
  else if (fechaEntrega < hoyISO()) errores.fecha_entrega = 'La fecha de entrega no puede ser anterior a hoy';
  else if (fechaEntrega > fechaMaximaISO()) errores.fecha_entrega = `Elige un día dentro de los próximos ${DIAS_MAXIMOS_ENTREGA} días`;
  if (!MUNICIPIOS_ENTREGA.includes(municipio)) errores.municipio = 'Solo entregamos en el Área Metropolitana de Medellín';
  if (String(direccion || '').trim().length < 5) errores.direccion = 'Ingresa la dirección de entrega';
  if (!String(barrio || '').trim()) errores.barrio = 'Ingresa el barrio';
  return errores;
}

/** CA-161-001: el abono es un entero mayor a 0 y menor al total. */
export function validarAbono(valor, total) {
  if (!Number.isInteger(valor) || valor <= 0) return 'El abono debe ser mayor a $0';
  if (valor >= total) return 'El abono debe ser menor al total del pedido';
  return null;
}

export function validarComprobante(archivo) {
  if (!archivo) return 'Adjunta el comprobante';
  if (!COMPROBANTE_TIPOS.includes(archivo.type)) return 'El comprobante debe ser JPG, PNG o PDF';
  if (archivo.size > COMPROBANTE_MAX_BYTES) return 'El comprobante supera el máximo de 5 MB';
  return null;
}

/**
 * Cuerpo de POST /mi/pedidos. El cliente sale del token, y la sede (Aranjuez),
 * los precios y el total los pone el backend.
 */
export function armarCuerpoPedido({ items, entrega, fechaEntrega, medioPago, comprobanteUrl, valorAbono }) {
  const cuerpo = {
    fecha_entrega: fechaEntrega,
    medio_pago: medioPago,
    detalles: items.map((i) => ({ id_producto: i.producto.id_producto, cantidad: i.cantidad })),
    entrega: {
      municipio: entrega.municipio,
      direccion: entrega.direccion.trim(),
      barrio: entrega.barrio.trim(),
      complemento: entrega.complemento.trim() || undefined,
      indicaciones: entrega.indicaciones.trim() || undefined,
    },
  };
  if (medioPago === 'Transferencia') cuerpo.comprobante_url = comprobanteUrl;
  if (valorAbono > 0) cuerpo.valor_abono = valorAbono;
  return cuerpo;
}
