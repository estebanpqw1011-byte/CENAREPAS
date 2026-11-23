import { api, apiRequest } from './api';

/** Tamaño máximo de cualquier archivo (igual que en el backend). */
export const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024;

/** Formatos permitidos por tipo de archivo (el backend revisa lo mismo). */
export const FORMATOS_ARCHIVO = {
  producto: { mime: ['image/jpeg', 'image/png', 'image/webp'], texto: 'JPG, PNG o WEBP', accept: 'image/jpeg,image/png,image/webp' },
  categoria: { mime: ['image/jpeg', 'image/png', 'image/webp'], texto: 'JPG, PNG o WEBP', accept: 'image/jpeg,image/png,image/webp' },
  compra: { mime: ['application/pdf', 'image/jpeg', 'image/png'], texto: 'PDF, JPG o PNG', accept: 'application/pdf,image/jpeg,image/png' },
  imagen: { mime: ['image/jpeg', 'image/png', 'image/webp'], texto: 'JPG, PNG o WEBP', accept: 'image/jpeg,image/png,image/webp' },
};

/** Devuelve el mensaje de error del archivo, o null si es válido para ese tipo. */
export function validarArchivo(file, tipo) {
  const formato = FORMATOS_ARCHIVO[tipo];
  if (!file) return 'Selecciona un archivo.';
  if (!formato.mime.includes(file.type)) return `Formato no permitido: usa ${formato.texto}.`;
  if (file.size > MAX_BYTES_ARCHIVO) return 'El archivo no debe superar los 5 MB.';
  return null;
}

/**
 * Sube un archivo al backend (POST /uploads), que lo guarda en Cloudinary o
 * en su disco. Devuelve { url, public_id, recurso, formato, ... }.
 */
export async function subirArchivo(file, tipo) {
  const error = validarArchivo(file, tipo);
  if (error) throw new Error(error);
  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('archivo', file);
  return api.post('/uploads', formData);
}

/** Mensaje de error de una imagen (JPG, PNG o WEBP de máximo 5 MB), o null si es válida. */
export const validarImagen = (file) => validarArchivo(file, 'imagen');

/**
 * Sube una imagen a la carpeta de un módulo (POST /uploads/imagen), en
 * Cloudinary (cenarepas/<carpeta>). Carpetas habilitadas: productos y
 * categorias. Devuelve { url, public_id, ... }.
 */
export async function subirImagen(file, carpeta) {
  const error = validarImagen(file);
  if (error) throw new Error(error);
  const formData = new FormData();
  formData.append('carpeta', carpeta);
  formData.append('imagen', file);
  return api.post('/uploads/imagen', formData);
}

/**
 * Elimina una imagen por su public_id (DELETE /uploads/imagen). El backend
 * responde 409 si un registro la tiene guardada: esa se reemplaza o se quita
 * desde el registro.
 */
export const eliminarImagen = (publicId) =>
  apiRequest('/uploads/imagen', { method: 'DELETE', body: { public_id: publicId } });
