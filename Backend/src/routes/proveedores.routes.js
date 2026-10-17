import { Router } from 'express';
import { ProveedoresController } from '../controllers/proveedores.controller.js';
import { protegerModulo, authenticate, authorize } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('proveedores', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'proveedor', pk: 'id_proveedor', entidad: 'Proveedor' })
);

// GET→ver, POST→crear, PUT→editar, DELETE→cambiar_estado (sin borrado físico)
router.use(protegerModulo('proveedores', 'cambiar_estado'));

router.get('/', ProveedoresController.getAll);
router.get('/:id', ProveedoresController.getById);
router.post('/', ProveedoresController.create);
router.put('/:id', ProveedoresController.update);
router.delete('/:id', ProveedoresController.delete);

export default router;
