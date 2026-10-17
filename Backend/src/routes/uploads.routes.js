import { Router } from 'express';
import multer from 'multer';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate, tienePermiso } from '../middlewares/auth.middleware.js';
import { EXTENSIONES, MAX_BYTES, subirArchivo } from '../utils/almacenamiento.js';

const router = Router();

const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Tipos de archivo que se suben: carpeta, formatos y permisos. Las imágenes
 * del catálogo son públicas; las facturas de compras, privadas (ver
 * utils/almacenamiento.js).
 */
const TIPOS = {
  producto: { carpeta: 'productos', formatos: IMAGENES, permisos: [['productos', 'crear'], ['productos', 'editar']] },
  categoria: { carpeta: 'categorias', formatos: IMAGENES, permisos: [['categorias', 'crear'], ['categorias', 'editar']] },
  compra: { carpeta: 'compras', formatos: [...IMAGENES, 'application/pdf'], permisos: [['compras', 'crear'], ['compras', 'editar']] },
};

// En memoria: el archivo se revisa (firma) y luego va a Cloudinary o al disco.
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) =>
    EXTENSIONES[file.mimetype] ? cb(null, true) : cb(new Error('Formato no permitido: usa JPG, PNG, WEBP o PDF'), false),
});

const recibir = (campo) => (req, res, next) =>
  subida.single(campo)(req, res, (err) => {
    if (err) {
      const mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'El archivo supera el máximo de 5 MB' : err.message;
      return errorResponse(res, mensaje || 'No se pudo recibir el archivo', 400);
    }
    if (!req.file) return errorResponse(res, `Adjunta el archivo en el campo "${campo}"`, 400);
    return next();
  });

const responder = async (req, res, next, tipo) => {
  try {
    if (!tipo.formatos.includes(req.file.mimetype)) {
      return errorResponse(res, `Formato no permitido para este archivo (${tipo.formatos.map((m) => EXTENSIONES[m].slice(1).toUpperCase()).join(', ')})`, 400);
    }
    const subido = await subirArchivo(req.file, { carpeta: tipo.carpeta });
    return successResponse(res, {
      ...subido,
      nombre_original: req.file.originalname,
      tipo: req.file.mimetype,
      tamano: req.file.size,
    }, 'Archivo subido', 201);
  } catch (error) {
    return next(error);
  }
};

/** POST /uploads (multipart: archivo + tipo = producto | categoria | compra). */
router.post('/', authenticate, recibir('archivo'), async (req, res, next) => {
  const tipo = TIPOS[String(req.body?.tipo || '').trim()];
  if (!tipo) return errorResponse(res, 'Indica el tipo de archivo: producto, categoria o compra', 400);
  try {
    if (!(await tienePermiso(req.user.id_rol, tipo.permisos))) {
      return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
    }
  } catch (error) {
    return next(error);
  }
  return responder(req, res, next, tipo);
});

/**
 * POST /uploads/imagen (campo "imagen"): imagen de producto o categoría.
 * Se conserva por compatibilidad; ahora usa el mismo almacenamiento.
 */
router.post('/imagen', authenticate, recibir('imagen'), async (req, res, next) => {
  try {
    const permisos = [...TIPOS.producto.permisos, ...TIPOS.categoria.permisos];
    if (!(await tienePermiso(req.user.id_rol, permisos))) {
      return errorResponse(res, 'No tienes permiso para realizar esta acción', 403);
    }
  } catch (error) {
    return next(error);
  }
  const tipo = req.body?.tipo === 'categoria' ? TIPOS.categoria : TIPOS.producto;
  return responder(req, res, next, tipo);
});

export default router;
