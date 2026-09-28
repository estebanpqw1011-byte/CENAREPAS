import { Router } from 'express';
import { ClientesController } from '../controllers/clientes.controller.js';
import { authenticate, authorize, protegerModulo } from '../middlewares/auth.middleware.js';

const router = Router();

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
