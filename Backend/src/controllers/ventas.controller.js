import { VentasService } from '../services/ventas.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

const SOLO_LECTURA =
  'Las ventas son de solo lectura: una venta se registra marcando un pedido como Entregado (y se anula anulando el pedido).';

/** ?incluir_anuladas=1 (o true): también las ventas anuladas. */
const conAnuladas = (req) => ['1', 'true'].includes(String(req.query.incluir_anuladas || '').toLowerCase());

export class VentasController {
  static async getAll(req, res, next) {
    try {
      const data = await VentasService.getAll({ incluirAnuladas: conAnuladas(req) });
      return successResponse(res, data, 'Ventas recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await VentasService.getById(req.params.id, { incluirAnuladas: conAnuladas(req) });
      if (!data) return errorResponse(res, 'Venta no encontrada', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  /** POST /ventas/:id/anular { motivo } → la venta queda Anulada. */
  static async anular(req, res, next) {
    try {
      const data = await VentasService.anular(req.user, req.params.id, req.body?.motivo);
      return successResponse(res, data, `La venta #${req.params.id} fue anulada`);
    } catch (e) { next(e); }
  }

  /** GET /ventas/:id/comprobante → { tipo, url } para abrir el comprobante de pago. */
  static async enlaceComprobante(req, res, next) {
    try {
      const enlace = await VentasService.enlaceComprobante(req.params.id);
      if (!enlace) return errorResponse(res, 'La venta no tiene comprobante adjunto', 404);
      return successResponse(res, enlace);
    } catch (e) { next(e); }
  }

  /** GET /ventas/:id/comprobante/archivo: comprobante guardado en disco (sin Cloudinary). */
  static async archivoComprobante(req, res, next) {
    try {
      const ruta = await VentasService.rutaComprobanteLocal(req.params.id);
      if (!ruta) return errorResponse(res, 'Comprobante no encontrado', 404);
      res.set('Cache-Control', 'private, max-age=300');
      return res.sendFile(ruta);
    } catch (e) { next(e); }
  }

  /** POST, PUT y DELETE: 405 con la explicación para la web. */
  static soloLectura(req, res) {
    res.set('Allow', 'GET');
    return errorResponse(res, SOLO_LECTURA, 405);
  }
}
