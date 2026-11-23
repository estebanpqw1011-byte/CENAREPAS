import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { protegerModulo } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(protegerModulo('dashboard'));

router.get('/', DashboardController.getSummary);
router.get('/metrics', DashboardController.getMetrics);
router.get('/charts', DashboardController.getCharts);

export default router;
