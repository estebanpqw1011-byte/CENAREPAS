import { Router } from 'express';
import { VentasController } from '../controllers/ventas.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

// Vista de solo lectura: una venta es un pedido Entregado.
router.use(authenticate);

router.get('/', authorize('ventas', 'ver'), VentasController.getAll);
router.get('/:id', authorize('ventas', 'ver'), VentasController.getById);
// Comprobante de pago (privado): mismo permiso que ver la venta.
router.get('/:id/comprobante', authorize('ventas', 'ver'), VentasController.enlaceComprobante);
router.get('/:id/comprobante/archivo', authorize('ventas', 'ver'), VentasController.archivoComprobante);
// Anular: el rol (ROLES_ANULAR_VENTA) y el plazo se validan en el servicio.
router.post('/:id/anular', authorize('ventas', 'anular'), VentasController.anular);
router.post('/', VentasController.soloLectura);
router.put('/:id', VentasController.soloLectura);
router.delete('/:id', VentasController.soloLectura);

export default router;
