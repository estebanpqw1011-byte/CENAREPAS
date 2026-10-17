import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { enTransaccion } from '../utils/transaccion.js';
import { badRequest, conflict, notFound } from '../utils/httpError.js';
import { validarFichaCliente } from '../utils/fichaCliente.js';
import { armarPersona } from '../utils/persona.js';
import { texto } from '../utils/normalizar.js';
import { CONTRASENA_MIN, MUNICIPIOS_ENTREGA } from '../config/negocio.js';

const SELECT_PERFIL = `
  SELECT u.id_usuario, c.id_cliente, c.nombre, u.correo, c.tipo_documento, c.documento, c.telefono,
         c.direccion, c.municipio, c.barrio, c.fecha_creacion
  FROM usuario u JOIN cliente c ON c.id_usuario = u.id_usuario
  WHERE u.id_usuario = $1`;

/** Perfil del cliente (HU-170). Siempre el del token. */
export class PerfilService {
  static async obtener(idUsuario) {
    const res = await query(SELECT_PERFIL, [idUsuario]);
    if (res.rows.length === 0) throw notFound('Perfil no encontrado');
    return res.rows[0];
  }

  /** CA-170-001/002: nombre, teléfono y dirección; el documento y el correo no se editan. */
  static async actualizar(idUsuario, datos) {
    const actual = await this.obtener(idUsuario);
    const valor = (campo) => (datos[campo] !== undefined ? texto(datos[campo]) : actual[campo] || '');
    const nombre = valor('nombre');
    const telefono = valor('telefono');
    const direccion = valor('direccion');
    const municipio = valor('municipio');
    const barrio = valor('barrio');

    const errores = {};
    if (datos.documento !== undefined && texto(datos.documento) !== actual.documento) {
      errores.documento = 'El número de documento no se puede modificar';
    }
    if (nombre.length < 3) errores.nombre = 'Ingresa tu nombre completo';
    if (!/^[0-9+ ]{7,15}$/.test(telefono)) errores.telefono = 'Ingresa un teléfono válido';
    if (direccion.length < 5) errores.direccion = 'Ingresa tu dirección';
    if (!MUNICIPIOS_ENTREGA.includes(municipio)) errores.municipio = 'Selecciona un municipio del Área Metropolitana';
    if (!barrio) errores.barrio = 'Ingresa tu barrio';
    if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del perfil', errores);

    await enTransaccion(async (db) => {
      await db.query(
        // El perfil edita un solo "nombre": Natural → nombres (sin apellidos aparte); Jurídica → razón social.
        `UPDATE cliente SET nombre = $1, telefono = $2, direccion = $3, municipio = $4, barrio = $5,
                nombres = CASE WHEN tipo_persona = 'Jurídica' THEN NULL ELSE $1 END,
                apellidos = NULL,
                razon_social = CASE WHEN tipo_persona = 'Jurídica' THEN $1 ELSE NULL END
         WHERE id_usuario = $6`,
        [nombre, telefono, direccion, municipio, barrio, idUsuario]
      );
      await db.query('UPDATE usuario SET nombre = $1 WHERE id_usuario = $2', [nombre, idUsuario]);
    });
    return this.obtener(idUsuario);
  }

  /**
   * "Completa tu perfil": crea la ficha (fila en cliente) de un usuario Cliente
   * que no la tiene. El usuario y el correo salen SIEMPRE del token. Documento o
   * correo ya usados por otro cliente → 409 (restricciones únicas de la base).
   */
  static async completar(usuario, datos) {
    const { valores, errores } = validarFichaCliente(datos);
    if (Object.keys(errores).length > 0) throw badRequest('Revisa los datos del perfil', errores);
    const { nombre, tipoDocumento, documento, telefono, municipio, barrio, direccion } = valores;
    // Tipo de persona y nombres o razón social (Jurídica si el documento es NIT).
    const { valores: persona } = armarPersona({ nombre }, {}, { tipoDocumento });

    await enTransaccion(async (db) => {
      const existe = await db.query('SELECT 1 FROM cliente WHERE id_usuario = $1', [usuario.id_usuario]);
      if (existe.rows.length > 0) throw conflict('Tu perfil ya está completo');
      await db.query(
        `INSERT INTO cliente (nombre, tipo_documento, documento, telefono, correo, direccion, municipio, barrio, estado, id_usuario,
                              tipo_persona, nombres, apellidos, razon_social)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Activo', $9, $10, $11, $12, $13)`,
        [nombre, tipoDocumento, documento, telefono, usuario.correo, direccion, municipio, barrio, usuario.id_usuario,
          persona.tipo_persona, persona.nombres, persona.apellidos, persona.razon_social]
      );
      await db.query('UPDATE usuario SET nombre = $1 WHERE id_usuario = $2', [nombre, usuario.id_usuario]);
    });
    return this.obtener(usuario.id_usuario);
  }

  /** CA-170-003: cambia la contraseña validando la actual. */
  static async cambiarContrasena(idUsuario, { contrasena_actual: actual, contrasena_nueva: nueva } = {}) {
    if (typeof nueva !== 'string' || nueva.length < CONTRASENA_MIN) {
      throw badRequest(`La nueva contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`);
    }
    const res = await query('SELECT contrasena_hash FROM usuario WHERE id_usuario = $1', [idUsuario]);
    const hash = res.rows[0]?.contrasena_hash;
    const valida = hash ? await bcrypt.compare(String(actual || ''), hash) : false;
    if (!valida) {
      throw badRequest('La contraseña actual no es correcta', { contrasena_actual: 'La contraseña actual no es correcta' });
    }
    if (await bcrypt.compare(nueva, hash)) {
      throw badRequest('La nueva contraseña debe ser diferente a la actual');
    }
    await query('UPDATE usuario SET contrasena_hash = $1 WHERE id_usuario = $2', [await bcrypt.hash(nueva, 10), idUsuario]);
    return { actualizada: true };
  }
}
