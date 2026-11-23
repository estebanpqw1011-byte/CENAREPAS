import { AuthService } from '../services/auth.service.js';
import { RecuperacionService } from '../services/recuperacion.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class AuthController {
  static async login(req, res, next) {
    try {
      const { email, correo, password, contrasena } = req.body || {};
      const userEmail = correo || email;
      const userPassword = contrasena || password;

      if (!userEmail || !userPassword) {
        return errorResponse(res, 'El correo y la contraseña son requeridos', 400);
      }

      const result = await AuthService.login(userEmail, userPassword);
      return successResponse(res, result, 'Inicio de sesión exitoso');
    } catch (error) {
      next(error);
    }
  }

  /** POST /auth/recuperar { correo } → siempre la misma respuesta (429 si pide otro en menos de 1 minuto). */
  static async recuperar(req, res, next) {
    try {
      const data = await RecuperacionService.solicitar(req.body?.correo);
      return successResponse(res, data, data.mensaje);
    } catch (error) {
      next(error);
    }
  }

  /** POST /auth/verificar-codigo { correo, codigo } */
  static async verificarCodigo(req, res, next) {
    try {
      const data = await RecuperacionService.verificar(req.body?.correo, req.body?.codigo);
      return successResponse(res, data, 'Código válido');
    } catch (error) {
      next(error);
    }
  }

  /** POST /auth/restablecer { correo, codigo, contrasena, confirmacion } */
  static async restablecer(req, res, next) {
    try {
      const b = req.body || {};
      const data = await RecuperacionService.restablecer(b.correo, b.codigo, b.contrasena, b.confirmacion);
      return successResponse(res, data, data.mensaje);
    } catch (error) {
      next(error);
    }
  }

  /** Registro público: siempre crea un Cliente. Cualquier id_rol del cuerpo se ignora. */
  static async register(req, res, next) {
    try {
      const body = req.body || {};
      const result = await AuthService.registrarCliente({
        nombre: body.nombre ?? body.name,
        tipo_documento: body.tipo_documento,
        documento: body.documento,
        telefono: body.telefono,
        correo: body.correo ?? body.email,
        municipio: body.municipio,
        barrio: body.barrio,
        direccion: body.direccion,
        contrasena: body.contrasena ?? body.password,
      });
      return successResponse(res, result, 'Cliente registrado exitosamente', 201);
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res) {
    return successResponse(res, req.user, 'Perfil obtenido correctamente');
  }
}
