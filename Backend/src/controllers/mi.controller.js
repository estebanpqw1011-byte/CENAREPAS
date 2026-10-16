import { PedidosService } from '../services/pedidos.service.js';
import { CreditosService } from '../services/creditos.service.js';
import { NotificacionesService } from '../services/notificaciones.service.js';
import { PerfilService } from '../services/perfil.service.js';
import { validarComprobanteDelUsuario } from '../middlewares/comprobante.middleware.js';
import { normalizarEstadoPedido } from '../utils/normalizar.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Endpoints del cliente. NUNCA reciben el id del cliente desde la app:
 * todo se filtra con req.user (id_usuario e id_cliente del token).
 */
export class MiController {
  // ─── Pedidos (HU-160, HU-162 a HU-164) ───
  static async pedidos(req, res, next) {
    try {
      const data = await PedidosService.getAll({
        idCliente: req.user.id_cliente,
        estado: normalizarEstadoPedido(req.query.estado),
      });
      return successResponse(res, data, 'Pedidos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async pedido(req, res, next) {
    try {
      const data = await PedidosService.getById(req.params.id, { idCliente: req.user.id_cliente });
      if (!data) return errorResponse(res, 'Pedido no encontrado', 404);
      // Historial de estados: la misma fuente que GET /pedidos/:id/historial
      // (pedido_estado_historial), sin nombre ni id del personal.
      const historial = await PedidosService.historial(req.params.id, { idCliente: req.user.id_cliente });
      data.historial = (historial || []).map((h) => ({
        estado_anterior: h.estado_anterior,
        estado_nuevo: h.estado_nuevo,
        motivo: h.motivo,
        fecha_cambio: h.fecha_cambio,
        reconstruido: h.reconstruido,
        rol_nombre: h.rol_nombre,
        propio: h.id_usuario === req.user.id_usuario,
      }));
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async crearPedido(req, res, next) {
    try {
      const body = req.body || {};
      const comprobante = validarComprobanteDelUsuario(body.comprobante_url, req.user.id_usuario);
      const data = await PedidosService.crearPorCliente(req.user, body, comprobante);
      return successResponse(res, data, `Pedido #${data.id_pedido} registrado`, 201);
    } catch (e) { next(e); }
  }

  static async anularPedido(req, res, next) {
    try {
      const data = await PedidosService.anularPorCliente(req.user, req.params.id, req.body?.motivo);
      return successResponse(res, data, 'Pedido anulado');
    } catch (e) { next(e); }
  }

  // ─── Créditos y abonos (HU-166, HU-167) ───
  static async creditos(req, res, next) {
    try {
      const data = await CreditosService.creditosDeCliente(req.user.id_cliente);
      return successResponse(res, data, 'Créditos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async credito(req, res, next) {
    try {
      const data = await CreditosService.creditoDeCliente(req.user.id_cliente, req.params.id);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  static async registrarAbono(req, res, next) {
    try {
      const body = req.body || {};
      const comprobante = validarComprobanteDelUsuario(body.comprobante_url, req.user.id_usuario);
      const data = await CreditosService.registrarPorCliente(req.user, Number(req.params.id), body, comprobante);
      return successResponse(res, data, 'Abono registrado: queda en revisión', 201);
    } catch (e) { next(e); }
  }

  // ─── Notificaciones (HU-168, HU-169) ───
  static async notificaciones(req, res, next) {
    try {
      const data = await NotificacionesService.listar(req.user.id_usuario);
      return successResponse(res, data, 'Notificaciones recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async marcarLeida(req, res, next) {
    try {
      const data = await NotificacionesService.marcarLeida(req.user.id_usuario, req.params.id);
      return successResponse(res, data, 'Notificación marcada como leída');
    } catch (e) { next(e); }
  }

  static async marcarTodasLeidas(req, res, next) {
    try {
      const data = await NotificacionesService.marcarTodasLeidas(req.user.id_usuario);
      return successResponse(res, data, 'Notificaciones marcadas como leídas');
    } catch (e) { next(e); }
  }

  // ─── Perfil (HU-170) ───
  static async perfil(req, res, next) {
    try {
      return successResponse(res, await PerfilService.obtener(req.user.id_usuario));
    } catch (e) { next(e); }
  }

  static async actualizarPerfil(req, res, next) {
    try {
      const data = await PerfilService.actualizar(req.user.id_usuario, req.body || {});
      return successResponse(res, data, 'Perfil actualizado');
    } catch (e) { next(e); }
  }

  static async cambiarContrasena(req, res, next) {
    try {
      const data = await PerfilService.cambiarContrasena(req.user.id_usuario, req.body || {});
      return successResponse(res, data, 'Contraseña actualizada');
    } catch (e) { next(e); }
  }
}
