import { Router } from 'express';
import { ProduccionController } from '../controllers/produccion.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, authorize('produccion', 'ver'), ProduccionController.getAll);
router.get('/:id', authenticate, authorize('produccion', 'ver'), ProduccionController.getById);
router.post('/', authenticate, authorize('produccion', 'crear'), ProduccionController.create);
router.put('/:id', authenticate, authorize('produccion', 'editar'), ProduccionController.update);
router.patch('/:id/anular', authenticate, authorize('produccion', 'anular'), ProduccionController.anular);
router.delete('/:id', authenticate, authorize('produccion', 'anular'), ProduccionController.delete);

export default router;
