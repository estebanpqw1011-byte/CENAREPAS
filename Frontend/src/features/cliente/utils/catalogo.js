// Reglas del catálogo del cliente. Son las mismas que valida el backend al
// crear el pedido (PedidosService.#cotizar): producto activo, no vencido y con
// stock suficiente para la cantidad pedida.

const formatoCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export const formatCOP = (valor) => formatoCOP.format(Number(valor) || 0);

export const precioDe = (producto) => Number(producto?.precio_venta) || 0;

/** Unidades enteras disponibles (stock_actual llega como texto decimal). */
export const stockDe = (producto) => Math.max(0, Math.floor(Number(producto?.stock_actual) || 0));

export const estaVencido = (producto) => {
  if (!producto?.fecha_vencimiento) return false;
  const vence = new Date(producto.fecha_vencimiento);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return vence < hoy;
};

export const estaActivo = (producto) => String(producto?.estado || '').toLowerCase() === 'activo';

/** Se puede pedir: activo, no vencido y con al menos una unidad. */
export const estaDisponible = (producto) =>
  estaActivo(producto) && !estaVencido(producto) && stockDe(producto) > 0;

/** Minúsculas y sin tildes, para buscar "jamon" y encontrar "Jamón". */
export const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
