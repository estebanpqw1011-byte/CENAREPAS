import { query } from '../config/db.js';
import { notFound } from '../utils/httpError.js';

export class ComprasService {
  static async getAll() {
    const res = await query(`
      SELECT c.*, p.nombre AS proveedor_nombre, u.nombre AS usuario_nombre,
             COALESCE(
               json_agg(
                 json_build_object(
                   'id_detalle_compra', dc.id_detalle_compra,
                   'id_insumo', dc.id_insumo,
                   'insumo_nombre', i.nombre,
                   'cantidad', dc.cantidad,
                   'valor_unitario', dc.valor_unitario,
                   'subtotal', dc.subtotal
                 )
               ) FILTER (WHERE dc.id_detalle_compra IS NOT NULL),
               '[]'
             ) AS detalles
      FROM compra c
      LEFT JOIN proveedor p ON c.id_proveedor = p.id_proveedor
      LEFT JOIN usuario u ON c.id_usuario = u.id_usuario
      LEFT JOIN detalle_compra dc ON c.id_compra = dc.id_compra
      LEFT JOIN insumo i ON dc.id_insumo = i.id_insumo
      GROUP BY c.id_compra, p.nombre, u.nombre
      ORDER BY c.id_compra ASC
    `);
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM compra WHERE id_compra = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { id_proveedor, id_usuario, fecha_compra = new Date(), valor_total, medio_pago, comprobante_url, estado = 'Registrada', detalles = [] } = data;
    const res = await query(
      `INSERT INTO compra (id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, comprobante_url, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, comprobante_url, estado]
    );
    const newCompra = res.rows[0];

    if (detalles && detalles.length > 0) {
      for (const d of detalles) {
        await query(
          `INSERT INTO detalle_compra (id_compra, id_insumo, cantidad, valor_unitario, subtotal)
           VALUES ($1, $2, $3, $4, $5)`,
          [newCompra.id_compra, d.id_insumo, d.cantidad, d.valor_unitario, d.subtotal || (d.cantidad * d.valor_unitario)]
        );
      }
    }
    return newCompra;
  }

  static async update(id, data) {
    const { id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, comprobante_url, estado } = data;
    const res = await query(
      `UPDATE compra 
       SET id_proveedor = COALESCE($1, id_proveedor),
           id_usuario = COALESCE($2, id_usuario),
           fecha_compra = COALESCE($3, fecha_compra),
           valor_total = COALESCE($4, valor_total),
           medio_pago = COALESCE($5, medio_pago),
           comprobante_url = COALESCE($6, comprobante_url),
           estado = COALESCE($7, estado)
       WHERE id_compra = $8
       RETURNING *`,
      [id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, comprobante_url, estado, id]
    );
    if (!res.rows[0]) throw notFound('Compra no encontrada');
    return res.rows[0];
  }

  /** Anula el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE compra SET estado = 'Anulada' WHERE id_compra = $1 RETURNING id_compra`,
      [id]
    );
    return res.rows.length > 0;
  }
}
