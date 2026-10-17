import bcrypt from 'bcryptjs';
import { pool, query } from '../config/db.js';
import { generateToken } from '../utils/jwt.js';
import { HttpError, badRequest, conflict } from '../utils/httpError.js';
import { CONTRASENA_MIN } from '../config/negocio.js';
import { validarFichaCliente } from '../utils/fichaCliente.js';
import { armarPersona } from '../utils/persona.js';

const SALT_ROUNDS = 10;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

/**
 * Permisos activos del rol como { modulo: [acciones] }. La app los usa solo
 * para mostrar u ocultar acciones; cada ruta sigue autorizando con
 * authorize/protegerModulo.
 */
const permisosDelRol = async (idRol) => {
  const res = await query(
    `SELECT p.modulo, array_agg(p.accion ORDER BY p.accion) AS acciones
     FROM rol_permiso rp
     JOIN permiso p ON p.id_permiso = rp.id_permiso
     WHERE rp.id_rol = $1 AND LOWER(p.estado) = 'activo'
     GROUP BY p.modulo
     ORDER BY p.modulo`,
    [idRol]
  );
  return Object.fromEntries(res.rows.map((r) => [r.modulo, r.acciones]));
};

/** Arma la respuesta de sesión: token + datos públicos y permisos del usuario. */
const crearSesion = async (user) => {
  const payload = {
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    correo: user.correo,
    id_rol: user.id_rol,
    rol: user.rol_nombre,
  };
  return {
    token: generateToken(payload),
    usuario: {
      ...payload,
      estado: user.estado,
      id_cliente: user.id_cliente || null,
      permisos: await permisosDelRol(user.id_rol),
    },
  };
};

export class AuthService {
  /** Login con correo y contraseña (CA-001-001). Solo bcrypt; sin claves demo. */
  static async login(correo, contrasena) {
    const res = await query(
      `SELECT u.*, r.nombre AS rol_nombre, r.estado AS rol_estado, c.id_cliente
       FROM usuario u
       JOIN rol r ON u.id_rol = r.id_rol
       LEFT JOIN cliente c ON c.id_usuario = u.id_usuario
       WHERE LOWER(u.correo) = LOWER($1)`,
      [texto(correo)]
    );
    const user = res.rows[0];

    // Mismo mensaje si el correo no existe o la contraseña no coincide.
    const valida = user ? await bcrypt.compare(String(contrasena), user.contrasena_hash).catch(() => false) : false;
    if (!valida) {
      throw new HttpError(401, 'Correo o contraseña incorrectos');
    }
    if (String(user.estado).toLowerCase() !== 'activo' || String(user.rol_estado).toLowerCase() !== 'activo') {
      throw new HttpError(403, 'Tu cuenta está inactiva. Comunícate con CENAREPAS.');
    }
    return crearSesion(user);
  }

  /**
   * Registro público de clientes (HU-150). Siempre asigna el rol Cliente,
   * ignora cualquier id_rol recibido y crea usuario + cliente en una transacción.
   */
  static async registrarCliente(datos) {
    const { valores, errores } = validarFichaCliente(datos);
    const { nombre, tipoDocumento, documento, telefono, municipio, barrio, direccion } = valores;
    // Tipo de persona y nombres o razón social (Jurídica si el documento es NIT).
    const { valores: persona } = armarPersona({ nombre }, {}, { tipoDocumento });
    const correo = texto(datos.correo).toLowerCase();
    const contrasena = typeof datos.contrasena === 'string' ? datos.contrasena : '';

    if (!CORREO_REGEX.test(correo)) errores.correo = 'Ingresa un correo válido';
    if (contrasena.length < CONTRASENA_MIN) errores.contrasena = `La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`;
    if (Object.keys(errores).length > 0) {
      throw badRequest('Revisa los datos del registro', errores);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const duplicadoCorreo = await client.query(
        `SELECT 1 FROM usuario WHERE LOWER(correo) = $1
         UNION ALL SELECT 1 FROM cliente WHERE LOWER(correo) = $1`,
        [correo]
      );
      if (duplicadoCorreo.rows.length > 0) {
        throw conflict('Ya existe una cuenta registrada con ese correo');
      }
      const duplicadoDocumento = await client.query('SELECT 1 FROM cliente WHERE documento = $1', [documento]);
      if (duplicadoDocumento.rows.length > 0) {
        throw conflict('Ya existe un cliente registrado con ese número de documento');
      }

      const rol = await client.query(`SELECT id_rol, nombre FROM rol WHERE nombre = 'Cliente' AND estado = 'Activo'`);
      if (rol.rows.length === 0) {
        throw new HttpError(500, 'El rol Cliente no está configurado');
      }

      const hash = await bcrypt.hash(contrasena, SALT_ROUNDS);
      const usuario = await client.query(
        `INSERT INTO usuario (nombre, correo, contrasena_hash, id_rol, estado)
         VALUES ($1, $2, $3, $4, 'Activo')
         RETURNING id_usuario, nombre, correo, id_rol, estado`,
        [nombre, correo, hash, rol.rows[0].id_rol]
      );
      const nuevoUsuario = usuario.rows[0];

      const cliente = await client.query(
        `INSERT INTO cliente (nombre, tipo_documento, documento, telefono, correo, direccion, municipio, barrio, estado, id_usuario,
                              tipo_persona, nombres, apellidos, razon_social)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Activo', $9, $10, $11, $12, $13)
         RETURNING id_cliente`,
        [nombre, tipoDocumento, documento, telefono, correo, direccion, municipio, barrio, nuevoUsuario.id_usuario,
          persona.tipo_persona, persona.nombres, persona.apellidos, persona.razon_social]
      );

      await client.query('COMMIT');
      return crearSesion({
        ...nuevoUsuario,
        rol_nombre: rol.rows[0].nombre,
        id_cliente: cliente.rows[0].id_cliente,
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
