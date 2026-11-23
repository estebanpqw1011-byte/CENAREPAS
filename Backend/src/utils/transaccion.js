import { pool } from '../config/db.js';

/** Ejecuta fn(client) dentro de BEGIN/COMMIT; ante cualquier error hace ROLLBACK. */
export const enTransaccion = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
