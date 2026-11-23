import { ProveedoresService } from '../services/proveedores.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class ProveedoresController {
  static async getAll(req, res, next) {
    try {
      const data = await ProveedoresService.getAll();
      return successResponse(res, data, 'Proveedores recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ProveedoresService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Proveedor no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await ProveedoresService.create(req.body);
      return successResponse(res, data, 'Proveedor creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await ProveedoresService.update(req.params.id, req.body);
      return successResponse(res, data, 'Proveedor actualizado exitosamente');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await ProveedoresService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Proveedor no encontrado', 404);
      return successResponse(res, null, 'Proveedor inactivado exitosamente');
    } catch (e) { next(e); }
  }
}
