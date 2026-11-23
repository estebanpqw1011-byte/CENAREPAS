import { CategoriasService } from '../services/categorias.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { tienePermiso } from '../middlewares/auth.middleware.js';

// Sin sesión o sin permiso de categorias:ver solo se ven los registros activos (catálogo público).
const soloActivos = async (req) => !(req.user && await tienePermiso(req.user.id_rol, [['categorias', 'ver']]));

export class CategoriasController {
  static async getAll(req, res, next) {
    try {
      const data = await CategoriasService.getAll({ soloActivos: await soloActivos(req) });
      return successResponse(res, data, 'Categorías recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await CategoriasService.getById(req.params.id, { soloActivos: await soloActivos(req) });
      if (!data) return errorResponse(res, 'Categoría no encontrada', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await CategoriasService.create(req.body);
      return successResponse(res, data, 'Categoría creada exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await CategoriasService.update(req.params.id, req.body);
      if (!data) return errorResponse(res, 'Categoría no encontrada', 404);
      return successResponse(res, data, 'Categoría actualizada exitosamente');
    } catch (e) { next(e); }
  }

  /** DELETE /categorias/:id/definitivo (categorias:eliminar): borra solo sin registros asociados. */
  static async eliminarDefinitivo(req, res, next) {
    try {
      await CategoriasService.eliminarDefinitivo(req.params.id);
      return successResponse(res, null, 'Categoría eliminada');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await CategoriasService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Categoría no encontrada', 404);
      return successResponse(res, null, 'Categoría inactivada exitosamente');
    } catch (e) { next(e); }
  }
}
