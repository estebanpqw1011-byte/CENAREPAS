import { query, pool } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

const sanitizeInsumos = (insumos) => {
  if (!Array.isArray(insumos)) return [];
  return insumos.filter(
    (item) => item && item.id_insumo != null && Number(item.cantidad) > 0
  );
};

export class ProduccionService {
  static async getAll() {
    const res = await query(`
      SELECT lp.*, f.nombre AS ficha_nombre, u.nombre AS responsable_nombre,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id_lote_insumo', lpi.id_lote_insumo,
                   'id_insumo', lpi.id_insumo,
                   'insumo_nombre', i.nombre,
                   'cantidad_consumida', lpi.cantidad_consumida
                 )
               ) FILTER (WHERE lpi.id_lote_insumo IS NOT NULL),
               '[]'
             ) AS insumos_consumidos
      FROM lote_produccion lp
      LEFT JOIN ficha_tecnica f ON lp.id_ficha = f.id_ficha
      LEFT JOIN usuario u ON lp.id_usuario_responsable = u.id_usuario
      LEFT JOIN lote_produccion_insumo lpi ON lp.id_lote = lpi.id_lote
      LEFT JOIN insumo i ON lpi.id_insumo = i.id_insumo
      GROUP BY lp.id_lote, f.nombre, u.nombre
      ORDER BY lp.id_lote ASC
    `);
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM lote_produccion WHERE id_lote = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { id_ficha, id_usuario_responsable, fecha_produccion = new Date(), cantidad_producida, estado = 'En proceso', observaciones, insumos } = data;
    const insumosValidos = sanitizeInsumos(insumos);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `INSERT INTO lote_produccion (id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones]
      );
      const newLote = res.rows[0];

      for (const item of insumosValidos) {
        await client.query(
          `INSERT INTO lote_produccion_insumo (id_lote, id_insumo, cantidad_consumida)
           VALUES ($1, $2, $3)`,
          [newLote.id_lote, item.id_insumo, item.cantidad]
        );
      }

      await client.query('COMMIT');
      return newLote;
    } catch (error) {
      await client.query('ROLLBACK');
      console.warn('[ProduccionService.create] Error, se revirtió la transacción:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const { id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones, insumos } = data;
    const insumosRecibidos = Array.isArray(insumos) ? sanitizeInsumos(insumos) : null;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(
        `UPDATE lote_produccion
         SET id_ficha = COALESCE($1, id_ficha),
             id_usuario_responsable = COALESCE($2, id_usuario_responsable),
             fecha_produccion = COALESCE($3, fecha_produccion),
             cantidad_producida = COALESCE($4, cantidad_producida),
             estado = COALESCE($5, estado),
             observaciones = COALESCE($6, observaciones)
         WHERE id_lote = $7
         RETURNING *`,
        [id_ficha, id_usuario_responsable, fecha_produccion, cantidad_producida, estado, observaciones, id]
      );
      const updatedLote = res.rows[0];
      if (!updatedLote) throw notFound('Lote de producción no encontrado');

      // insumosRecibidos === null significa que el payload no incluyó el campo `insumos`:
      // no se toca la relación existente. Un array (incluso vacío) reemplaza el detalle completo.
      if (insumosRecibidos !== null) {
        await client.query('DELETE FROM lote_produccion_insumo WHERE id_lote = $1', [id]);

        for (const item of insumosRecibidos) {
          await client.query(
            `INSERT INTO lote_produccion_insumo (id_lote, id_insumo, cantidad_consumida)
             VALUES ($1, $2, $3)`,
            [id, item.id_insumo, item.cantidad]
          );
        }
      }

      await client.query('COMMIT');
      return updatedLote;
    } catch (error) {
      await client.query('ROLLBACK');
      console.warn('[ProduccionService.update] Error, se revirtió la transacción:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /** Anula el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE lote_produccion SET estado = 'Anulado' WHERE id_lote = $1 RETURNING id_lote`,
      [id]
    );
    return res.rows.length > 0;
  }
}
