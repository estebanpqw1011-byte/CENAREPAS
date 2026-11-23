import { Router } from 'express';
import { MiController } from '../controllers/mi.controller.js';
import { authenticate, requireRol } from '../middlewares/auth.middleware.js';
import { errorResponse } from '../utils/response.js';

const router = Router();

// Solo el rol Cliente; los datos salen siempre del token.
router.use(authenticate, requireRol('Cliente'));

// Sin fila en cliente (id_cliente nulo) no hay datos propios, y los servicios
// toman un id_cliente nulo como "sin filtro": devolverían los de todos los
// clientes. Por eso se corta aquí todo /mi/* salvo GET /mi/perfil y
// POST /mi/perfil, que crea la ficha desde el token.
const requireFichaCliente = (req, res, next) =>
  req.user.id_cliente ? next() : errorResponse(res, 'Completa tu perfil', 403);

router.get('/perfil', MiController.perfil);
router.post('/perfil', MiController.completarPerfil);

router.use(requireFichaCliente);

router.get('/pedidos', MiController.pedidos);
router.post('/pedidos', MiController.crearPedido);
router.get('/pedidos/:id', MiController.pedido);
router.post('/pedidos/:id/anular', MiController.anularPedido);

router.get('/creditos', MiController.creditos);
router.get('/creditos/:id', MiController.credito);
router.post('/creditos/:id/abonos', MiController.registrarAbono);

router.get('/notificaciones', MiController.notificaciones);
router.patch('/notificaciones/leidas', MiController.marcarTodasLeidas);
router.patch('/notificaciones/:id/leida', MiController.marcarLeida);

router.put('/perfil', MiController.actualizarPerfil);
router.put('/contrasena', MiController.cambiarContrasena);

export default router;
