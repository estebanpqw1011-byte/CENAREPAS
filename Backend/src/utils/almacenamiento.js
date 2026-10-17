import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { badRequest } from './httpError.js';

/**
 * Almacenamiento de archivos: Cloudinary si están CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET; si no, el disco del servidor
 * (como antes). Las credenciales solo viven en el .env del backend.
 *
 * Carpetas públicas (imágenes del catálogo): productos y categorías.
 * Carpetas privadas (nunca con URL pública): compras (facturas) y
 * comprobantes (pagos de los clientes). En Cloudinary van con entrega
 * "authenticated" y se abren con una URL temporal firmada.
 */
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CARPETAS_PRIVADAS = new Set(['compras', 'comprobantes']);
export const MAX_BYTES = 5 * 1024 * 1024;

export const EXTENSIONES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

const FIRMAS = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  'application/pdf': (b) => b.subarray(0, 4).toString('latin1') === '%PDF',
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

export const cloudinaryConfigurado = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

let configurado = false;
const cld = () => {
  if (!configurado) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true,
    });
    configurado = true;
  }
  return cloudinary;
};

/** El contenido debe coincidir con el tipo declarado (evita archivos disfrazados). */
export function verificarContenido(buffer, mimetype) {
  const firma = FIRMAS[mimetype];
  if (!firma || !buffer || buffer.length < 12 || !firma(buffer)) {
    throw badRequest('El archivo no es un JPG, PNG, WEBP o PDF válido');
  }
}

const dirLocal = (carpeta) =>
  carpeta === 'comprobantes'
    ? path.join(RAIZ, 'comprobantes') // carpeta histórica de los comprobantes de clientes
    : CARPETAS_PRIVADAS.has(carpeta)
      ? path.join(RAIZ, 'archivos_privados', carpeta)
      : path.join(RAIZ, 'uploads', carpeta);

/**
 * Sube un archivo (buffer de multer). nombre: base fija opcional (sin
 * extensión). Devuelve { url, public_id, recurso, formato, proveedor }:
 * - Cloudinary: url = secure_url; public_id el de Cloudinary.
 * - Disco: url = /uploads/... (públicas) o null (privadas); public_id = "local:<carpeta>/<archivo>".
 */
export async function subirArchivo({ buffer, mimetype }, { carpeta, nombre }) {
  verificarContenido(buffer, mimetype);
  const privado = CARPETAS_PRIVADAS.has(carpeta);
  const base = nombre || `${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;

  if (cloudinaryConfigurado()) {
    const r = await new Promise((resolve, reject) => {
      cld().uploader.upload_stream(
        {
          folder: `cenarepas/${carpeta}`,
          public_id: base,
          resource_type: 'auto',
          type: privado ? 'authenticated' : 'upload',
          overwrite: false,
        },
        (error, resultado) => (error ? reject(error) : resolve(resultado))
      ).end(buffer);
    });
    return { url: r.secure_url, public_id: r.public_id, recurso: r.resource_type, formato: r.format, proveedor: 'cloudinary' };
  }

  const ext = EXTENSIONES[mimetype];
  const dir = dirLocal(carpeta);
  fs.mkdirSync(dir, { recursive: true });
  const archivo = base + ext;
  fs.writeFileSync(path.join(dir, archivo), buffer);
  return {
    url: privado ? null : `/uploads/${carpeta}/${archivo}`,
    public_id: `local:${carpeta}/${archivo}`,
    recurso: mimetype === 'application/pdf' ? 'raw' : 'image',
    formato: ext.slice(1),
    proveedor: 'local',
  };
}

/** Ruta en disco de un public_id local ("local:<carpeta>/<archivo>"), o null si no es válido. */
export function rutaLocal(publicId) {
  const m = /^local:([a-z]+)\/([\w.-]+)$/.exec(publicId || '');
  if (!m || m[2].includes('..')) return null;
  return path.join(dirLocal(m[1]), m[2]);
}

/** public_id de una imagen local antigua guardada solo como URL (/uploads/productos/...). */
export function publicIdDeUrlLocal(url) {
  const m = /^\/uploads\/(productos|categorias)\/([\w.-]+)$/.exec(url || '');
  return m ? `local:${m[1]}/${m[2]}` : null;
}

/**
 * Borra un archivo (al reemplazarlo o eliminar su registro). Nunca hace
 * fallar la operación principal: si no se puede borrar, queda en el log.
 */
export async function borrarArchivo(publicId, recurso = 'image') {
  if (!publicId) return;
  try {
    if (publicId.startsWith('local:')) {
      const ruta = rutaLocal(publicId);
      if (ruta && fs.existsSync(ruta)) fs.unlinkSync(ruta);
      return;
    }
    if (!cloudinaryConfigurado()) {
      console.warn(`[Almacenamiento] No se borró ${publicId}: Cloudinary no está configurado.`);
      return;
    }
    const carpeta = publicId.split('/')[1];
    await cld().uploader.destroy(publicId, {
      resource_type: recurso || 'image',
      type: CARPETAS_PRIVADAS.has(carpeta) ? 'authenticated' : 'upload',
      invalidate: true,
    });
  } catch (error) {
    console.error(`[Almacenamiento] No se pudo borrar ${publicId}: ${error.message}`);
  }
}

/** URL temporal (10 minutos) para abrir o descargar un archivo privado de Cloudinary. */
export function urlTemporal(publicId, recurso = 'image', formato = '') {
  return cld().utils.private_download_url(publicId, formato, {
    resource_type: recurso || 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 600,
  });
}
