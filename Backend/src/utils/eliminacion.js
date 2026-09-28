import { enTransaccion } from './transaccion.js';
import { badRequest, conflict, notFound } from './httpError.js';

/**
 * Borrado definitivo (DELETE /<modulo>/:id/definitivo, permiso "eliminar"):
 * borra la fila solo si no tiene registros asociados. El DELETE /<modulo>/:id
 * de siempre sigue inactivando (lo usa la web).
 *
 * - La fila se bloquea (FOR UPDATE) mientras se revisa y se borra.
 * - [validar](db, fila) permite reglas propias (lanza el error que corresponda).
 * - [asociados] son subconsultas con $1 = id, en orden; la primera que
 *   encuentra filas responde 409 con su mensaje. Si igual llega un error de
 *   llave foránea, el errorHandler lo convierte en 409 (nunca un 500).
 * - [limpiar] son sentencias con $1 = id que se ejecutan antes del DELETE
 *   (registros propios de la fila, p. ej. el historial del pedido).
 *
 * Las tablas y columnas son constantes del código, nunca datos del usuario.
 */
export const eliminarSinAsociados = ({ tabla, llave, id, noEncontrado, asociados = [], validar, limpiar = [] }) => {
  const idNumero = Number(id);
  if (!Number.isInteger(idNumero) || idNumero <= 0) throw badRequest('El id debe ser un número entero positivo');
  return enTransaccion(async (db) => {
    const res = await db.query(`SELECT * FROM ${tabla} WHERE ${llave} = $1 FOR UPDATE`, [idNumero]);
    const fila = res.rows[0];
    if (!fila) throw notFound(noEncontrado);
    if (validar) await validar(db, fila);
    for (const { sql, mensaje } of asociados) {
      const hay = await db.query(`SELECT EXISTS (${sql}) AS hay`, [idNumero]);
      if (hay.rows[0].hay) throw conflict(mensaje);
    }
    for (const sql of limpiar) await db.query(sql, [idNumero]);
    await db.query(`DELETE FROM ${tabla} WHERE ${llave} = $1`, [idNumero]);
    return fila;
  });
};
