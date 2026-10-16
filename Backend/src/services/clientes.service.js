import { query } from '../config/db.js';
import { MUNICIPIOS_ENTREGA, TIPOS_DOCUMENTO } from '../config/negocio.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * Tipo de documento, municipio y barrio del cliente (antes el personal no los
 * guardaba). Solo valida lo que llega: la web no los envía y no se afecta.
 * Devuelve los valores normalizados (undefined = no se envió).
 */
const ubicacionYDocumento = (data) => {
  const errores = {};
  let tipoDocumento;
  if (data.tipo_documento !== undefined && data.tipo_documento !== null) {
    tipoDocumento = texto(data.tipo_documento).toUpperCase();
    if (!TIPOS_DOCUMENTO.includes(tipoDocumento)) errores.tipo_documento = 'Selecciona un tipo de documento válido';
  }
  let municipio;
  if (data.municipio !== undefined && data.municipio !== null) {
    municipio = texto(data.municipio) || null;
    if (municipio && !MUNICIPIOS_ENTREGA.includes(municipio)) {
      errores.municipio = 'Selecciona un municipio del Área Metropolitana';
    }
  }
  const barrio = data.barrio === undefined || data.barrio === null ? undefined : texto(data.barrio) || null;
  if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del cliente', errores);
  return { tipoDocumento, municipio, barrio };
};

export class ClientesService {
  static async getAll() {
    const res = await query('SELECT * FROM cliente ORDER BY id_cliente ASC');
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM cliente WHERE id_cliente = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, documento, telefono, correo, direccion, estado = 'Activo' } = data;
    const { tipoDocumento = 'CC', municipio = null, barrio = null } = ubicacionYDocumento(data);
    const res = await query(
      `INSERT INTO cliente (nombre, tipo_documento, documento, telefono, correo, direccion, municipio, barrio, estado)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [nombre, tipoDocumento, documento, telefono, correo, direccion, municipio, barrio, estado]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { nombre, documento, telefono, correo, direccion, estado } = data;
    const { tipoDocumento, municipio, barrio } = ubicacionYDocumento(data);
    // municipio y barrio: sin enviar → se conservan; enviados vacíos → se borran.
    const res = await query(
      `UPDATE cliente
       SET nombre = COALESCE($1, nombre),
           documento = COALESCE($2, documento),
           telefono = COALESCE($3, telefono),
           correo = COALESCE($4, correo),
           direccion = COALESCE($5, direccion),
           estado = COALESCE($6, estado),
           tipo_documento = COALESCE($7, tipo_documento),
           municipio = CASE WHEN $8::boolean THEN $9 ELSE municipio END,
           barrio = CASE WHEN $10::boolean THEN $11 ELSE barrio END
       WHERE id_cliente = $12
       RETURNING *`,
      [nombre, documento, telefono, correo, direccion, estado, tipoDocumento ?? null,
        municipio !== undefined, municipio ?? null, barrio !== undefined, barrio ?? null, id]
    );
    if (!res.rows[0]) throw notFound('Cliente no encontrado');
    return res.rows[0];
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  /**
   * Borrado definitivo (HU-104): solo sin pedidos, abonos, créditos, ventas
   * ni cuenta en la app; si no, 409 y se ofrece inactivar.
   */
  static eliminarDefinitivo(id) {
    return eliminarSinAsociados({
      tabla: 'cliente',
      llave: 'id_cliente',
      id,
      noEncontrado: 'Cliente no encontrado',
      validar: (db, cliente) => {
        if (cliente.id_usuario) throw conflict('Este cliente tiene una cuenta en la app; puedes inactivarlo.');
      },
      asociados: [
        { sql: 'SELECT 1 FROM pedido WHERE id_cliente = $1', mensaje: 'Este cliente tiene pedidos asociados; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM venta WHERE id_cliente = $1', mensaje: 'Este cliente tiene ventas asociadas; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM abono WHERE id_cliente = $1 UNION ALL SELECT 1 FROM credito WHERE id_cliente = $1', mensaje: 'Este cliente tiene abonos o créditos asociados; puedes inactivarlo.' },
      ],
    });
  }

  static async delete(id) {
    const res = await query(
      `UPDATE cliente SET estado = 'Inactivo' WHERE id_cliente = $1 RETURNING id_cliente`,
      [id]
    );
    return res.rows.length > 0;
  }
}
