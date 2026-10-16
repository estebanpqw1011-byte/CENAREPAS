import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

/** Ficha con sus insumos; lo usan el listado y el detalle. */
const SELECT_FICHA = `
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
  LEFT JOIN insumo i ON fti.id_insumo = i.id_insumo
`;

export class FichasTecnicasService {
  static async getAll() {
    const res = await query(`${SELECT_FICHA} GROUP BY f.id_ficha ORDER BY f.id_ficha ASC`);
    return res.rows || [];
  }

  /** Igual que el listado: con sus insumos (nombre, cantidad y unidad). */
  static async getById(id) {
    const res = await query(`${SELECT_FICHA} WHERE f.id_ficha = $1 GROUP BY f.id_ficha`, [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado = 'Activo', insumos = [] } = data;
    const res = await query(
      `INSERT INTO ficha_tecnica (nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado]
    );
    const newFicha = res.rows[0];

    if (insumos && insumos.length > 0) {
      for (const item of insumos) {
        await query(
          `INSERT INTO ficha_tecnica_insumo (id_ficha, id_insumo, cantidad, unidad_medida)
           VALUES ($1, $2, $3, $4)`,
          [newFicha.id_ficha, item.id_insumo, item.cantidad, item.unidad_medida || 'kg']
        );
      }
    }

    return newFicha;
  }

  static async update(id, data) {
    const { nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado } = data;
    const res = await query(
      `UPDATE ficha_tecnica 
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           instrucciones_preparacion = COALESCE($3, instrucciones_preparacion),
           tiempo_estimado_minutos = COALESCE($4, tiempo_estimado_minutos),
           rendimiento_lote = COALESCE($5, rendimiento_lote),
           estado = COALESCE($6, estado)
       WHERE id_ficha = $7
       RETURNING *`,
      [nombre, descripcion, instrucciones_preparacion, tiempo_estimado_minutos, rendimiento_lote, estado, id]
    );
    if (!res.rows[0]) throw notFound('Ficha técnica no encontrada');
    return res.rows[0];
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE ficha_tecnica SET estado = 'Inactivo' WHERE id_ficha = $1 RETURNING id_ficha`,
      [id]
    );
    return res.rows.length > 0;
  }
}
