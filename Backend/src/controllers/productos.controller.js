import { ProductosService } from '../services/productos.service.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { tienePermiso } from '../middlewares/auth.middleware.js';

// Sin sesión o sin permiso de productos:ver solo se ven los registros activos (catálogo público).
const soloActivos = async (req) => !(req.user && await tienePermiso(req.user.id_rol, [['productos', 'ver']]));

export class ProductosController {
  static async getAll(req, res, next) {
    try {
      const data = await ProductosService.getAll({ soloActivos: await soloActivos(req) });
      return successResponse(res, data, 'Productos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ProductosService.getById(req.params.id, { soloActivos: await soloActivos(req) });
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

  /** DELETE /productos/:id/definitivo (productos:eliminar): borra solo sin registros asociados. */
  static async eliminarDefinitivo(req, res, next) {
    try {
      await ProductosService.eliminarDefinitivo(req.params.id);
      return successResponse(res, null, 'Producto eliminado');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await ProductosService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Producto no encontrado', 404);
      return successResponse(res, null, 'Producto inactivado exitosamente');
    } catch (e) { next(e); }
  }
}
