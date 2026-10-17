import { Router } from 'express';
import { CategoriasController } from '../controllers/categorias.controller.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('categorias', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'categoria_producto', pk: 'id_categoria', entidad: 'Categoría' })
);

// Lectura pública (catálogo sin sesión, HU-154/155): sin permiso de categorias:ver
// solo se devuelven los registros activos (ver el controlador).
router.get('/', optionalAuth, CategoriasController.getAll);
router.get('/:id', optionalAuth, CategoriasController.getById);
router.post('/', authenticate, authorize('categorias', 'crear'), CategoriasController.create);
router.put('/:id', authenticate, authorize('categorias', 'editar'), CategoriasController.update);
router.delete('/:id', authenticate, authorize('categorias', 'cambiar_estado'), CategoriasController.delete);
// Borrado definitivo, solo sin registros asociados; el DELETE de arriba inactiva (lo usa la web).
router.delete('/:id/definitivo', authenticate, authorize('categorias', 'eliminar'), CategoriasController.eliminarDefinitivo);

export default router;
