import { Router } from 'express';
import { CategoriasController } from '../controllers/categorias.controller.js';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth.middleware.js';

const router = Router();

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
