import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

export class InsumosService {
  static async getAll() {
    const res = await query(`
      SELECT i.*, p.nombre AS proveedor_nombre
      FROM insumo i
      LEFT JOIN proveedor p ON i.id_proveedor = p.id_proveedor
      ORDER BY i.id_insumo ASC
    `);
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM insumo WHERE id_insumo = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, unidad_medida, stock_actual = 0, stock_minimo = 0, fecha_vencimiento, id_proveedor, estado = 'Activo' } = data;
    const res = await query(
      `INSERT INTO insumo (nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado } = data;
    const res = await query(
      `UPDATE insumo 
       SET nombre = COALESCE($1, nombre),
           unidad_medida = COALESCE($2, unidad_medida),
           stock_actual = COALESCE($3, stock_actual),
           stock_minimo = COALESCE($4, stock_minimo),
           fecha_vencimiento = COALESCE($5, fecha_vencimiento),
           id_proveedor = COALESCE($6, id_proveedor),
           estado = COALESCE($7, estado)
       WHERE id_insumo = $8
       RETURNING *`,
      [nombre, unidad_medida, stock_actual, stock_minimo, fecha_vencimiento, id_proveedor, estado, id]
    );
    if (!res.rows[0]) throw notFound('Insumo no encontrado');
    return res.rows[0];
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE insumo SET estado = 'Inactivo' WHERE id_insumo = $1 RETURNING id_insumo`,
      [id]
    );
    return res.rows.length > 0;
  }
}
