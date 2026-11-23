import { Router } from 'express';
import { ProductosController } from '../controllers/productos.controller.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('productos', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'producto', pk: 'id_producto', entidad: 'Producto' })
);

// Lectura pública (catálogo sin sesión, HU-154/155): sin permiso de productos:ver
// solo se devuelven los registros activos (ver el controlador).
router.get('/', optionalAuth, ProductosController.getAll);
router.get('/:id', optionalAuth, ProductosController.getById);
router.post('/', authenticate, authorize('productos', 'crear'), ProductosController.create);
router.put('/:id', authenticate, authorize('productos', 'editar'), ProductosController.update);
router.delete('/:id', authenticate, authorize('productos', 'cambiar_estado'), ProductosController.delete);
// Borrado definitivo, solo sin registros asociados; el DELETE de arriba inactiva (lo usa la web).
router.delete('/:id/definitivo', authenticate, authorize('productos', 'eliminar'), ProductosController.eliminarDefinitivo);

export default router;
