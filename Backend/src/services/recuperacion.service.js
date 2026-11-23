import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from '../config/db.js';
import { config } from '../config/env.js';
import {
  CONTRASENA_MIN,
  RECUPERACION_CODIGO_MINUTOS,
  RECUPERACION_ESPERA_SEGUNDOS,
  RECUPERACION_INTENTOS_MAX,
} from '../config/negocio.js';
import { HttpError, badRequest } from '../utils/httpError.js';
import { texto } from '../utils/normalizar.js';
import { CorreoService } from './correo.service.js';

const SALT_ROUNDS = 10;
const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODIGO_REGEX = /^\d{6}$/;

/** Misma respuesta exista o no el correo (no revela qué cuentas existen). */
const MENSAJE_SOLICITUD =
  'Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa también la carpeta de spam.';
const CODIGO_INVALIDO = 'El código no es válido o ya venció. Solicita uno nuevo.';

/**
 * Última solicitud por correo (en memoria). Se aplica igual a correos que
 * existen y que no, para no revelar cuáles están registrados. Se reinicia
 * si el servidor se reinicia; para este volumen es suficiente.
 */
const ultimaSolicitud = new Map();

/** Solo se guarda el hash del código (HMAC con el secreto del servidor). */
const hashCodigo = (idUsuario, codigo) =>
  crypto.createHmac('sha256', config.jwt.secret).update(`${idUsuario}:${codigo}`).digest('hex');

const iguales = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Correo para el log: "s***@gmail.com" (nunca el correo completo). */
export const enmascararCorreo = (correo) => {
  const [usuario, dominio] = String(correo).split('@');
  return `${(usuario || '?').charAt(0)}***@${dominio || '?'}`;
};

