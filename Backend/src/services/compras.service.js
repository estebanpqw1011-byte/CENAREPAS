import fs from 'fs';
import { query } from '../config/db.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { borrarArchivo, cloudinaryConfigurado, rutaLocal, urlTemporal } from '../utils/almacenamiento.js';

/**
 * Factura o soporte de la compra subido con POST /uploads (tipo "compra"):
 * public_id "local:compras/<archivo>" (disco) o "cenarepas/compras/..."
 * (Cloudinary, privado). Devuelve los campos a guardar, o undefined si la
 * petición no trae archivo. Un comprobante_url suelto (antiguo) se acepta tal cual.
 */
function comprobanteDe(data) {
  if (data.quitar_comprobante === true) return { url: null, publicId: null, recurso: null };
  const publicId = data.comprobante_public_id;
  if (publicId === undefined || publicId === null || publicId === '') {
    return data.comprobante_url !== undefined ? { url: data.comprobante_url || null, publicId: null, recurso: null } : undefined;
  }
  const local = String(publicId).startsWith('local:compras/');
  if (local) {
    const ruta = rutaLocal(publicId);
    if (!ruta || !fs.existsSync(ruta)) throw badRequest('El soporte de la compra no existe; súbelo de nuevo');
  } else if (!String(publicId).startsWith('cenarepas/compras/') || !cloudinaryConfigurado()) {
    throw badRequest('El soporte de la compra no es válido: súbelo con la opción de adjuntar');
  }
  const recurso = data.comprobante_recurso === 'raw' ? 'raw' : 'image';
  return { url: local ? null : data.comprobante_url || null, publicId: String(publicId), recurso };
}

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
    const { id_proveedor, id_usuario, fecha_compra = new Date(), valor_total, medio_pago, estado = 'Registrada', detalles = [] } = data;
    const soporte = comprobanteDe(data);
    const res = await query(
      `INSERT INTO compra (id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, comprobante_url, estado,
                           comprobante_public_id, comprobante_recurso)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, soporte?.url ?? null, estado,
        soporte?.publicId ?? null, soporte?.recurso ?? null]
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
    const { id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, estado } = data;
    const soporte = comprobanteDe(data);
    const anterior = soporte !== undefined
      ? (await query('SELECT comprobante_public_id, comprobante_recurso FROM compra WHERE id_compra = $1', [id])).rows[0]
      : null;
    const res = await query(
      `UPDATE compra 
       SET id_proveedor = COALESCE($1, id_proveedor),
           id_usuario = COALESCE($2, id_usuario),
           fecha_compra = COALESCE($3, fecha_compra),
           valor_total = COALESCE($4, valor_total),
           medio_pago = COALESCE($5, medio_pago),
           comprobante_url = CASE WHEN $9::boolean THEN $6 ELSE comprobante_url END,
           comprobante_public_id = CASE WHEN $9::boolean THEN $10 ELSE comprobante_public_id END,
           comprobante_recurso = CASE WHEN $9::boolean THEN $11 ELSE comprobante_recurso END,
           estado = COALESCE($7, estado)
       WHERE id_compra = $8
       RETURNING *`,
      [id_proveedor, id_usuario, fecha_compra, valor_total, medio_pago, soporte?.url ?? null, estado, id,
        soporte !== undefined, soporte?.publicId ?? null, soporte?.recurso ?? null]
    );
    if (!res.rows[0]) throw notFound('Compra no encontrada');
    // El soporte anterior se borra solo si se reemplazó y el cambio se guardó.
    if (anterior?.comprobante_public_id && anterior.comprobante_public_id !== soporte?.publicId) {
      await borrarArchivo(anterior.comprobante_public_id, anterior.comprobante_recurso);
    }
    return res.rows[0];
  }

  /**
   * Cómo abrir el soporte de la compra: { tipo, url }. tipo "temporal" (URL
   * firmada de Cloudinary, 10 minutos), "local" (ruta autenticada que entrega
   * el archivo) o "externo" (URL antigua escrita a mano). null si no tiene.
   */
  static async enlaceComprobante(id) {
    const compra = await this.getById(id);
    if (!compra) throw notFound('Compra no encontrada');
    const { comprobante_public_id: publicId, comprobante_recurso: recurso, comprobante_url: url } = compra;
    if (publicId?.startsWith('local:')) return { tipo: 'local', url: `/api/v1/compras/${compra.id_compra}/comprobante/archivo` };
    if (publicId) {
      const formato = (url || '').split('?')[0].split('.').pop();
      return { tipo: 'temporal', url: urlTemporal(publicId, recurso, formato) };
    }
    return url ? { tipo: 'externo', url } : null;
  }

  /** Ruta en disco del soporte local (para GET /compras/:id/comprobante/archivo). */
  static async rutaComprobanteLocal(id) {
    const compra = await this.getById(id);
    const ruta = compra?.comprobante_public_id?.startsWith('local:') ? rutaLocal(compra.comprobante_public_id) : null;
    return ruta && fs.existsSync(ruta) ? ruta : null;
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
