import { Router } from 'express';
import { PedidosController } from '../controllers/pedidos.controller.js';
import { authenticate, authorize, tienePermiso } from '../middlewares/auth.middleware.js';
import { normalizarEstadoPedido } from '../utils/normalizar.js';
import { query } from '../config/db.js';
import { errorResponse } from '../utils/response.js';

const router = Router();

/**
 * Cambiar el estado exige pedidos:cambiar_estado, y anular además pedidos:anular.
 * En PUT solo aplica si el estado enviado es distinto del actual (la web
 * reenvía el pedido completo en cada edición).
 */
const permisoDeEstado = async (req, res, next) => {
  try {
    const nuevo = normalizarEstadoPedido(req.body?.estado);
    if (!nuevo) return next();
    if (req.method === 'PUT') {
      const actual = await query('SELECT estado FROM pedido WHERE id_pedido = $1', [req.params.id]);
      if (!actual.rows[0] || actual.rows[0].estado === nuevo) return next();
    }
    const requeridos = [['pedidos', 'cambiar_estado']];
    if (nuevo === 'Anulado') requeridos.push(['pedidos', 'anular']);
    for (const permiso of requeridos) {
      if (!(await tienePermiso(req.user.id_rol, [permiso]))) {
        return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
      }
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

router.use(authenticate);

router.get('/', authorize('pedidos', 'ver'), PedidosController.getAll);
router.get('/:id/historial', authorize('pedidos', 'ver'), PedidosController.historial);
router.get('/:id', authorize('pedidos', 'ver'), PedidosController.getById);
router.post('/', authorize('pedidos', 'crear'), PedidosController.create);
router.put('/:id', authorize('pedidos', 'editar'), permisoDeEstado, PedidosController.update);
router.patch('/:id/estado', authorize('pedidos', 'cambiar_estado'), permisoDeEstado, PedidosController.cambiarEstado);
router.delete('/:id', authorize('pedidos', 'anular'), PedidosController.delete);
// Borrado definitivo: solo Pendiente y sin abonos; el DELETE de arriba anula (lo usa la web).
router.delete('/:id/definitivo', authorize('pedidos', 'eliminar'), PedidosController.eliminarDefinitivo);

export default router;
