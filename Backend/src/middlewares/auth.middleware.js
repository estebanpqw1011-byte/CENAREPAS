import { verifyToken } from '../utils/jwt.js';
import { errorResponse } from '../utils/response.js';
import { query } from '../config/db.js';

const tokenDe = (req) => {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
};

/**
 * Usuario del token, leído de la base: devuelve null si el token no es válido
 * o si el usuario o su rol ya no están activos (inactivar corta el acceso de inmediato).
 */
const cargarUsuario = async (token) => {
  const decoded = token ? verifyToken(token) : null;
  if (!decoded || !decoded.id_usuario) return null;

  const result = await query(
    `SELECT u.id_usuario, u.nombre, u.correo, u.id_rol, u.estado, r.nombre AS rol, r.estado AS rol_estado,
            c.id_cliente
     FROM usuario u
     JOIN rol r ON r.id_rol = u.id_rol
     LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
     WHERE u.id_usuario = $1`,
    [decoded.id_usuario]
  );
  const user = result.rows[0];
  if (!user || String(user.estado).toLowerCase() !== 'activo' || String(user.rol_estado).toLowerCase() !== 'activo') {
    return null;
  }
  return {
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    correo: user.correo,
    id_rol: user.id_rol,
    rol: user.rol,
    id_cliente: user.id_cliente || null,
  };
};

/** Exige un token JWT válido en `Authorization: Bearer <token>`; si no, 401. */
export const authenticate = async (req, res, next) => {
  const token = tokenDe(req);
  if (!token) {
    return errorResponse(res, 'Acceso denegado: token de autenticación no proporcionado', 401);
  }
  try {
    const user = await cargarUsuario(token);
    if (!user) {
      return errorResponse(res, 'Sesión inválida o expirada. Inicia sesión de nuevo.', 401);
    }
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Si llega un token válido carga req.user; si no, sigue como anónimo.
 * Para rutas públicas que muestran más datos al personal autorizado.
 */
export const optionalAuth = async (req, res, next) => {
  try {
    req.user = (await cargarUsuario(tokenDe(req))) || undefined;
    return next();
  } catch (error) {
    return next(error);
  }
};

/** Indica si el rol tiene al menos uno de los permisos [modulo, accion]. */
export const tienePermiso = async (idRol, permisos) => {
  const result = await query(
    `SELECT 1
     FROM rol_permiso rp
     JOIN permiso p ON p.id_permiso = rp.id_permiso
     JOIN unnest($2::text[], $3::text[]) AS req(modulo, accion)
       ON req.modulo = p.modulo AND req.accion = p.accion
     WHERE rp.id_rol = $1 AND LOWER(p.estado) = 'activo'
     LIMIT 1`,
    [idRol, permisos.map(([modulo]) => modulo), permisos.map(([, accion]) => accion)]
  );
  return result.rows.length > 0;
};

/**
 * Autoriza según las tablas permiso y rol_permiso. Recibe uno o varios pares
 * [modulo, accion]; basta con tener uno de ellos. Usar después de authenticate.
 *   authorize('clientes', 'ver')
 *   authorize(['productos', 'crear'], ['categorias', 'crear'])
 */
export const authorize = (...args) => {
  const permisos = typeof args[0] === 'string' ? [[args[0], args[1]]] : args;
  return async (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Acceso denegado: sesión no iniciada', 401);
    }
    try {
      if (await tienePermiso(req.user.id_rol, permisos)) return next();
      return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
    } catch (error) {
      return next(error);
    }
  };
};

/** Restringe la ruta a los roles indicados por nombre (p. ej. 'Cliente'). */
export const requireRol = (...roles) => (req, res, next) => {
  if (!req.user) {
    return errorResponse(res, 'Acceso denegado: sesión no iniciada', 401);
  }
  const rol = String(req.user.rol || '').toLowerCase();
  if (roles.some((r) => r.toLowerCase() === rol)) return next();
  return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
};

/**
 * Protege un recurso CRUD completo: GET→ver, POST→crear, PUT/PATCH→editar,
 * DELETE→accionDelete (anular o cambiar_estado: no hay borrados físicos).
 */
export const protegerModulo = (modulo, accionDelete = 'cambiar_estado') => {
  const acciones = { GET: 'ver', POST: 'crear', PUT: 'editar', PATCH: 'editar', DELETE: accionDelete };
  return [
    authenticate,
    (req, res, next) => authorize(modulo, acciones[req.method] || 'ver')(req, res, next),
  ];
};
