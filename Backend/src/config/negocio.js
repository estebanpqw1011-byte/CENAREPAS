/**
 * Reglas de negocio configurables en un solo lugar.
 */

/** Horas mínimas antes de la fecha de entrega para que el cliente anule (CA-164-001). */
export const ANTICIPACION_ANULAR_HORAS = Number(process.env.ANTICIPACION_ANULAR_HORAS || 24);

/** Sede asignada por defecto a los pedidos hechos por clientes desde la app. */
export const SEDE_PEDIDOS_CLIENTE = process.env.SEDE_PEDIDOS_CLIENTE || 'Aranjuez';

/** Costo de envío de los pedidos de la app. Desactivado (0); cambiar aquí para reactivarlo. */
export const COSTO_ENVIO = 0;

/** Municipios del Área Metropolitana del Valle de Aburrá donde se entrega (CA-158-001). */
export const MUNICIPIOS_ENTREGA = [
  'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella',
  'Caldas', 'Copacabana', 'Girardota', 'Barbosa',
];

export const ESTADOS_PEDIDO = ['Pendiente', 'En proceso', 'Entregado', 'Anulado'];

/** Transiciones permitidas del pedido (el personal). Entregado → Anulado repone stock. */
export const TRANSICIONES_PEDIDO = {
  Pendiente: ['En proceso', 'Anulado'],
  'En proceso': ['Entregado', 'Anulado'],
  Entregado: ['Anulado'],
  Anulado: [],
};

/**
 * Anular una venta (pedido Entregado → Anulado): solo dentro de estas horas
 * contadas desde fecha_entregado (cambiar a 24 aquí o con la variable de entorno).
 */
export const HORAS_LIMITE_ANULACION = Number(process.env.HORAS_LIMITE_ANULACION || 48);

/** Roles (por nombre) que pueden anular una venta. */
export const ROLES_ANULAR_VENTA = ['Administrador'];

/** Largo del motivo al anular una venta (motivo_anulacion es VARCHAR(255)). */
export const MOTIVO_ANULACION_MIN = 10;
export const MOTIVO_ANULACION_MAX = 255;

export const MEDIOS_PAGO = ['Efectivo', 'Tarjeta', 'Transferencia'];

/**
 * Días hacia atrás que el personal puede poner como fecha de un abono (e).
 * La fecha tampoco puede ser futura ni anterior a la fecha del pedido.
 */
export const ABONO_DIAS_ATRAS_MAX = 7;

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PP', 'TI'];

/** Comprobantes de pago (CA-159-002). */
export const COMPROBANTE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPROBANTE_MIME = ['image/jpeg', 'image/png', 'application/pdf'];

/**
 * Mínimo de la contraseña (f: unificado en 8 para clientes y personal). Se
 * aplica SOLO a contraseñas nuevas o cambiadas (registro, perfil, usuarios y
 * recuperación): el login no valida la longitud, así que las contraseñas de
 * 6 o 7 caracteres que ya existen siguen funcionando.
 */
export const CONTRASENA_MIN = 8;

/** Recuperación de contraseña (f; HU-003, HU-004, CA-003-002). */
export const RECUPERACION_CODIGO_MINUTOS = 15; // vigencia del código de 6 dígitos
export const RECUPERACION_INTENTOS_MAX = 5; // al 5.º intento fallido el código se invalida
export const RECUPERACION_ESPERA_SEGUNDOS = 60; // una solicitud por minuto por correo
