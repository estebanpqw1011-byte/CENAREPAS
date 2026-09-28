import { query } from '../config/db.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';

export class CategoriasService {
  /**
   * Categorías con la cantidad de productos activos (CA-154-001).
   * soloActivos: el catálogo público solo ve categorías activas.
   */
  static async getAll({ soloActivos = false } = {}) {
    const res = await query(
      `SELECT c.*,
              COUNT(p.id_producto) FILTER (WHERE p.estado = 'Activo')::int AS cantidad_productos
       FROM categoria_producto c
       LEFT JOIN producto p ON p.id_categoria = c.id_categoria
       WHERE ($1::boolean = FALSE OR c.estado = 'Activo')
       GROUP BY c.id_categoria
       ORDER BY c.id_categoria ASC`,
      [soloActivos]
    );
    return res.rows;
  }

  static async getById(id, { soloActivos = false } = {}) {
    const res = await query(
      `SELECT c.*,
              COUNT(p.id_producto) FILTER (WHERE p.estado = 'Activo')::int AS cantidad_productos
       FROM categoria_producto c
       LEFT JOIN producto p ON p.id_categoria = c.id_categoria
       WHERE c.id_categoria = $1 AND ($2::boolean = FALSE OR c.estado = 'Activo')
       GROUP BY c.id_categoria`,
      [id, soloActivos]
    );
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, descripcion, estado = 'Activo', imagen_url = null } = data;
    const res = await query(
      `INSERT INTO categoria_producto (nombre, descripcion, estado, imagen_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nombre, descripcion, estado, imagen_url]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { nombre, descripcion, estado, imagen_url } = data;
    const res = await query(
      `UPDATE categoria_producto 
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           estado = COALESCE($3, estado),
           imagen_url = COALESCE($4, imagen_url)
       WHERE id_categoria = $5
       RETURNING *`,
      [nombre, descripcion, estado, imagen_url, id]
    );
    return res.rows[0] || null;
  }

  /** Borrado definitivo: solo sin productos (activos o inactivos); si no, 409 y se ofrece inactivar. */
  static eliminarDefinitivo(id) {
    return eliminarSinAsociados({
      tabla: 'categoria_producto',
      llave: 'id_categoria',
      id,
      noEncontrado: 'Categoría no encontrada',
      asociados: [
        { sql: 'SELECT 1 FROM producto WHERE id_categoria = $1', mensaje: 'Esta categoría tiene productos asociados; puedes inactivarla.' },
      ],
    });
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE categoria_producto SET estado = 'Inactivo' WHERE id_categoria = $1 RETURNING id_categoria`,
      [id]
    );
    return res.rows.length > 0;
  }
}
