import React, { useRef, useState } from 'react';
import { FileCheck2, Loader2, Upload, X } from 'lucide-react';
import { subirComprobante } from '../services/checkoutService';
import { validarComprobante } from '../utils/checkout';
import { toast } from '../../../shared/utils/toast.jsx';

/**
 * Adjuntar comprobante (POST /comprobantes): lo sube al elegirlo y entrega
 * { url, nombre } con onChange (null al quitarlo). El archivo queda en el
 * servidor aunque después se cambie.
 */
export default function ComprobanteUploader({ id, valor, onChange, error, onError, onSubiendo }) {
  const archivoRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);

  const cambiarSubiendo = (activo) => {
    setSubiendo(activo);
    onSubiendo?.(activo);
  };

  const elegir = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    const problema = validarComprobante(archivo);
    if (problema) {
      onError(problema);
      return;
    }
    cambiarSubiendo(true);
    onError(undefined);
    try {
      const subido = await subirComprobante(archivo);
      onChange({ url: subido.url, nombre: subido.nombre_original || archivo.name });
      toast.success('Comprobante adjuntado');
    } catch (err) {
      onError(err?.data?.message || err?.message || 'No se pudo subir el comprobante');
    } finally {
      cambiarSubiendo(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={archivoRef}
        id={id}
        type="file"
        accept="image/jpeg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf"
        onChange={elegir}
        className="sr-only"
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {valor ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#5A7A3A]/30 bg-[#5A7A3A]/10 p-3">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <FileCheck2 className="size-4 shrink-0 text-[#5A7A3A] dark:text-[#AEC094]" />
            <span className="truncate">{valor.nombre}</span>
          </span>
          <span className="flex shrink-0 gap-1">
            <button type="button" onClick={() => archivoRef.current?.click()} className="rounded-lg px-2 py-1 text-xs font-bold text-foreground hover:bg-muted cursor-pointer">
              Cambiar
            </button>
            <button type="button" onClick={() => onChange(null)} aria-label="Quitar comprobante" className="rounded-lg p-1 text-muted-foreground hover:bg-muted cursor-pointer">
              <X className="size-4" />
            </button>
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => archivoRef.current?.click()}
          disabled={subiendo}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#C1502D]/50 bg-card px-4 py-3 text-sm font-semibold text-[#C1502D] transition-colors hover:bg-[#C1502D]/5 disabled:opacity-60 dark:text-[#E8B23D] cursor-pointer"
        >
          {subiendo ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {subiendo ? 'Subiendo comprobante…' : 'Adjuntar comprobante (JPG, PNG o PDF, máx. 5 MB)'}
        </button>
      )}
      {error && <p id={`${id}-error`} className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">{error}</p>}
    </div>
  );
}
