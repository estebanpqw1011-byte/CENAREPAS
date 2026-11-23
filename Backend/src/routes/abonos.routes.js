import { Router } from 'express';
import { AbonosController } from '../controllers/abonos.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('abonos', 'ver'), AbonosController.getAll);
router.get('/creditos', authorize('abonos', 'ver'), AbonosController.creditos);
router.get('/:id', authorize('abonos', 'ver'), AbonosController.getById);
router.post('/', authorize('abonos', 'crear'), AbonosController.create);
// Editar solo mientras está En revisión; aprobado o anulado se anula y se registra otro.
router.put('/:id', authorize('abonos', 'editar'), AbonosController.update);
// Aprobar o rechazar = cambiar_estado (HU-171); anular = anular (nunca se elimina).
router.patch('/:id/aprobar', authorize('abonos', 'cambiar_estado'), AbonosController.aprobar);
router.patch('/:id/rechazar', authorize('abonos', 'cambiar_estado'), AbonosController.rechazar);
router.patch('/:id/anular', authorize('abonos', 'anular'), AbonosController.anular);

export default router;
