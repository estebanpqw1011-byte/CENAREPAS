import { api } from './api';

/** Tamaño máximo de cualquier archivo (igual que en el backend). */
export const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024;

/** Formatos permitidos por tipo de archivo (el backend revisa lo mismo). */
export const FORMATOS_ARCHIVO = {
  producto: { mime: ['image/jpeg', 'image/png', 'image/webp'], texto: 'JPG, PNG o WEBP', accept: 'image/jpeg,image/png,image/webp' },
  categoria: { mime: ['image/jpeg', 'image/png', 'image/webp'], texto: 'JPG, PNG o WEBP', accept: 'image/jpeg,image/png,image/webp' },
  compra: { mime: ['application/pdf', 'image/jpeg', 'image/png'], texto: 'PDF, JPG o PNG', accept: 'application/pdf,image/jpeg,image/png' },
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
