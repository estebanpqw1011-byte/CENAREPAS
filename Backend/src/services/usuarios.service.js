import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { CONTRASENA_MIN, TIPOS_DOCUMENTO } from '../config/negocio.js';
import { badRequest, conflict } from '../utils/httpError.js';
import { eliminarSinAsociados } from '../utils/eliminacion.js';

const SALT_ROUNDS = 10;
// f: el mínimo del personal pasa de 6 a CONTRASENA_MIN (8). Solo aplica a
// contraseñas nuevas o cambiadas; el login no valida la longitud.
// El formulario web de usuarios (UsuarioFormModal.jsx) usa el mismo mínimo.
const COLUMNAS_PUBLICAS = 'id_usuario, nombre, correo, id_rol, estado, fecha_creacion, tipo_documento, documento';

/**
 * Tipo y número de documento del usuario (opcionales, pero los dos o ninguno).
 * undefined = no se envió (al editar se conservan); null = se borran.
 */
const documentoDe = (data) => {
  const enviado = data.tipo_documento !== undefined || data.documento !== undefined;
  if (!enviado) return undefined;
  const tipo = String(data.tipo_documento ?? '').trim().toUpperCase();
  const numero = String(data.documento ?? '').trim();
  if (!tipo && !numero) return { tipo: null, numero: null };
  const errores = {};
  if (!TIPOS_DOCUMENTO.includes(tipo)) errores.tipo_documento = 'Selecciona un tipo de documento válido';
  if (!/^[0-9A-Za-z.-]{5,20}$/.test(numero)) errores.documento = 'Ingresa un número de documento válido (5 a 20 caracteres)';
  if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del usuario', errores);
  return { tipo, numero };
};

export class UsuariosService {
  /** resumido: solo id, nombre y rol (para quien no administra usuarios). */
  static async getAll({ resumido = false } = {}) {
    const res = await query(`
      SELECT u.id_usuario, u.nombre, u.correo, u.id_rol, u.estado,
             u.fecha_creacion, u.tipo_documento, u.documento,
             r.nombre AS rol_nombre
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      ORDER BY u.id_usuario ASC
    `);
    if (!resumido) return res.rows;
    return res.rows.map(({ id_usuario, nombre, id_rol, rol_nombre, estado }) => ({
      id_usuario, nombre, id_rol, rol_nombre, estado,
    }));
  }

  static async getById(id) {
    const res = await query(`
      SELECT u.id_usuario, u.nombre, u.correo, u.id_rol, u.estado, u.fecha_creacion,
             u.tipo_documento, u.documento, r.nombre AS rol_nombre
      FROM usuario u
      LEFT JOIN rol r ON u.id_rol = r.id_rol
      WHERE u.id_usuario = $1
    `, [id]);
    return res.rows[0] || null;
  }

  static async create(data) {
    const { nombre, correo, id_rol, estado = 'Activo' } = data;
    const rawPassword = String(data.contrasena || data.password || data.contrasena_hash || '').trim();
    if (rawPassword.length < CONTRASENA_MIN) {
      throw badRequest(`La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`);
    }
    const documento = documentoDe(data);
    const contrasena_hash = await bcrypt.hash(rawPassword, SALT_ROUNDS);

    const res = await query(
      `INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol, estado, tipo_documento, documento)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${COLUMNAS_PUBLICAS}`,
      [nombre, correo, contrasena_hash, id_rol, estado, documento?.tipo ?? null, documento?.numero ?? null]
    );
    return res.rows[0];
  }

