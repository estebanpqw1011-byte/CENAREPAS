import { FichasTecnicasService } from '../services/fichasTecnicas.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class FichasTecnicasController {
  static async getAll(req, res, next) {
    try {
      const data = await FichasTecnicasService.getAll();
      return successResponse(res, data, 'Fichas técnicas recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await FichasTecnicasService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Ficha técnica no encontrada', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await FichasTecnicasService.create(req.body);
      return successResponse(res, data, 'Ficha técnica creada exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await FichasTecnicasService.update(req.params.id, req.body);
      return successResponse(res, data, 'Ficha técnica actualizada exitosamente');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await FichasTecnicasService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Ficha técnica no encontrada', 404);
      return successResponse(res, null, 'Ficha técnica inactivada exitosamente');
    } catch (e) { next(e); }
  }
}
