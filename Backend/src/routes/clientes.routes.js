import { Router } from 'express';
import { ClientesController } from '../controllers/clientes.controller.js';
import { authenticate, authorize, protegerModulo } from '../middlewares/auth.middleware.js';
import { cambiarEstadoHandler } from '../utils/estadoRegistro.js';

const router = Router();

// PATCH /:id/estado { estado: 'Activo' | 'Inactivo' } (cambiar_estado). Va antes de
// cualquier router.use para que no se trate como "editar".
router.patch(
  '/:id/estado',
  authenticate,
  authorize('clientes', 'cambiar_estado'),
  cambiarEstadoHandler({ tabla: 'cliente', pk: 'id_cliente', entidad: 'Cliente' })
);

// Borrado definitivo, con su propio permiso: va antes de protegerModulo, que
// exigiría clientes:cambiar_estado a todo DELETE.
router.delete('/:id/definitivo', authenticate, authorize('clientes', 'eliminar'), ClientesController.eliminarDefinitivo);

// GET→ver, POST→crear, PUT→editar, DELETE→cambiar_estado (sin borrado físico)
router.use(protegerModulo('clientes', 'cambiar_estado'));

router.get('/', ClientesController.getAll);
router.get('/:id', ClientesController.getById);
router.post('/', ClientesController.create);
router.put('/:id', ClientesController.update);
router.delete('/:id', ClientesController.delete);

export default router;
