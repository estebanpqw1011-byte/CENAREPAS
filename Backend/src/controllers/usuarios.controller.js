import { UsuariosService } from '../services/usuarios.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { tienePermiso } from '../middlewares/auth.middleware.js';

export class UsuariosController {
  static async getAll(req, res, next) {
    try {
      const resumido = !(await tienePermiso(req.user.id_rol, [['usuarios', 'ver']]));
      const data = await UsuariosService.getAll({ resumido });
      return successResponse(res, data, 'Usuarios recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await UsuariosService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Usuario no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await UsuariosService.create(req.body);
      return successResponse(res, data, 'Usuario creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await UsuariosService.update(req.params.id, req.body);
      if (!data) return errorResponse(res, 'Usuario no encontrado', 404);
      return successResponse(res, data, 'Usuario actualizado exitosamente');
    } catch (e) { next(e); }
  }

  /** DELETE /usuarios/:id/definitivo (usuarios:eliminar): borra solo sin registros asociados. */
  static async eliminarDefinitivo(req, res, next) {
    try {
      await UsuariosService.eliminarDefinitivo(req.params.id, req.user.id_usuario);
      return successResponse(res, null, 'Usuario eliminado');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await UsuariosService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Usuario no encontrado', 404);
      return successResponse(res, null, 'Usuario inactivado exitosamente');
    } catch (e) { next(e); }
  }
}
