import { badRequest } from './httpError.js';

const clave = (valor) => String(valor ?? '').trim().toLowerCase();

const MEDIOS = {
  efectivo: 'Efectivo', contado: 'Efectivo', 'contra entrega': 'Efectivo', 'efectivo contra entrega': 'Efectivo',
  tarjeta: 'Tarjeta', 'tarjeta credito': 'Tarjeta', 'tarjeta crédito': 'Tarjeta', 'tarjeta debito': 'Tarjeta',
  'tarjeta débito': 'Tarjeta', datafono: 'Tarjeta', 'datáfono': 'Tarjeta', 'tarjeta (datáfono al recibir)': 'Tarjeta',
  transferencia: 'Transferencia', 'transferencia bancaria': 'Transferencia', 'transferencia bancolombia': 'Transferencia',
  bancolombia: 'Transferencia', nequi: 'Transferencia', daviplata: 'Transferencia', pse: 'Transferencia',
};

/** Misma conversión que los scripts 002/004. Vacío → null; desconocido → 400. */
export const normalizarMedioPago = (valor, { requerido = false } = {}) => {
  if (!clave(valor)) {
    if (requerido) throw badRequest('Selecciona el método de pago: Efectivo, Tarjeta o Transferencia');
    return null;
  }
  const medio = MEDIOS[clave(valor)];
  if (!medio) throw badRequest('Método de pago no válido: usa Efectivo, Tarjeta o Transferencia');
  return medio;
};

const ESTADOS = {
  pendiente: 'Pendiente',
  'en proceso': 'En proceso',
  // Valores que aún envía la web del equipo (se documentan en CAMBIOS_PENDIENTES_WEB.md)
  'en preparacion': 'En proceso',
  'en preparación': 'En proceso',
  'listo para entregar': 'En proceso',
  entregado: 'Entregado',
  anulado: 'Anulado',
  cancelado: 'Anulado',
};

export const normalizarEstadoPedido = (valor) => {
  if (!clave(valor)) return null;
  const estado = ESTADOS[clave(valor)];
  if (!estado) throw badRequest('Estado no válido: usa Pendiente, En proceso, Entregado o Anulado');
  return estado;
};

/** Entero positivo o error. Los montos se manejan en pesos sin decimales. */
export const enteroPositivo = (valor, campo) => {
  const numero = Number(valor);
  if (!Number.isFinite(numero) || numero <= 0 || !Number.isInteger(numero)) {
    throw badRequest(`${campo} debe ser un número entero mayor a 0`);
  }
  return numero;
};

export const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * "AAAA-MM-DD" si [valor] es una fecha de calendario real (rechaza 2026-02-31);
 * null si no.
 */
export const fechaValida = (valor) => {
  const t = texto(valor);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(anio, mes - 1, dia));
  return d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia ? t : null;
};
