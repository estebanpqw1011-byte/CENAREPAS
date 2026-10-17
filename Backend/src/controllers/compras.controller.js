import { ComprasService } from '../services/compras.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export class ComprasController {
  static async getAll(req, res, next) {
    try {
      const data = await ComprasService.getAll();
      return successResponse(res, data, 'Compras recuperadas correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await ComprasService.getById(req.params.id);
      if (!data) return errorResponse(res, 'Compra no encontrada', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  /** GET /compras/:id/comprobante → { tipo, url } para abrir o descargar el soporte. */
  static async enlaceComprobante(req, res, next) {
    try {
      const enlace = await ComprasService.enlaceComprobante(req.params.id);
      if (!enlace) return errorResponse(res, 'La compra no tiene soporte adjunto', 404);
      return successResponse(res, enlace);
    } catch (e) { next(e); }
  }

  /** GET /compras/:id/comprobante/archivo: soporte guardado en disco (sin Cloudinary). */
  static async archivoComprobante(req, res, next) {
    try {
      const ruta = await ComprasService.rutaComprobanteLocal(req.params.id);
      if (!ruta) return errorResponse(res, 'Soporte no encontrado', 404);
      res.set('Cache-Control', 'private, max-age=300');
      return res.sendFile(ruta);
    } catch (e) { next(e); }
  }

  static async create(req, res, next) {
    try {
      const data = await ComprasService.create(req.body);
      return successResponse(res, data, 'Compra creada exitosamente', 201);
    } catch (e) { next(e); }
  }

  static async update(req, res, next) {
    try {
      const data = await ComprasService.update(req.params.id, req.body);
      return successResponse(res, data, 'Compra actualizada exitosamente');
    } catch (e) { next(e); }
  }

  static async delete(req, res, next) {
    try {
      const ok = await ComprasService.delete(req.params.id);
      if (!ok) return errorResponse(res, 'Compra no encontrada', 404);
      return successResponse(res, null, 'Compra anulada exitosamente');
    } catch (e) { next(e); }
  }
}