/** Mensaje de error apto para el log: sin correos ni números de 6 dígitos (el código). */
const mensajeSeguro = (mensaje) =>
  String(mensaje)
    .replace(/[^\s@"'<>]+@[^\s@"'<>]+/g, (c) => enmascararCorreo(c))
    .replace(/\b\d{6}\b/g, '******');

const correoDe = (valor) => {
  const correo = texto(valor).toLowerCase();
  if (!CORREO_REGEX.test(correo)) throw badRequest('Ingresa un correo válido', { correo: 'Ingresa un correo válido' });
  return correo;
};

/**
 * Recuperación de contraseña con código de 6 dígitos (HU-003, HU-004).
 * CA-003-002 habla de "enlace": se cumple con un código de verificación
 * (ver HANDOFF de la app).
 */
export class RecuperacionService {
  /** Solo para las pruebas: vacía el límite de una solicitud por minuto. */
  static limpiarLimite() {
    ultimaSolicitud.clear();
  }

  /** POST /auth/recuperar: genera y envía el código. */
  static async solicitar(correoRecibido) {
    const correo = correoDe(correoRecibido);

    const ahora = Date.now();
    const ultima = ultimaSolicitud.get(correo);
    if (ultima && ahora - ultima < RECUPERACION_ESPERA_SEGUNDOS * 1000) {
      const faltan = Math.ceil((RECUPERACION_ESPERA_SEGUNDOS * 1000 - (ahora - ultima)) / 1000);
      throw new HttpError(429, `Ya pediste un código. Espera ${faltan} segundos para pedir otro.`);
    }
    ultimaSolicitud.set(correo, ahora);

    const res = await query('SELECT id_usuario, nombre, estado FROM usuario WHERE LOWER(correo) = $1', [correo]);
    const usuario = res.rows[0];
    if (usuario && String(usuario.estado).toLowerCase() === 'activo') {
      const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      await query(
        `UPDATE usuario
         SET token_recuperacion = $1,
             token_expiracion = LOCALTIMESTAMP + make_interval(mins => $2),
             recuperacion_intentos = 0
         WHERE id_usuario = $3`,
        [hashCodigo(usuario.id_usuario, codigo), RECUPERACION_CODIGO_MINUTOS, usuario.id_usuario]
      );
      // Sin esperar el envío: la respuesta tarda lo mismo exista o no la cuenta.
      CorreoService.enviar({
        para: correo,
        nombre: usuario.nombre,
        asunto: 'Tu código para restablecer la contraseña de CENAREPAS',
        texto:
          `Hola ${usuario.nombre}:\n\n` +
          `Tu código para restablecer la contraseña es: ${codigo}\n\n` +
          `Vence en ${RECUPERACION_CODIGO_MINUTOS} minutos. Si no lo pediste, ignora este correo: tu contraseña no cambia.`,
      }).catch((err) =>
        // Queda en el log del servidor, con el correo enmascarado y sin el código.
        console.error(`[Recuperacion] No se pudo enviar el código a ${enmascararCorreo(correo)}: ${mensajeSeguro(err.message)}`)
      );
    }
    return { mensaje: MENSAJE_SOLICITUD };
  }

  /**
   * Comprueba el código. Un intento fallido suma al contador; al llegar a
   * RECUPERACION_INTENTOS_MAX el código se invalida.
   */
  static async #comprobar(correo, codigoRecibido) {
    const codigo = texto(codigoRecibido);
    if (!CODIGO_REGEX.test(codigo)) {
      throw badRequest('El código tiene 6 dígitos', { codigo: 'El código tiene 6 dígitos' });
    }
    const res = await query(
      `SELECT id_usuario, token_recuperacion, token_expiracion > LOCALTIMESTAMP AS vigente
       FROM usuario WHERE LOWER(correo) = $1 AND token_recuperacion IS NOT NULL`,
      [correo]
    );
    const usuario = res.rows[0];
    if (!usuario || !usuario.vigente) throw badRequest(CODIGO_INVALIDO, { codigo: CODIGO_INVALIDO });
    if (iguales(usuario.token_recuperacion, hashCodigo(usuario.id_usuario, codigo))) return usuario;

    // Suma el intento de forma atómica (dos intentos a la vez cuentan los dos).
    const suma = await query(
      `UPDATE usuario SET recuperacion_intentos = recuperacion_intentos + 1
       WHERE id_usuario = $1 AND token_recuperacion IS NOT NULL
       RETURNING recuperacion_intentos`,
      [usuario.id_usuario]
    );
    const intentos = suma.rows[0]?.recuperacion_intentos ?? RECUPERACION_INTENTOS_MAX;
    if (intentos >= RECUPERACION_INTENTOS_MAX) {
      await query('UPDATE usuario SET token_recuperacion = NULL, token_expiracion = NULL WHERE id_usuario = $1', [
        usuario.id_usuario,
      ]);
      const mensaje = `Superaste los ${RECUPERACION_INTENTOS_MAX} intentos. Solicita un código nuevo.`;
      throw badRequest(mensaje, { codigo: mensaje });
    }
    const quedan = RECUPERACION_INTENTOS_MAX - intentos;
    const mensaje = `Código incorrecto. Te ${quedan === 1 ? 'queda 1 intento' : `quedan ${quedan} intentos`}.`;
    throw badRequest(mensaje, { codigo: mensaje });
  }

  /** POST /auth/verificar-codigo: no consume el código (solo lo valida). */
  static async verificar(correoRecibido, codigo) {
    await this.#comprobar(correoDe(correoRecibido), codigo);
    return { valido: true };
  }

  /** POST /auth/restablecer: nueva contraseña con el código; el código se usa una sola vez. */
  static async restablecer(correoRecibido, codigo, contrasena, confirmacion) {
    const correo = correoDe(correoRecibido);
    const nueva = typeof contrasena === 'string' ? contrasena : '';
    const errores = {};
    if (nueva.length < CONTRASENA_MIN) errores.contrasena = `La contraseña debe tener al menos ${CONTRASENA_MIN} caracteres`;
    if (confirmacion !== nueva) errores.confirmacion = 'Las contraseñas no coinciden';
    // Estos errores no gastan intentos del código.
    if (Object.keys(errores).length > 0) throw badRequest(Object.values(errores)[0], errores);

    const usuario = await this.#comprobar(correo, codigo);
    const hash = await bcrypt.hash(nueva, SALT_ROUNDS);
    // Condición sobre el mismo hash: si dos peticiones usan el código a la vez, solo una cambia la contraseña.
    const res = await query(
      `UPDATE usuario
       SET contrasena_hash = $1, token_recuperacion = NULL, token_expiracion = NULL, recuperacion_intentos = 0
       WHERE id_usuario = $2 AND token_recuperacion = $3
       RETURNING id_usuario`,
      [hash, usuario.id_usuario, usuario.token_recuperacion]
    );
    if (res.rows.length === 0) throw badRequest(CODIGO_INVALIDO, { codigo: CODIGO_INVALIDO });
    return { mensaje: 'Tu contraseña se cambió. Ya puedes iniciar sesión.' };
  }
}