  static async update(id, data) {
    const { nombre, correo, id_rol, estado } = data;
    const rawPassword = data.contrasena || data.password || data.contrasena_hash;
    const hasNewPassword = typeof rawPassword === 'string' && rawPassword.trim().length > 0;
    if (hasNewPassword && rawPassword.trim().length < CONTRASENA_MIN) {
      throw badRequest(`La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`);
    }
    const contrasena_hash = hasNewPassword ? await bcrypt.hash(rawPassword.trim(), SALT_ROUNDS) : null;
    const documento = documentoDe(data);

    const res = await query(
      `UPDATE usuario 
       SET nombre = COALESCE($1, nombre),
           correo = COALESCE($2, correo),
           id_rol = COALESCE($3, id_rol),
           estado = COALESCE($4, estado),
           contrasena_hash = COALESCE($5, contrasena_hash),
           tipo_documento = CASE WHEN $7::boolean THEN $8 ELSE tipo_documento END,
           documento = CASE WHEN $7::boolean THEN $9 ELSE documento END
       WHERE id_usuario = $6
       RETURNING ${COLUMNAS_PUBLICAS}`,
      [nombre, correo, id_rol, estado, contrasena_hash, id,
        documento !== undefined, documento?.tipo ?? null, documento?.numero ?? null]
    );
    return res.rows[0] || null;
  }

  /** Inactiva el registro (sin borrado físico: conserva el historial). */
  /**
   * Borrado definitivo (HU-018): solo un usuario sin nada registrado a su
   * nombre (pedidos, ventas, abonos, cambios de estado, compras, producción,
   * auditoría ni cuenta de cliente). Nadie se borra a sí mismo, ni se borra
   * el único Administrador activo. Si no, 409 y se ofrece inactivar.
   */
  static eliminarDefinitivo(id, idUsuarioSesion) {
    return eliminarSinAsociados({
      tabla: 'usuario',
      llave: 'id_usuario',
      id,
      noEncontrado: 'Usuario no encontrado',
      validar: async (db, usuario) => {
        if (usuario.id_usuario === Number(idUsuarioSesion)) throw conflict('No puedes eliminar tu propio usuario.');
        const otros = await db.query(
          `SELECT r.nombre = 'Administrador' AS es_admin,
                  (SELECT COUNT(*) FROM usuario u JOIN rol ra ON ra.id_rol = u.id_rol
                   WHERE ra.nombre = 'Administrador' AND u.estado = 'Activo' AND u.id_usuario <> $1)::int AS otros_admins
           FROM rol r WHERE r.id_rol = $2`,
          [usuario.id_usuario, usuario.id_rol]
        );
        const { es_admin: esAdmin, otros_admins: otrosAdmins } = otros.rows[0] ?? {};
        if (esAdmin && usuario.estado === 'Activo' && otrosAdmins === 0) {
          throw conflict('No se puede eliminar el único Administrador activo.');
        }
      },
      asociados: [
        { sql: 'SELECT 1 FROM cliente WHERE id_usuario = $1', mensaje: 'Este usuario es la cuenta de un cliente; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM pedido WHERE id_usuario = $1 UNION ALL SELECT 1 FROM venta WHERE id_usuario = $1', mensaje: 'Este usuario tiene pedidos o ventas registrados; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM abono WHERE id_usuario_registra = $1 OR id_usuario_revisa = $1', mensaje: 'Este usuario registró o revisó abonos; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM pedido_estado_historial WHERE id_usuario = $1', mensaje: 'Este usuario tiene cambios de estado de pedidos registrados; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM compra WHERE id_usuario = $1 UNION ALL SELECT 1 FROM lote_produccion WHERE id_usuario_responsable = $1', mensaje: 'Este usuario tiene compras o producción registradas; puedes inactivarlo.' },
        { sql: 'SELECT 1 FROM auditoria WHERE id_usuario = $1', mensaje: 'Este usuario tiene registros de auditoría; puedes inactivarlo.' },
      ],
      // Sus notificaciones se borran con él (ON DELETE CASCADE).
    });
  }

  static async delete(id) {
    const res = await query(
      `UPDATE usuario SET estado = 'Inactivo' WHERE id_usuario = $1 RETURNING id_usuario`,
      [id]
    );
    return res.rows.length > 0;
  }
}
