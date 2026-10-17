import { Router } from 'express';
import { ComprasController } from '../controllers/compras.controller.js';
import { protegerModulo } from '../middlewares/auth.middleware.js';

const router = Router();

// GET→ver, POST→crear, PUT→editar, DELETE→anular (sin borrado físico)
router.use(protegerModulo('compras', 'anular'));

router.get('/', ComprasController.getAll);
router.get('/:id', ComprasController.getById);
// Soporte (factura) de la compra: enlace temporal o, si está en disco, el archivo (compras:ver).
router.get('/:id/comprobante', ComprasController.enlaceComprobante);
router.get('/:id/comprobante/archivo', ComprasController.archivoComprobante);
router.post('/', ComprasController.create);
router.put('/:id', ComprasController.update);
router.delete('/:id', ComprasController.delete);

export default router;
