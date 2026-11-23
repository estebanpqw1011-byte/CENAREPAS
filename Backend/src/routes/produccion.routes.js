import { Router } from 'express';
import { ProduccionController } from '../controllers/produccion.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', ProduccionController.getAll);
router.get('/:id', ProduccionController.getById);
router.post('/', authenticate, ProduccionController.create);
router.put('/:id', authenticate, ProduccionController.update);
router.patch('/:id/anular', authenticate, ProduccionController.anular);
router.delete('/:id', authenticate, ProduccionController.delete);

export default router;
