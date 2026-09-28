import { PedidosService } from '../services/pedidos.service.js';
import { normalizarEstadoPedido } from '../utils/normalizar.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class PedidosController {
  static async getAll(req, res, next) {
    try {
      const data = await PedidosService.getAll({
        estado: normalizarEstadoPedido(req.query.estado),
        idCliente: req.query.id_cliente ? Number(req.query.id_cliente) : null,
      });
      return successResponse(res, data, 'Pedidos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await PedidosService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Pedido no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  /** GET /pedidos/:id/historial: cambios de estado, del más antiguo al más reciente. */
  static async historial(req, res, next) {
    try {
      const data = await PedidosService.historial(req.params.id);
      if (!data) return errorResponse(res, 'Pedido no encontrado', 404);
      return successResponse(res, data, 'Historial de estados recuperado correctamente');
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await PedidosService.crearPorPersonal(req.user, req.body || {});
      return successResponse(res, data, 'Pedido creado exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await PedidosService.update(req.user, req.params.id, req.body || {});
      if (!data) return errorResponse(res, 'Pedido no encontrado', 404);
      return successResponse(res, data, 'Pedido actualizado exitosamente');
    } catch (e) { next(e); }
  }

  /** PATCH /pedidos/:id/estado { estado, motivo } — notifica al cliente. */
  static async cambiarEstado(req, res, next) {
    try {
      const { estado, motivo } = req.body || {};
      const data = await PedidosService.cambiarEstado(req.user, req.params.id, estado, motivo);
      return successResponse(res, data, `Pedido actualizado a ${data.estado}`);
    } catch (e) { next(e); }
  }

  /** DELETE /pedidos/:id/definitivo (pedidos:eliminar): solo Pendiente y sin abonos. */
  static async eliminarDefinitivo(req, res, next) {
    try {
      await PedidosService.eliminarDefinitivo(req.params.id);
      return successResponse(res, null, 'Pedido eliminado');
    } catch (e) { next(e); }
  }

  /** DELETE: anula (sin borrado físico). Acepta ?motivo= o { motivo }. */
  static async delete(req, res, next) {
    try {
      const motivo = req.body?.motivo || req.query.motivo;
      const ok = await PedidosService.anular(req.user, req.params.id, motivo);
      if (!ok) return errorResponse(res, 'Pedido no encontrado', 404);
      return successResponse(res, null, 'Pedido anulado exitosamente');
    } catch (e) { next(e); }
  }
}
