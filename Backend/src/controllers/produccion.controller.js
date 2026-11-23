import { ProduccionService } from '../services/produccion.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class ProduccionController {
  static async getAll(req, res, next) {
    try {
      const data = await ProduccionService.getAll();
      return successResponse(res, data, 'Lotes de producción recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ProduccionService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Lote de producción no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await ProduccionService.create(req.body);
      return successResponse(res, data, 'Lote de producción creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await ProduccionService.update(req.params.id, req.body);
      if (!data) return errorResponse(res, 'Lote de producción no encontrado', 404);
      return successResponse(res, data, 'Lote de producción actualizado exitosamente');
    } catch (e) { next(e); }
  }

  static async anular(req, res, next) {
    try {
      const data = await ProduccionService.anular(req.params.id);
      return successResponse(res, data, 'Lote de producción anulado e inventario revertido');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    return ProduccionController.anular(req, res, next);
  }
}
