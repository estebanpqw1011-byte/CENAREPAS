// Reglas de negocio que la web necesita conocer. Deben coincidir con
// Backend/src/config/negocio.js (y con lib/core/constants/negocio.dart de la app).

/** Municipios del Área Metropolitana donde se entrega (CA-158-001). */
export const MUNICIPIOS_ENTREGA = [
  'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella',
  'Caldas', 'Copacabana', 'Girardota', 'Barbosa',
];

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PP', 'TI'];

/** Sede de los pedidos del cliente: el backend la asigna sola (SEDE_PEDIDOS_CLIENTE). */
export const SEDE_PEDIDOS_CLIENTE = 'Aranjuez';

/** Costo de envío desactivado (COSTO_ENVIO del backend). */
export const COSTO_ENVIO = 0;

/** Días hacia adelante que se pueden elegir como fecha de entrega (igual que la app). */
export const DIAS_MAXIMOS_ENTREGA = 60;

/** Comprobantes de pago (CA-159-002): JPG, PNG o PDF de máximo 5 MB. */
export const COMPROBANTE_MAX_BYTES = 5 * 1024 * 1024;
export const COMPROBANTE_TIPOS = ['image/jpeg', 'image/png', 'application/pdf'];

/** Estados del pedido (los de la base y la app). */
export const ESTADOS_PEDIDO = ['Pendiente', 'En proceso', 'Entregado', 'Anulado'];

/** Horas antes de las 00:00 del día de entrega en que el cliente aún puede anular (CA-164-001). */
export const ANTICIPACION_ANULAR_HORAS = 24;
