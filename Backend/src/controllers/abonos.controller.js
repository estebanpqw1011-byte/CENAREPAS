import { CreditosService } from '../services/creditos.service.js';
import { validarComprobanteDelSistema } from '../middlewares/comprobante.middleware.js';
import { badRequest } from '../utils/httpError.js';
import { fechaValida } from '../utils/normalizar.js';
import { successResponse, errorResponse } from '../utils/response.js';

/** Filtros de GET /abonos validados: 400 con el error por campo. */
const filtrosAbonos = (q) => {
  const errores = {};
  const entero = (campo) => {
    if (q[campo] === undefined || q[campo] === '') return null;
    const n = Number(q[campo]);
    if (!Number.isInteger(n) || n <= 0) errores[campo] = `${campo} debe ser un número entero positivo`;
    return n;
  };
  const fecha = (campo) => {
    if (q[campo] === undefined || q[campo] === '') return null;
    const f = fechaValida(q[campo]);
    if (!f) errores[campo] = `"${campo}" debe ser una fecha AAAA-MM-DD`;
    return f;
  };
  const filtros = {
    estado: q.estado,
    idPedido: entero('id_pedido'),
    idCredito: entero('id_credito'),
    idCliente: entero('id_cliente'),
    desde: fecha('desde'),
    hasta: fecha('hasta'),
  };
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    errores.desde = 'La fecha "desde" no puede ser posterior a "hasta"';
  }
  if (Object.keys(errores).length > 0) throw badRequest(Object.values(errores)[0], errores);
  return filtros;
};

/** Abonos y créditos para el personal (HU-117, HU-171). */
export class AbonosController {
  /** GET /abonos?estado=&id_pedido=&id_credito=&id_cliente=&desde=AAAA-MM-DD&hasta=AAAA-MM-DD */
  static async getAll(req, res, next) {
    try {
      const data = await CreditosService.listarAbonos(filtrosAbonos(req.query));
      return successResponse(res, data, 'Abonos recuperados correctamente');
    } catch (e) { next(e); }
  }

  static async getById(req, res, next) {
    try {
      const data = await CreditosService.obtenerAbono(req.params.id);
      if (!data) return errorResponse(res, 'Abono no encontrado', 404);
      return successResponse(res, data);
    } catch (e) { next(e); }
  }

  /** POST /abonos { id_pedido, valor_abonado, medio_pago, comprobante_url?, fecha_abono? } → Aprobado */
  static async create(req, res, next) {
    try {
      const body = req.body || {};
      const comprobante = validarComprobanteDelSistema(body.comprobante_url);
      const data = await CreditosService.registrarPorPersonal(req.user, { ...body, comprobante_url: comprobante });
      return successResponse(res, data, 'Abono registrado exitosamente', 201);
    } catch (e) { next(e); }
  }

  /** PUT /abonos/:id { valor_abonado?, medio_pago?, fecha_abono?, comprobante_url? }: solo En revisión */
  static async update(req, res, next) {
    try {
      const body = { ...(req.body || {}) };
      if (body.comprobante_url !== undefined) body.comprobante_url = validarComprobanteDelSistema(body.comprobante_url);
      const data = await CreditosService.editar(req.params.id, body);
      return successResponse(res, data, 'Abono actualizado');
    } catch (e) { next(e); }
  }

  static async aprobar(req, res, next) {
    try {
      const data = await CreditosService.aprobar(req.user, req.params.id);
      return successResponse(res, data, 'Abono aprobado: se actualizó el saldo y se notificó al cliente');
    } catch (e) { next(e); }
  }

  static async rechazar(req, res, next) {
    try {
      const data = await CreditosService.rechazar(req.user, req.params.id, req.body?.motivo);
      return successResponse(res, data, 'Abono rechazado y cliente notificado');
    } catch (e) { next(e); }
  }

  static async anular(req, res, next) {
    try {
      const data = await CreditosService.anular(req.user, req.params.id, req.body?.motivo);
      return successResponse(res, data, 'Abono anulado');
    } catch (e) { next(e); }
  }

  /** GET /abonos/creditos?estado=&id_cliente= */
  static async creditos(req, res, next) {
    try {
      const data = await CreditosService.listarCreditos({
        estado: req.query.estado,
        idCliente: req.query.id_cliente ? Number(req.query.id_cliente) : null,
      });
      return successResponse(res, data, 'Créditos recuperados correctamente');
    } catch (e) { next(e); }
  }
}
