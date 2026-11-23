import { ProductosService } from '../services/productos.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class ProductosController {
  static async getAll(req, res, next) {
    try {
      const data = await ProductosService.getAll();
      return successResponse(res, data, 'Productos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ProductosService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Producto no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await ProductosService.create(req.body);
      return successResponse(res, data, 'Producto creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await ProductosService.update(req.params.id, req.body);
      if (!data) return errorResponse(res, 'Producto no encontrado', 404);
      return successResponse(res, data, 'Producto actualizado exitosamente');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const deleted = await ProductosService.delete(req.params.id);
      if (!deleted) return errorResponse(res, 'Producto no encontrado', 404);
      return successResponse(res, null, 'Producto eliminado exitosamente');
    } catch (e) { next(e); }
  }
}
