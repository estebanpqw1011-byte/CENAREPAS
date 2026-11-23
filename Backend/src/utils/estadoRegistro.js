import { query } from '../config/db.js';
import { badRequest, conflict, notFound } from './httpError.js';
import { successResponse } from './response.js';

export const ESTADOS_REGISTRO = ['Activo', 'Inactivo'];

/** 'activo' / ' Inactivo ' → 'Activo' / 'Inactivo'; cualquier otro valor → null. */
export const normalizarEstadoRegistro = (valor) =>
  ESTADOS_REGISTRO.find((e) => e.toLowerCase() === String(valor ?? '').trim().toLowerCase()) || null;

/**
 * Reglas que evitan dejar el sistema sin administración: nadie se inactiva a
 * sí mismo, y no se inactiva el último Administrador activo ni el rol
 * Administrador.
 */
export const reglasEstado = {
  usuario: async (req, id, estado) => {
    if (estado !== 'Inactivo') return;
    if (Number(id) === Number(req.user.id_usuario)) throw conflict('No puedes inactivar tu propio usuario.');
    const res = await query(
      `SELECT r.nombre = 'Administrador' AS es_admin,
              (SELECT count(*)::int FROM usuario u2 JOIN rol r2 ON r2.id_rol = u2.id_rol
                WHERE r2.nombre = 'Administrador' AND u2.estado = 'Activo' AND u2.id_usuario <> $1) AS otros_admins
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol WHERE u.id_usuario = $1`,
      [id]
    );
    if (res.rows[0]?.es_admin && res.rows[0].otros_admins === 0) {
      throw conflict('No se puede inactivar el único Administrador activo.');
    }
  },
  rol: async (req, id, estado) => {
    if (estado !== 'Inactivo') return;
    const res = await query('SELECT nombre FROM rol WHERE id_rol = $1', [id]);
    if (res.rows[0]?.nombre === 'Administrador') throw conflict('El rol Administrador no se puede inactivar.');
  },
};

/**
 * Handler de PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } para las
 * tablas con estado Activo/Inactivo. tabla, pk y columnas son constantes del
 * código (nunca vienen de la petición). Devuelve la fila actualizada.
 */
export const cambiarEstadoHandler = ({ tabla, pk, entidad, columnas = '*', regla }) => async (req, res, next) => {
  try {
    const estado = normalizarEstadoRegistro(req.body?.estado);
    if (!estado) {
      const mensaje = 'El estado debe ser Activo o Inactivo';
      throw badRequest(mensaje, { estado: mensaje });
    }
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw badRequest('Identificador no válido');
    if (regla) await regla(req, id, estado);

    const resultado = await query(`UPDATE ${tabla} SET estado = $1 WHERE ${pk} = $2 RETURNING ${columnas}`, [estado, id]);
    if (!resultado.rows[0]) throw notFound(`${entidad} no encontrado(a)`);
    return successResponse(res, resultado.rows[0], `${entidad}: estado cambiado a ${estado}`);
  } catch (error) {
    return next(error);
  }
};
