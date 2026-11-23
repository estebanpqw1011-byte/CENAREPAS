import { Router } from 'express';
import { AuditoriaController } from '../controllers/auditoria.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authenticate, authorize('configuracion', 'ver'), AuditoriaController.getAll);

export default router;
