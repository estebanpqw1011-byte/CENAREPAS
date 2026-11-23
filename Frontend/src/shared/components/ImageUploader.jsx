import { useEffect, useId, useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, Trash2, AlertCircle } from 'lucide-react';
import { getImageUrl } from '../services/api';
import { FORMATOS_ARCHIVO, eliminarImagen, subirImagen, validarImagen } from '../services/uploadService';

/**
 * Subida de una imagen a Cloudinary para cualquier formulario.
 *
 *   <ImageUploader
 *     carpeta="productos"                 // carpeta del módulo (habilitadas en el backend)
 *     value={imagenUrl}                   // URL actual (o null)
 *     onChange={(imagen) => ...}          // { url, public_id } al subir; null al quitar
 *   />
 *
 * Sube al elegir el archivo (valida tipo y 5 MB antes). Si se cambia o se
 * quita una imagen subida en esta misma edición, la borra del servidor; la
 * imagen original del registro nunca se borra desde aquí: la reemplaza el
 * backend del módulo al guardar (reemplazarArchivo).
 */
export function ImageUploader({ carpeta, value, onChange, label = 'Imagen', disabled = false, className = '' }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [vistaPrevia, setVistaPrevia] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  // public_id subido en esta edición y aún no guardado en el registro.
  const temporalRef = useRef(null);

  useEffect(() => () => {
    if (vistaPrevia) URL.revokeObjectURL(vistaPrevia);
  }, [vistaPrevia]);

  const descartarTemporal = () => {
    const temporal = temporalRef.current;
    temporalRef.current = null;
    // Si ya se guardó en un registro, el backend responde 409 y se conserva.
    if (temporal) eliminarImagen(temporal).catch(() => {});
  };

  const elegir = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const invalido = validarImagen(file);
    if (invalido) {
      setError(invalido);
      return;
    }
    setError('');
    setVistaPrevia(URL.createObjectURL(file));
    setSubiendo(true);
    try {
      const subida = await subirImagen(file, carpeta);
      descartarTemporal();
      temporalRef.current = subida.public_id;
      onChange?.({ url: subida.url, public_id: subida.public_id });
    } catch (err) {
      setError(err?.message || 'No se pudo subir la imagen. Inténtalo de nuevo.');
    } finally {
      setVistaPrevia('');
      setSubiendo(false);
    }
  };

  const quitar = () => {
    descartarTemporal();
    setError('');
    onChange?.(null);
  };

  const imagen = vistaPrevia || (value ? getImageUrl(value) : '');
  const bloqueado = disabled || subiendo;
  const botonSecundario =
    'inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-card disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]';

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={inputId} className="block text-xs font-semibold text-foreground sm:text-sm">
        {label}
      </label>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={FORMATOS_ARCHIVO.imagen.accept}
        onChange={elegir}
        disabled={bloqueado}
        className="sr-only"
      />

      {imagen ? (
        <div className="relative h-44 w-full overflow-hidden rounded-xl border border-border bg-muted/40">
          <img src={imagen} alt={`Vista previa: ${label}`} className="h-full w-full object-contain" />
          {subiendo && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/70 text-sm font-semibold text-foreground backdrop-blur-[2px]">
              <Loader2 className="size-4 animate-spin text-[#C1502D] dark:text-[#E8B23D]" aria-hidden />
              Subiendo…
            </div>
          )}
          {!subiendo && !disabled && (
            <div className="absolute bottom-2 right-2 flex gap-2">
              <button type="button" onClick={() => inputRef.current?.click()} className={botonSecundario}>
                <RefreshCw className="size-3.5" aria-hidden />
                Cambiar
              </button>
              <button type="button" onClick={quitar} className={`${botonSecundario} text-[#C1502D] dark:text-[#E8B23D]`}>
                <Trash2 className="size-3.5" aria-hidden />
                Quitar
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={bloqueado}
          className="flex h-32 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted/20 px-3 text-center transition-colors hover:border-[#C1502D]/60 hover:bg-[#C1502D]/5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
        >
          <ImagePlus className="size-5 text-[#C1502D] dark:text-[#E8B23D]" aria-hidden />
          <span className="text-xs font-semibold text-foreground">Subir imagen</span>
          <span className="text-xs text-muted-foreground">{FORMATOS_ARCHIVO.imagen.texto} · máximo 5 MB</span>
        </button>
      )}

      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-destructive">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

export default ImageUploader;
