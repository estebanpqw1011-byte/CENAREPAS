import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
// Recuperación de contraseña con código de 6 dígitos (f; HU-003, HU-004).
router.post('/recuperar', AuthController.recuperar);
router.post('/verificar-codigo', AuthController.verificarCodigo);
router.post('/restablecer', AuthController.restablecer);
router.get('/profile', authenticate, AuthController.getProfile);

export default router;
