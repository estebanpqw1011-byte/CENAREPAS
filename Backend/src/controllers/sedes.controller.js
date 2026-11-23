import { SedesService } from '../services/sedes.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class SedesController {
  static async getAll(req, res, next) {
    try {
      const data = await SedesService.getAll();
      return successResponse(res, data, 'Sedes recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await SedesService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Sede no encontrada', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await SedesService.create(req.body);
      return successResponse(res, data, 'Sede creada exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await SedesService.update(req.params.id, req.body);
      return successResponse(res, data, 'Sede actualizada exitosamente');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await SedesService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Sede no encontrada', 404);
      return successResponse(res, null, 'Sede inactivada exitosamente');
    } catch (e) { next(e); }
  }
}
