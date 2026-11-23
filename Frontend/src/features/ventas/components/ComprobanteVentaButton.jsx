import { ExternalLink, Loader2 } from 'lucide-react';
import { useComprobanteVenta } from '../hooks/useComprobanteVenta';

export default function ComprobanteVentaButton({ idVenta }) {
  const { abrir, cargando, error } = useComprobanteVenta(idVenta);

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className="text-primary hover:underline font-medium text-xs inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        {cargando ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
        {cargando ? 'Abriendo comprobante…' : 'Ver comprobante adjunto'}
      </button>
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
