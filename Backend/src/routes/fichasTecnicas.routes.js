import { Router } from 'express';
import { FichasTecnicasController } from '../controllers/fichasTecnicas.controller.js';
import { protegerModulo, authenticate, authorize } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('fichas-tecnicas', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'ficha_tecnica', pk: 'id_ficha', entidad: 'Ficha técnica' })
);

// GET→ver, POST→crear, PUT→editar, DELETE→cambiar_estado (sin borrado físico)
router.use(protegerModulo('fichas-tecnicas', 'cambiar_estado'));

router.get('/', FichasTecnicasController.getAll);
router.get('/:id', FichasTecnicasController.getById);
router.post('/', FichasTecnicasController.create);
router.put('/:id', FichasTecnicasController.update);
router.delete('/:id', FichasTecnicasController.delete);

export default router;
