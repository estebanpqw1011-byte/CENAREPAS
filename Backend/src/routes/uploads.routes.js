import { Router } from 'express';
import multer from 'multer';
import { query } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { authenticate, tienePermiso } from '../middlewares/auth.middleware.js';
import { CARPETAS_PRIVADAS, EXTENSIONES, MAX_BYTES, carpetaDe, eliminarImagen, subirArchivo } from '../utils/almacenamiento.js';

const router = Router();

const IMAGENES = ['image/jpeg', 'image/png', 'image/webp'];
const NOMBRES_FORMATO = (formatos) => formatos.map((m) => EXTENSIONES[m].slice(1).toUpperCase()).join(', ');

/**
 * Carpetas de imágenes por módulo (cenarepas/<carpeta> en Cloudinary): quién
 * puede subir o eliminar y qué tabla guarda la imagen (para no borrar una en
 * uso). Para habilitar un módulo nuevo, cuando exista su campo de imagen, se
 * agrega aquí una línea.
 */
const CARPETAS_IMAGEN = {
  productos: { permisos: [['productos', 'crear'], ['productos', 'editar']], tabla: 'producto' },
  categorias: { permisos: [['categorias', 'crear'], ['categorias', 'editar']], tabla: 'categoria_producto' },
};

/**
 * Tipos de POST /uploads (incluye las facturas privadas de compras, que
 * también admiten PDF). Ver utils/almacenamiento.js.
 */
const TIPOS = {
  producto: { carpeta: 'productos', formatos: IMAGENES, permisos: CARPETAS_IMAGEN.productos.permisos },
  categoria: { carpeta: 'categorias', formatos: IMAGENES, permisos: CARPETAS_IMAGEN.categorias.permisos },
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

const responder = async (req, res, next, { carpeta, formatos }) => {
  try {
    if (!formatos.includes(req.file.mimetype)) {
      return errorResponse(res, `Formato no permitido para este archivo (${NOMBRES_FORMATO(formatos)})`, 400);
    }
    const subido = await subirArchivo(req.file, { carpeta });
    return successResponse(res, {
      ...subido,
      carpeta,
      nombre_original: req.file.originalname,
      tipo: req.file.mimetype,
      tamano: req.file.size,
    }, 'Archivo subido', 201);
  } catch (error) {
    return next(error);
  }
};

/** 403 si el rol no tiene ninguno de los permisos; null si puede seguir. */
const sinPermiso = async (req, res, permisos) =>
  (await tienePermiso(req.user.id_rol, permisos)) ? null : errorResponse(res, 'No tienes permiso para realizar esta acción', 403);

/** POST /uploads (multipart: archivo + tipo = producto | categoria | compra). */
router.post('/', authenticate, recibir('archivo'), async (req, res, next) => {
  const tipo = TIPOS[String(req.body?.tipo || '').trim()];
  if (!tipo) return errorResponse(res, 'Indica el tipo de archivo: producto, categoria o compra', 400);
  try {
    if (await sinPermiso(req, res, tipo.permisos)) return undefined;
  } catch (error) {
    return next(error);
  }
  return responder(req, res, next, tipo);
});

/**
 * POST /uploads/imagen (multipart: imagen + carpeta = productos | categorias).
 * Solo JPG, PNG o WEBP de máximo 5 MB. Responde { url, public_id, ... }.
 * Compatibilidad: sin carpeta, acepta tipo = producto | categoria (por
 * defecto, productos), como antes.
 */
router.post('/imagen', authenticate, recibir('imagen'), async (req, res, next) => {
  const pedida = String(req.body?.carpeta || '').trim()
    || (String(req.body?.tipo || '').trim() === 'categoria' ? 'categorias' : 'productos');
  const carpeta = CARPETAS_IMAGEN[pedida];
  if (!carpeta) {
    return errorResponse(res, `Carpeta no válida: usa ${Object.keys(CARPETAS_IMAGEN).join(' o ')}`, 400);
  }
  try {
    if (await sinPermiso(req, res, carpeta.permisos)) return undefined;
  } catch (error) {
    return next(error);
  }
  return responder(req, res, next, { carpeta: pedida, formatos: IMAGENES });
});

/**
 * DELETE /uploads/imagen { public_id }: elimina una imagen de una carpeta de
 * módulo. 409 si un registro la tiene guardada (se reemplaza o se quita desde
 * ese registro), 404 si no existe.
 */
router.delete('/imagen', authenticate, async (req, res, next) => {
  const publicId = String(req.body?.public_id ?? req.query?.public_id ?? '').trim();
  const nombreCarpeta = carpetaDe(publicId);
  const carpeta = CARPETAS_IMAGEN[nombreCarpeta];
  if (!publicId || !carpeta || CARPETAS_PRIVADAS.has(nombreCarpeta)) {
    return errorResponse(res, 'Indica un public_id válido de una imagen (productos o categorias)', 400);
  }
  try {
    if (await sinPermiso(req, res, carpeta.permisos)) return undefined;

    const urlLocal = publicId.startsWith('local:') ? `/uploads/${publicId.slice('local:'.length)}` : null;
    const enUso = await query(
      `SELECT 1 FROM ${carpeta.tabla} WHERE imagen_public_id = $1 OR ($2::text IS NOT NULL AND imagen_url = $2) LIMIT 1`,
      [publicId, urlLocal]
    );
    if (enUso.rows.length > 0) {
      return errorResponse(res, 'La imagen está en uso: reemplázala o quítala desde el registro que la tiene', 409);
    }

    if (!(await eliminarImagen(publicId))) return errorResponse(res, 'La imagen no existe', 404);
    return successResponse(res, { public_id: publicId }, 'Imagen eliminada');
  } catch (error) {
    return next(error);
  }
});

export default router;
