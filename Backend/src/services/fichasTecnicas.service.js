import { pool } from '../config/db.js';

const fichaWithInsumosQuery = `
  SELECT f.*,
         COALESCE(
           json_agg(
             json_build_object(
               'id_ficha_insumo', fti.id_ficha_insumo,
               'id_insumo', fti.id_insumo,
               'insumo_nombre', i.nombre,
               'cantidad', fti.cantidad,
               'unidad_medida', fti.unidad_medida
             )
           ) FILTER (WHERE fti.id_ficha_insumo IS NOT NULL),
           '[]'
         ) AS insumos
  FROM ficha_tecnica f
  LEFT JOIN ficha_tecnica_insumo fti ON f.id_ficha = fti.id_ficha
  LEFT JOIN insumo i ON fti.id_insumo = i.id_insumo`;

export class FichasTecnicasService {
  static async getAll() {
    const res = await pool.query(`${fichaWithInsumosQuery} GROUP BY f.id_ficha ORDER BY f.id_ficha ASC`);
    return res.rows || [];
  }

  static async getById(id) {
    const res = await pool.query(
      `${fichaWithInsumosQuery} WHERE f.id_ficha = $1 GROUP BY f.id_ficha`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado = 'Activo', insumos = [] } = data;
    if (!Array.isArray(insumos)) {
      const error = new Error('La lista de insumos de la ficha no es válida');
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `INSERT INTO ficha_tecnica (nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado]
      );
      const newFicha = res.rows[0];
      for (const item of insumos) {
        await client.query(
          `INSERT INTO ficha_tecnica_insumo (id_ficha, id_insumo, cantidad, unidad_medida)
           VALUES ($1, $2, $3, $4)`,
          [newFicha.id_ficha, item.id_insumo, item.cantidad, item.unidad_medida || 'kg']
        );
      }
      const fichaResult = await client.query(
        `${fichaWithInsumosQuery} WHERE f.id_ficha = $1 GROUP BY f.id_ficha`,
        [newFicha.id_ficha]
      );
      await client.query('COMMIT');
      return fichaResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async update(id, data) {
    const { nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado, insumos } = data;
    if (insumos !== undefined && !Array.isArray(insumos)) {
      const error = new Error('La lista de insumos de la ficha no es válida');
      error.statusCode = 400;
      throw error;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query(
        `UPDATE ficha_tecnica
         SET nombre = COALESCE($1, nombre),
             descripcion = COALESCE($2, descripcion),
             instrucciones_preparacion = COALESCE($3, instrucciones_preparacion),
             tiempo_estimado_minutos = COALESCE($4, tiempo_estimado_minutos),
             rendimiento_lote = COALESCE($5, rendimiento_lote),
             estado = COALESCE($6, estado)
         WHERE id_ficha = $7
         RETURNING id_ficha`,
        [nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado, id]
      );
      if (res.rowCount === 0) {
        const error = new Error('Ficha técnica no encontrada');
        error.statusCode = 404;
        throw error;
      }

      if (insumos !== undefined) {
        await client.query('DELETE FROM ficha_tecnica_insumo WHERE id_ficha = $1', [id]);
        for (const item of insumos) {
          await client.query(
            `INSERT INTO ficha_tecnica_insumo (id_ficha, id_insumo, cantidad, unidad_medida)
             VALUES ($1, $2, $3, $4)`,
            [id, item.id_insumo, item.cantidad, item.unidad_medida || 'kg']
          );
        }
      }

      const fichaResult = await client.query(
        `${fichaWithInsumosQuery} WHERE f.id_ficha = $1 GROUP BY f.id_ficha`,
        [id]
      );
      await client.query('COMMIT');
      return fichaResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async delete(id) {
    const res = await pool.query(
      `UPDATE ficha_tecnica SET estado = 'Inactivo' WHERE id_ficha = $1 RETURNING id_ficha`,
      [id]
    );
    return res.rowCount > 0;
  }
}
