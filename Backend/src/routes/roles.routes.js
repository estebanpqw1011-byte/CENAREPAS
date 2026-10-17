import { Router } from 'express';
import { RolesController } from '../controllers/roles.controller.js';
import { protegerModulo, authenticate, authorize } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler, reglasEstado } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('roles', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'rol', pk: 'id_rol', entidad: 'Rol', regla: reglasEstado.rol })
);

// GET→ver, POST→crear, PUT→editar, DELETE→eliminar (sin borrado físico)
router.use(protegerModulo('roles', 'eliminar'));

router.get('/', RolesController.getAll);
router.get('/:id', RolesController.getById);
router.post('/', RolesController.create);
router.put('/:id', RolesController.update);
router.delete('/:id', RolesController.delete);

export default router;
