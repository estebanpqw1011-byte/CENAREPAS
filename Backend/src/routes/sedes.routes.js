import { Router } from 'express';
import { SedesController } from '../controllers/sedes.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('sedes', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'sede', pk: 'id_sede', entidad: 'Sede' })
);

router.use(authenticate);

// Pedidos y ventas necesitan la lista de sedes para asignar la entrega.
const verSedes = authorize(['sedes', 'ver'], ['pedidos', 'ver'], ['ventas', 'ver']);
router.get('/', verSedes, SedesController.getAll);
router.get('/:id', verSedes, SedesController.getById);
router.post('/', authorize('sedes', 'crear'), SedesController.create);
router.put('/:id', authorize('sedes', 'editar'), SedesController.update);
router.delete('/:id', authorize('sedes', 'cambiar_estado'), SedesController.delete);

export default router;
