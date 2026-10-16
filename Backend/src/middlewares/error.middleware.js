import { errorResponse } from '../utils/response.js';

// Mensajes para restricciones UNIQUE conocidas (código 23505 de PostgreSQL).
const MENSAJES_UNIQUE = {
  uq_usuario_correo: 'Ya existe un usuario registrado con ese correo',
  ux_usuario_correo_lower: 'Ya existe un usuario registrado con ese correo',
  uq_cliente_documento: 'Ya existe un cliente registrado con ese número de documento',
  ux_cliente_correo_lower: 'Ya existe un cliente registrado con ese correo',
  uq_cliente_usuario: 'El usuario ya está vinculado a un cliente',
  uq_credito_pedido: 'El pedido ya tiene un crédito',
};

export const errorHandler = (err, req, res, next) => {
  // Errores de PostgreSQL: se traducen a 4xx con un mensaje entendible y se
  // registran con la restricción/columna, que el cliente no ve.
  if (['23505', '23503', '23514', '22P02', '23502'].includes(err.code)) {
    console.warn(`[DB ${err.code}] ${req.method} ${req.originalUrl}: ${err.message}`
      + (err.constraint ? ` (restricción ${err.constraint})` : '')
      + (err.column ? ` (columna ${err.column})` : ''));
  }
  if (err.code === '23505') {
    return errorResponse(res, MENSAJES_UNIQUE[err.constraint] || 'El registro ya existe', 409);
  }
  if (err.code === '23503') {
    return errorResponse(res, 'La operación hace referencia a un registro que no existe o tiene historial asociado', 409);
  }
  if (err.code === '23514' || err.code === '22P02' || err.code === '23502') {
    return errorResponse(res, 'Datos inválidos: revisa los campos enviados', 400);
  }
  if (err.type === 'entity.parse.failed') {
    return errorResponse(res, 'El cuerpo de la petición no es un JSON válido', 400);
  }

  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error('[Unhandled Server Error]:', err);
  const message = status >= 500 ? 'Error interno en el servidor' : err.message;

  return errorResponse(res, message, status, err.details || null);
};

export const notFoundHandler = (req, res) => {
  return errorResponse(res, `Ruta no encontrada: [${req.method}] ${req.originalUrl}`, 404);
};
