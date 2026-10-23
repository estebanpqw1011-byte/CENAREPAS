import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import { badGateway, badRequest, serviceUnavailable } from './httpError.js';

/**
 * Almacenamiento de archivos: Cloudinary si están CLOUDINARY_CLOUD_NAME,
 * CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET. Sin ellas, el disco del
 * servidor SOLO en local; en la nube (Render) o en producción las subidas
 * responden 503 (ver discoPermitido). Las credenciales solo viven en el .env
 * del backend.
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

const VARIABLES_CLOUDINARY = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];

/** Variables de Cloudinary que faltan (vacías o sin definir). */
export const variablesCloudinaryFaltantes = () => VARIABLES_CLOUDINARY.filter((v) => !String(process.env[v] || '').trim());

export const cloudinaryConfigurado = () => variablesCloudinaryFaltantes().length === 0;

/**
 * El disco del servidor como respaldo solo se permite en local. Se decide por
 * dónde corre el servidor, no por NODE_ENV=staging ni por la base: el Staging
 * de este equipo también corre en el PC (npm run dev:staging) y sus pruebas
 * suben al disco. Render define RENDER=true en todos sus servicios.
 * ALMACENAMIENTO_DISCO=si|no lo fuerza (p. ej. para probar el 503 en local).
 */
export function discoPermitido() {
  const forzado = String(process.env.ALMACENAMIENTO_DISCO || '').trim().toLowerCase();
  if (forzado === 'si' || forzado === 'no') return forzado === 'si';
  const enLaNube = process.env.RENDER === 'true' || String(process.env.NODE_ENV || '').trim() === 'production';
  return !enLaNube;
}

/** Mensaje de arranque sobre dónde se guardarán los archivos (lo usa server.js). */
export function estadoAlmacenamiento() {
  if (cloudinaryConfigurado()) {
    return { nivel: 'ok', mensaje: `☁️  Archivos en Cloudinary (cuenta "${process.env.CLOUDINARY_CLOUD_NAME.trim()}").` };
  }
  const faltan = variablesCloudinaryFaltantes().join(', ');
  if (discoPermitido()) {
    return { nivel: 'aviso', mensaje: `⚠️  Cloudinary no está configurado (faltan ${faltan}): los archivos se guardan en el disco de este servidor (solo para desarrollo local).` };
  }
  return { nivel: 'error', mensaje: `❌ Cloudinary no está configurado: faltan ${faltan}. Las subidas de archivos responderán error hasta que se configuren (en Render: Environment del servicio del backend).` };
}

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

/**
 * Error de Cloudinary → 502 con un mensaje que dice qué revisar (el detalle
 * técnico queda en el log). accion: "subir" o "eliminar".
 */
function errorDeCloudinary(error, accion) {
  console.error(`[Almacenamiento] Cloudinary falló al ${accion}: ${error?.message || error}`);
  const codigo = error?.http_code;
  const motivo =
    codigo === 401 || codigo === 403
      ? 'las credenciales no son válidas (revisa CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET)'
      : codigo === 404 && /cloud/i.test(error?.message || '')
        ? 'la cuenta no existe (revisa CLOUDINARY_CLOUD_NAME)'
        : 'el servicio no respondió; inténtalo de nuevo en unos minutos';
  return badGateway(`No se pudo ${accion} la imagen en Cloudinary: ${motivo}.`);
}

/** Carpeta de un public_id ("local:productos/…" o "cenarepas/productos/…"), o null. */
export function carpetaDe(publicId) {
  const m = /^(?:local:|cenarepas\/)([a-z]+)\/[\w.-]+$/.exec(publicId || '');
  return m ? m[1] : null;
}

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
  if (!cloudinaryConfigurado() && !discoPermitido()) {
    throw serviceUnavailable(
      `No se pueden subir archivos: Cloudinary no está configurado en este servidor (faltan ${variablesCloudinaryFaltantes().join(', ')}).`
    );
  }
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
    }).catch((error) => {
      throw errorDeCloudinary(error, 'subir');
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

/**
 * Elimina una imagen pública por su public_id (DELETE /uploads/imagen).
 * A diferencia de borrarArchivo, informa el resultado: true si se borró,
 * false si no existía. Un fallo de Cloudinary responde 502.
 */
export async function eliminarImagen(publicId) {
  if (publicId.startsWith('local:')) {
    const ruta = rutaLocal(publicId);
    if (!ruta || !fs.existsSync(ruta)) return false;
    fs.unlinkSync(ruta);
    return true;
  }
  if (!cloudinaryConfigurado()) return false;
  try {
    const r = await cld().uploader.destroy(publicId, { resource_type: 'image', type: 'upload', invalidate: true });
    return r?.result === 'ok';
  } catch (error) {
    throw errorDeCloudinary(error, 'eliminar');
  }
}

/**
 * Para los módulos: al guardar un registro con imagen nueva, borra la
 * anterior si cambió (después de que el UPDATE se guardó). Nunca falla:
 * si no se puede borrar, queda en el log.
 *   await reemplazarArchivo(anterior.imagen_public_id, nuevo.imagen_public_id);
 */
export async function reemplazarArchivo(publicIdAnterior, publicIdNuevo, recurso = 'image') {
  if (publicIdAnterior && publicIdAnterior !== publicIdNuevo) await borrarArchivo(publicIdAnterior, recurso);
}

/** URL temporal (10 minutos) para abrir o descargar un archivo privado de Cloudinary. */
export function urlTemporal(publicId, recurso = 'image', formato = '') {
  return cld().utils.private_download_url(publicId, formato, {
    resource_type: recurso || 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 600,
  });
}
