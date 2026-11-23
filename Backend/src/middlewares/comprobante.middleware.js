import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { COMPROBANTE_MAX_BYTES, COMPROBANTE_MIME } from '../config/negocio.js';
import { badRequest, forbidden } from '../utils/httpError.js';
import { cloudinaryConfigurado, subirArchivo, urlTemporal } from '../utils/almacenamiento.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Los comprobantes de pago NO van en /uploads (que se sirve sin sesión):
 * se guardan aparte y solo se descargan por GET /api/v1/comprobantes/:archivo
 * con autenticación (ver comprobantes.routes.js).
 */
export const COMPROBANTES_DIR = path.join(__dirname, '../../comprobantes');
if (!fs.existsSync(COMPROBANTES_DIR)) {
  fs.mkdirSync(COMPROBANTES_DIR, { recursive: true });
}

const EXTENSION = { 'image/jpeg': '.jpg', 'image/png': '.png', 'application/pdf': '.pdf' };

// En memoria: se revisa el contenido y se guarda en Cloudinary (privado) o en
// COMPROBANTES_DIR (sin credenciales de Cloudinary), con guardarComprobante().
export const uploadComprobante = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: COMPROBANTE_MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (COMPROBANTE_MIME.includes(file.mimetype)) return cb(null, true);
    return cb(badRequest('El comprobante debe ser JPG, PNG o PDF'), false);
  },
});

/**
 * Guarda el comprobante y devuelve el nombre del archivo
 * (u<id>_<marca>_<24 hex>.<ext>): el nombre lleva el id del usuario que lo
 * sube, así se valida quién puede adjuntarlo. En Cloudinary su public_id es
 * cenarepas/comprobantes/<nombre sin extensión>.
 */
export const guardarComprobante = async (file, idUsuario) => {
  const nombre = `u${idUsuario}_${Date.now()}_${crypto.randomBytes(12).toString('hex')}`;
  await subirArchivo(file, { carpeta: 'comprobantes', nombre });
  return nombre + EXTENSION[file.mimetype];
};

/** El archivo existe en el disco o, con Cloudinary, se da por guardado allí. */
const existeComprobante = (archivo) => fs.existsSync(path.join(COMPROBANTES_DIR, archivo)) || cloudinaryConfigurado();

/** URL temporal firmada (10 minutos) de un comprobante guardado en Cloudinary. */
export const urlTemporalComprobante = (archivo) => {
  const punto = archivo.lastIndexOf('.');
  const formato = archivo.slice(punto + 1);
  return urlTemporal(`cenarepas/comprobantes/${archivo.slice(0, punto)}`, 'image', formato);
};

const RUTA_PUBLICA = '/api/v1/comprobantes/';
const NOMBRE_VALIDO = /^u(\d+)_\d+_[0-9a-f]{24}\.(jpg|png|pdf)$/;

export const urlComprobante = (archivo) => `${RUTA_PUBLICA}${archivo}`;

/**
 * Comprobante que adjunta el personal (POST y PUT /abonos): debe ser
 * exactamente la URL que devuelve POST /comprobantes y el archivo debe
 * existir; una URL externa u otra ruta → 400 en comprobante_url. Aún no se
 * valida quién lo subió. Devuelve la URL o null si no se envió.
 */
export const validarComprobanteDelSistema = (url) => {
  const valor = typeof url === 'string' ? url.trim() : url;
  if (valor === undefined || valor === null || valor === '') return null;
  const error = (mensaje) => badRequest(mensaje, { comprobante_url: mensaje });
  const archivo = typeof valor === 'string' && valor.startsWith(RUTA_PUBLICA) ? valor.slice(RUTA_PUBLICA.length) : '';
  if (!NOMBRE_VALIDO.test(archivo)) throw error('El comprobante no es válido: súbelo con la opción de adjuntar comprobante');
  if (!existeComprobante(archivo)) throw error('El comprobante no existe; súbelo de nuevo');
  return urlComprobante(archivo);
};

/**
 * Valida la URL de comprobante que llega al crear un pedido o un abono:
 * debe ser un archivo subido por este mismo usuario y existir en disco.
 * Devuelve la URL normalizada o null si no se envió.
 */
export const validarComprobanteDelUsuario = (url, idUsuario) => {
  if (url === undefined || url === null || url === '') return null;
  const archivo = String(url).split('/').pop();
  const match = NOMBRE_VALIDO.exec(archivo);
  if (!match) throw badRequest('Comprobante inválido');
  if (Number(match[1]) !== Number(idUsuario)) throw forbidden('El comprobante no pertenece a tu cuenta');
  if (!existeComprobante(archivo)) throw badRequest('El comprobante no existe; súbelo de nuevo');
  return urlComprobante(archivo);
};

export const archivoComprobante = (archivo) => {
  const match = NOMBRE_VALIDO.exec(archivo || '');
  if (!match) return null;
  return { ruta: path.join(COMPROBANTES_DIR, archivo), idUsuario: Number(match[1]) };
};
