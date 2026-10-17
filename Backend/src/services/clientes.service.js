import { query } from '../config/db.js';
import { MUNICIPIOS_ENTREGA, TIPOS_DOCUMENTO } from '../config/negocio.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';
import { armarPersona, tocaPersona } from '../utils/persona.js';

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
    const { documento, telefono, correo, direccion, estado = 'Activo' } = data;
    const { tipoDocumento: tipoEnviado, municipio = null, barrio = null } = ubicacionYDocumento(data);
    // Tipo de persona: Natural (nombres + apellidos) o Jurídica (razón social; NIT por defecto).
    const { valores: persona, errores } = armarPersona(data, {}, { tipoDocumento: tipoEnviado });
    if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del cliente', errores);
    const tipoDocumento = tipoEnviado ?? (persona.tipo_persona === 'Jurídica' ? 'NIT' : 'CC');
    const res = await query(
      `INSERT INTO cliente (nombre, tipo_documento, documento, telefono, correo, direccion, municipio, barrio, estado,
                            tipo_persona, nombres, apellidos, razon_social)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [persona.nombre, tipoDocumento, documento, telefono, correo, direccion, municipio, barrio, estado,
        persona.tipo_persona, persona.nombres, persona.apellidos, persona.razon_social]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { documento, telefono, correo, direccion, estado } = data;
    const { tipoDocumento, municipio, barrio } = ubicacionYDocumento(data);
    // Nombre y tipo de persona: solo si la petición los trae (si no, se conservan).
    let persona = null;
    if (tocaPersona(data)) {
      const actual = await this.getById(id);
      if (!actual) throw notFound('Cliente no encontrado');
      const armado = armarPersona(data, actual, { tipoDocumento: tipoDocumento ?? actual.tipo_documento });
      if (Object.keys(armado.errores).length > 0) throw badRequest('Revisa los datos del cliente', armado.errores);
      persona = armado.valores;
    }
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
           barrio = CASE WHEN $10::boolean THEN $11 ELSE barrio END,
           tipo_persona = CASE WHEN $13::boolean THEN $14 ELSE tipo_persona END,
           nombres = CASE WHEN $13::boolean THEN $15 ELSE nombres END,
           apellidos = CASE WHEN $13::boolean THEN $16 ELSE apellidos END,
           razon_social = CASE WHEN $13::boolean THEN $17 ELSE razon_social END
       WHERE id_cliente = $12
       RETURNING *`,
      [persona?.nombre ?? null, documento, telefono, correo, direccion, estado, tipoDocumento ?? null,
        municipio !== undefined, municipio ?? null, barrio !== undefined, barrio ?? null, id,
        persona !== null, persona?.tipo_persona ?? null, persona?.nombres ?? null, persona?.apellidos ?? null,
        persona?.razon_social ?? null]
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
