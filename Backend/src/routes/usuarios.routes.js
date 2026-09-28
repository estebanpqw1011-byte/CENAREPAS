import { Router } from 'express';
import { UsuariosController } from '../controllers/usuarios.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

// El listado también lo usan Pedidos y Ventas de la web para mostrar nombres:
// quien no tiene usuarios:ver recibe solo id, nombre y rol (ver el controlador).
router.get('/', authorize(['usuarios', 'ver'], ['pedidos', 'ver'], ['ventas', 'ver']), UsuariosController.getAll);
router.get('/:id', authorize('usuarios', 'ver'), UsuariosController.getById);
router.post('/', authorize('usuarios', 'crear'), UsuariosController.create);
router.put('/:id', authorize('usuarios', 'editar'), UsuariosController.update);
router.delete('/:id', authorize('usuarios', 'cambiar_estado'), UsuariosController.delete);
// Borrado definitivo, solo sin registros asociados; el DELETE de arriba inactiva (lo usa la web).
router.delete('/:id/definitivo', authorize('usuarios', 'eliminar'), UsuariosController.eliminarDefinitivo);

export default router;
