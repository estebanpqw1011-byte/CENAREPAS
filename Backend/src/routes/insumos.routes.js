import { Router } from 'express';
import { InsumosController } from '../controllers/insumos.controller.js';
import { protegerModulo, authenticate, authorize } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('insumos', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'insumo', pk: 'id_insumo', entidad: 'Insumo' })
);

// GET→ver, POST→crear, PUT→editar, DELETE→cambiar_estado (sin borrado físico)
router.use(protegerModulo('insumos', 'cambiar_estado'));

router.get('/', InsumosController.getAll);
router.get('/:id', InsumosController.getById);
router.post('/', InsumosController.create);
router.put('/:id', InsumosController.update);
router.delete('/:id', InsumosController.delete);

export default router;
