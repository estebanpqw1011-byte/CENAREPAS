import { ClientesService } from '../services/clientes.service.js';
import { tienePermiso } from '../middlewares/auth.middleware.js';
import { forbidden } from '../utils/httpError.js';
import { successResponse, errorResponse } from '../utils/response.js';

const ESTADOS = { activo: 'Activo', inactivo: 'Inactivo' };

export class ClientesController {
  static async getAll(req, res, next) {
    try {
      const data = await ClientesService.getAll();
      return successResponse(res, data, 'Clientes recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ClientesService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Cliente no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await ClientesService.create(req.body);
      return successResponse(res, data, 'Cliente creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  /**
   * PUT /clientes/:id. Cambiar el estado exige clientes:cambiar_estado (el
   * Vendedor solo edita datos). Un estado igual al actual (sin distinguir
   * mayúsculas) se ignora, porque la web envía el cliente completo al editar.
   */
  static async update(req, res, next) {
    try {
      const datos = { ...req.body };
      if (datos.estado !== undefined && datos.estado !== null) {
        const actual = await ClientesService.getById(req.params.id);
        if (!actual) return errorResponse(res, 'Cliente no encontrado', 404);
        const nuevo = String(datos.estado).trim().toLowerCase();
        if (nuevo === String(actual.estado).toLowerCase()) {
          delete datos.estado;
        } else if (!(await tienePermiso(req.user.id_rol, [['clientes', 'cambiar_estado']]))) {
          throw forbidden('No tienes permiso para cambiar el estado del cliente');
        } else {
          datos.estado = ESTADOS[nuevo] ?? datos.estado;
        }
      }
      const data = await ClientesService.update(req.params.id, datos);
      return successResponse(res, data, 'Cliente actualizado exitosamente');
    } catch (e) { next(e); }
  }

  /** DELETE /clientes/:id/definitivo (clientes:eliminar): borra solo sin registros asociados. */
  static async eliminarDefinitivo(req, res, next) {
    try {
      await ClientesService.eliminarDefinitivo(req.params.id);
      return successResponse(res, null, 'Cliente eliminado');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await ClientesService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Cliente no encontrado', 404);
      return successResponse(res, null, 'Cliente inactivado exitosamente');
    } catch (e) { next(e); }
  }
}
