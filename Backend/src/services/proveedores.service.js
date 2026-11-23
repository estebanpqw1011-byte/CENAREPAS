import { query } from '../config/db.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { TIPOS_DOCUMENTO } from '../config/negocio.js';
import { texto } from '../utils/normalizar.js';
import { armarPersona, tocaPersona } from '../utils/persona.js';

/** Tipo de documento enviado (en mayúsculas) o undefined; 400 si no es válido. */
const tipoDocumentoDe = (data) => {
  if (data.tipo_documento === undefined || data.tipo_documento === null || data.tipo_documento === '') return undefined;
  const tipo = texto(String(data.tipo_documento)).toUpperCase();
  if (!TIPOS_DOCUMENTO.includes(tipo)) {
    throw badRequest('Revisa los datos del proveedor', { tipo_documento: 'Selecciona un tipo de documento válido' });
  }
  return tipo;
};

export class ProveedoresService {
  static async getAll() {
    const res = await query('SELECT * FROM proveedor ORDER BY id_proveedor ASC');
    return res.rows || [];
  }

  static async getById(id) {
    const res = await query('SELECT * FROM proveedor WHERE id_proveedor = $1', [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { telefono, correo, direccion, estado = 'Activo' } = data;
    const tipoEnviado = tipoDocumentoDe(data);
    // Sin tipo de persona ni de documento, un proveedor es Jurídica con NIT (como los existentes).
    const { valores: persona, errores } = armarPersona(data, {}, { tipoDocumento: tipoEnviado ?? 'NIT' });
    const tipoDocumento = tipoEnviado ?? (persona.tipo_persona === 'Jurídica' ? 'NIT' : 'CC');
    const crudo = data.nit ?? data.documento;
    const documento = crudo === undefined || crudo === null ? "" : texto(String(crudo));
    if (!documento) errores.nit = 'Ingresa el número de documento';
    else if (documento.length > 20) errores.nit = 'El número de documento admite máximo 20 caracteres';
    if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del proveedor', errores);
    const res = await query(
      `INSERT INTO proveedor (nombre, nit, telefono, correo, direccion, estado,
                              tipo_documento, tipo_persona, nombres, apellidos, razon_social)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [persona.nombre, documento, telefono, correo, direccion, estado,
        tipoDocumento, persona.tipo_persona, persona.nombres, persona.apellidos, persona.razon_social]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { telefono, correo, direccion, estado } = data;
    const tipoDocumento = tipoDocumentoDe(data);
    const documentoEnviado = data.nit ?? data.documento;
    const documento = documentoEnviado === undefined || documentoEnviado === null ? null : texto(String(documentoEnviado));
    if (documento !== null && !documento) throw badRequest('Revisa los datos del proveedor', { nit: 'Ingresa el número de documento' });
    // Nombre y tipo de persona: solo si la petición los trae (si no, se conservan).
    let persona = null;
    if (tocaPersona(data)) {
      const actual = await this.getById(id);
      if (!actual) throw notFound('Proveedor no encontrado');
      const armado = armarPersona(data, actual, { tipoDocumento: tipoDocumento ?? actual.tipo_documento });
      if (Object.keys(armado.errores).length > 0) throw badRequest('Revisa los datos del proveedor', armado.errores);
      persona = armado.valores;
    }
    const res = await query(
      `UPDATE proveedor
       SET nombre = COALESCE($1, nombre),
           nit = COALESCE($2, nit),
           telefono = COALESCE($3, telefono),
           correo = COALESCE($4, correo),
           direccion = COALESCE($5, direccion),
           estado = COALESCE($6, estado),
           tipo_documento = COALESCE($8, tipo_documento),
           tipo_persona = CASE WHEN $9::boolean THEN $10 ELSE tipo_persona END,
           nombres = CASE WHEN $9::boolean THEN $11 ELSE nombres END,
           apellidos = CASE WHEN $9::boolean THEN $12 ELSE apellidos END,
           razon_social = CASE WHEN $9::boolean THEN $13 ELSE razon_social END
       WHERE id_proveedor = $7
       RETURNING *`,
      [persona?.nombre ?? null, documento, telefono, correo, direccion, estado, id, tipoDocumento ?? null,
        persona !== null, persona?.tipo_persona ?? null, persona?.nombres ?? null, persona?.apellidos ?? null,
        persona?.razon_social ?? null]
    );
    if (!res.rows[0]) throw notFound('Proveedor no encontrado');
    return res.rows[0];
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  static async delete(id) {
    const res = await query(
      `UPDATE proveedor SET estado = 'Inactivo' WHERE id_proveedor = $1 RETURNING id_proveedor`,
      [id]
    );
    return res.rows.length > 0;
  }
}
