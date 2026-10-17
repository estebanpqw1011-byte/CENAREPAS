// Reglas de negocio que la web necesita conocer. Deben coincidir con
// Backend/src/config/negocio.js (y con lib/core/constants/negocio.dart de la app).

/** Municipios del Área Metropolitana donde se entrega (CA-158-001). */
export const MUNICIPIOS_ENTREGA = [
  'Medellín', 'Bello', 'Itagüí', 'Envigado', 'Sabaneta', 'La Estrella',
  'Caldas', 'Copacabana', 'Girardota', 'Barbosa',
];

export const TIPOS_DOCUMENTO = ['CC', 'CE', 'NIT', 'PP', 'TI'];

/** Nombre de cada tipo de documento (igual que GET /opciones/tipos-documento). */
export const NOMBRES_DOCUMENTO = {
  CC: 'Cédula de ciudadanía',
  CE: 'Cédula de extranjería',
  NIT: 'NIT',
  PP: 'Pasaporte',
  TI: 'Tarjeta de identidad',
};

/** Opciones para un selector de tipo de documento. */
export const OPCIONES_TIPO_DOCUMENTO = TIPOS_DOCUMENTO.map((t) => ({ value: t, label: t === 'NIT' ? 'NIT' : `${t} · ${NOMBRES_DOCUMENTO[t]}` }));

/** Número de documento: 5 a 20 letras, números, puntos o guiones (igual que el backend). */
export const DOCUMENTO_VALIDO = /^[0-9A-Za-z.-]{5,20}$/;

/** Tipos de persona de clientes y proveedores. Jurídica: NIT y razón social. */
export const TIPOS_PERSONA = ['Natural', 'Jurídica'];

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
