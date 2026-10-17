import { query } from '../config/db.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';
import { borrarArchivo, publicIdDeUrlLocal } from '../utils/almacenamiento.js';

/**
 * Cambio de imagen al editar: quitar_imagen = true la borra; un imagen_url
 * distinto la reemplaza (con su imagen_public_id). Devuelve null si no cambia;
 * si cambia, { url, publicId, anterior } (anterior = public_id a borrar).
 */
async function cambioDeImagen(id, data) {
  const quitar = data.quitar_imagen === true;
  const nueva = data.imagen_url;
  if (!quitar && (nueva === undefined || nueva === null || nueva === '')) return null;
  const res = await query('SELECT imagen_url, imagen_public_id FROM producto WHERE id_producto = $1', [id]);
  const actual = res.rows[0];
  if (!actual) return null;
  if (!quitar && nueva === actual.imagen_url) return null;
  return {
    url: quitar ? null : nueva,
    publicId: quitar ? null : data.imagen_public_id || publicIdDeUrlLocal(nueva),
    anterior: actual.imagen_public_id || publicIdDeUrlLocal(actual.imagen_url),
  };
}


export class ProductosService {
  /** soloActivos: el catálogo público solo ve productos activos de categorías activas. */
  static async getAll({ soloActivos = false } = {}) {
    const res = await query(
      `SELECT p.*, c.nombre AS categoria_nombre, f.nombre AS ficha_nombre, pr.nombre AS proveedor_nombre
       FROM producto p
       LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
       LEFT JOIN ficha_tecnica f ON p.id_ficha = f.id_ficha
       LEFT JOIN proveedor pr ON p.id_proveedor = pr.id_proveedor
       WHERE ($1::boolean = FALSE OR (p.estado = 'Activo' AND c.estado = 'Activo'))
       ORDER BY p.id_producto ASC`,
      [soloActivos]
    );
    return res.rows;
  }

  static async getById(id, { soloActivos = false } = {}) {
    const res = await query(
      `SELECT p.*, c.nombre AS categoria_nombre
       FROM producto p
       LEFT JOIN categoria_producto c ON p.id_categoria = c.id_categoria
       WHERE p.id_producto = $1 AND ($2::boolean = FALSE OR (p.estado = 'Activo' AND c.estado = 'Activo'))`,
      [id, soloActivos]
    );
    return res.rows[0] || null;
  }

  static async create(data) {
    const {
      nombre, descripcion, id_categoria, id_ficha, id_proveedor,
      precio_venta, imagen_url, stock_actual = 0, stock_minimo = 0,
      fecha_vencimiento, estado = 'Activo'
    } = data;
    const imagenPublicId = imagen_url ? data.imagen_public_id || publicIdDeUrlLocal(imagen_url) : null;

    const res = await query(
      `INSERT INTO producto 
       (nombre, descripcion, id_categoria, id_ficha, id_proveedor, precio_venta, imagen_url, stock_actual, stock_minimo, fecha_vencimiento, estado, imagen_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [nombre, descripcion, id_categoria, id_ficha, id_proveedor, precio_venta, imagen_url, stock_actual, stock_minimo, fecha_vencimiento, estado, imagenPublicId]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const {
      nombre, descripcion, id_categoria, id_ficha, id_proveedor,
      precio_venta, stock_actual, stock_minimo,
      fecha_vencimiento, estado
    } = data;
    const imagen = await cambioDeImagen(id, data);

    const res = await query(
      `UPDATE producto 
       SET nombre = COALESCE($1, nombre),
           descripcion = COALESCE($2, descripcion),
           id_categoria = COALESCE($3, id_categoria),
           id_ficha = COALESCE($4, id_ficha),
           id_proveedor = COALESCE($5, id_proveedor),
           precio_venta = COALESCE($6, precio_venta),
           imagen_url = CASE WHEN $13::boolean THEN $7 ELSE imagen_url END,
           imagen_public_id = CASE WHEN $13::boolean THEN $14 ELSE imagen_public_id END,
           stock_actual = COALESCE($8, stock_actual),
           stock_minimo = COALESCE($9, stock_minimo),
           fecha_vencimiento = COALESCE($10, fecha_vencimiento),
           estado = COALESCE($11, estado)
       WHERE id_producto = $12
       RETURNING *`,
      [nombre, descripcion, id_categoria, id_ficha, id_proveedor, precio_venta, imagen?.url ?? null, stock_actual, stock_minimo, fecha_vencimiento, estado, id,
        imagen !== null, imagen?.publicId ?? null]
    );
    // La imagen anterior se borra solo si el cambio se guardó.
    if (res.rows[0] && imagen?.anterior) await borrarArchivo(imagen.anterior);
    return res.rows[0] || null;
  }

  /** Borrado definitivo: solo sin pedidos ni ventas; si no, 409 y se ofrece inactivar. */
  static async eliminarDefinitivo(id) {
    const fila = await eliminarSinAsociados({
      tabla: 'producto',
      llave: 'id_producto',
      id,
      noEncontrado: 'Producto no encontrado',
      asociados: [
        { sql: 'SELECT 1 FROM detalle_pedido WHERE id_producto = $1', mensaje: 'Este producto está en pedidos; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM detalle_venta WHERE id_producto = $1', mensaje: 'Este producto está en ventas; puedes inactivarlo.' },
      ],
    });
    await borrarArchivo(fila.imagen_public_id || publicIdDeUrlLocal(fila.imagen_url));
    return fila;
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE producto SET estado = 'Inactivo' WHERE id_producto = $1 RETURNING id_producto`,
      [id]
    );
    return res.rows.length > 0;
  }
}
