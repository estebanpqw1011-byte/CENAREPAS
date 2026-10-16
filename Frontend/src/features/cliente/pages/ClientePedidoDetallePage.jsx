import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, Loader2, MapPin, Store, CreditCard, CalendarDays } from 'lucide-react';
import { anularMiPedido, getMiPedido } from '../services/pedidosService';
import { fechaCorta, fechaHora, motivoNoAnulable, resumenPagos } from '../utils/pedidos';
import { formatCOP } from '../utils/catalogo';
import EstadoPedidoBadge from '../components/EstadoPedidoBadge';
import ProductoImagen from '../components/ProductoImagen';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { Skeleton } from '../../../shared/components/Skeleton';
import { toast } from '../../../shared/utils/toast.jsx';

const MOTIVO_MIN = 5;

function Tarjeta({ titulo, children }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="text-base font-bold text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

function Fila({ etiqueta, children, fuerte }) {
  return (
    <div className={`flex justify-between gap-3 ${fuerte ? 'border-t border-border pt-2 text-base' : 'text-sm'}`}>
      <dt className={fuerte ? 'font-bold text-foreground' : 'text-muted-foreground'}>{etiqueta}</dt>
      <dd className={`text-right tabular-nums ${fuerte ? 'font-extrabold text-[#C1502D] dark:text-[#E8B23D]' : 'font-semibold text-foreground'}`}>{children}</dd>
    </div>
  );
}

function DialogoAnular({ pedido, onCerrar, onAnulado }) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const corto = motivo.trim().length < MOTIVO_MIN;

  const anular = async () => {
    if (corto) {
      setError(`Cuéntanos el motivo (mínimo ${MOTIVO_MIN} caracteres).`);
      return;
    }
    setEnviando(true);
    setError('');
    try {
      const actualizado = await anularMiPedido(pedido.id_pedido, motivo.trim());
      toast.success(`Pedido #${pedido.id_pedido} anulado`);
      onAnulado(actualizado);
    } catch (err) {
      setError(err?.data?.message || err?.message || 'No se pudo anular el pedido');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-anular">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 id="titulo-anular" className="text-base font-bold text-foreground">¿Anular el pedido #{pedido.id_pedido}?</h2>
        <p className="text-sm text-muted-foreground">Esta acción no se puede deshacer. Cuéntanos por qué lo anulas.</p>
        <div className="space-y-1.5">
          <label htmlFor="motivo-anulacion" className="block text-sm font-semibold text-foreground">Motivo</label>
          <textarea
            id="motivo-anulacion"
            rows={3}
            maxLength={255}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError('');
            }}
            autoFocus
            className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-[#C1502D] focus:outline-none focus:ring-2 focus:ring-[#C1502D]/15"
            placeholder="Ej.: ya no voy a estar en casa ese día"
          />
          {error && <p role="alert" className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5">
          <button type="button" onClick={onCerrar} disabled={enviando} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted cursor-pointer">
            Volver
          </button>
          <button
            type="button"
            onClick={anular}
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            {enviando && <Loader2 className="size-4 animate-spin" />}
            Anular pedido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientePedidoDetallePage() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [anulando, setAnulando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setPedido(await getMiPedido(id));
    } catch (err) {
      setError(err?.status === 404 ? 'No encontramos este pedido en tu cuenta.' : err?.message || 'No se pudo cargar el pedido.');
    } finally {
      setCargando(false);
    }
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const volver = (
    <NavLink to="/cliente/pedidos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      Mis pedidos
    </NavLink>
  );

  if (cargando) {
    return (
      <div className="space-y-4" aria-hidden="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="space-y-4">
        {volver}
        <ErrorBanner message={error || 'No se pudo cargar el pedido.'} onRetry={cargar} />
      </div>
    );
  }

  const { total, aprobado, enRevision, saldo } = resumenPagos(pedido);
  const noAnulable = motivoNoAnulable(pedido);
  const historial = pedido.historial || [];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {volver}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Pedido #{pedido.id_pedido}</h1>
          <EstadoPedidoBadge estado={pedido.estado} />
        </div>
        <p className="text-sm text-muted-foreground">Hecho el {fechaHora(pedido.fecha_pedido)}</p>
      </header>

      {pedido.estado === 'Anulado' && pedido.motivo_anulacion && (
        <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <span className="font-semibold text-foreground">Motivo de la anulación: </span>
          <span className="text-muted-foreground">{pedido.motivo_anulacion}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-5">
          <Tarjeta titulo="Productos">
            <ul className="divide-y divide-border">
              {(pedido.detalles || []).map((d) => (
                <li key={d.id_detalle_pedido} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <ProductoImagen producto={{ nombre: d.producto_nombre, imagen_url: d.imagen_url }} className="size-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{d.producto_nombre}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {Number(d.cantidad)} × {formatCOP(d.precio_unitario)}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-foreground">{formatCOP(d.subtotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-border pt-3">
              <Fila etiqueta="Total" fuerte>{formatCOP(total)}</Fila>
            </dl>
          </Tarjeta>

          <Tarjeta titulo="Historial del pedido">
            {historial.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cambios de estado registrados.</p>
            ) : (
              <ol className="relative space-y-4 border-l-2 border-border pl-5">
                {historial.map((h, i) => (
                  <li key={`${h.estado_nuevo}-${i}`} className="relative">
                    <span className="absolute -left-[1.6rem] top-1 size-3 rounded-full border-2 border-card bg-[#C1502D]" aria-hidden="true" />
                    <div className="flex flex-wrap items-center gap-2">
                      <EstadoPedidoBadge estado={h.estado_nuevo} />
                      <span className="text-xs text-muted-foreground">{fechaHora(h.fecha_cambio)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {h.estado_anterior ? `Desde ${h.estado_anterior} · ` : 'Pedido creado · '}
                      {h.propio ? 'Por ti' : `Por CENAREPAS${h.rol_nombre ? ` (${h.rol_nombre})` : ''}`}
                      {h.reconstruido ? ' · registro reconstruido' : ''}
                    </p>
                    {h.motivo && <p className="mt-1 text-sm text-foreground">{h.motivo}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Tarjeta>
        </div>

        <div className="space-y-5 lg:sticky lg:top-20">
          <Tarjeta titulo="Entrega">
            <ul className="space-y-2.5 text-sm">
              <li className="flex gap-2.5">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">{fechaCorta(pedido.fecha_entrega)}</span>
              </li>
              {pedido.direccion_entrega && (
                <li className="flex gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="text-foreground">
                    {pedido.direccion_entrega}
                    {pedido.complemento_entrega ? `, ${pedido.complemento_entrega}` : ''}
                    {pedido.barrio_entrega ? ` · ${pedido.barrio_entrega}` : ''}
                    {pedido.municipio_entrega ? `, ${pedido.municipio_entrega}` : ''}
                    {pedido.indicaciones_entrega && <span className="block text-xs text-muted-foreground">{pedido.indicaciones_entrega}</span>}
                  </span>
                </li>
              )}
              <li className="flex gap-2.5">
                <Store className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">Sede {pedido.sede_nombre}</span>
              </li>
              <li className="flex gap-2.5">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="text-foreground">
                  {pedido.medio_pago || 'Sin método de pago'}
                  {pedido.comprobante_url && <span className="block text-xs text-muted-foreground">Comprobante adjunto</span>}
                </span>
              </li>
            </ul>
          </Tarjeta>

          <Tarjeta titulo="Pagos">
            {(pedido.abonos || []).length > 0 && (
              <ul className="space-y-2">
                {pedido.abonos.map((a) => (
                  <li key={a.id_abono} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                    <span>
                      <span className="block font-semibold tabular-nums text-foreground">{formatCOP(a.valor_abonado)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {a.medio_pago} · {fechaCorta(a.fecha_abono || a.fecha_registro)}
                      </span>
                      {a.motivo_rechazo && <span className="block text-xs text-destructive">{a.motivo_rechazo}</span>}
                    </span>
                    <EstadoPedidoBadge estado={a.estado} />
                  </li>
                ))}
              </ul>
            )}
            <dl className="space-y-2">
              <Fila etiqueta="Total del pedido">{formatCOP(total)}</Fila>
              <Fila etiqueta="Abonos aprobados">{formatCOP(aprobado)}</Fila>
              {enRevision > 0 && <Fila etiqueta="Abonos en revisión">{formatCOP(enRevision)}</Fila>}
              {pedido.estado !== 'Anulado' && <Fila etiqueta="Saldo pendiente" fuerte>{formatCOP(saldo)}</Fila>}
            </dl>
            {enRevision > 0 && pedido.estado !== 'Anulado' && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                Los abonos en revisión se descuentan del saldo cuando CENAREPAS los aprueba.
              </p>
            )}
          </Tarjeta>

          {pedido.estado !== 'Anulado' && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setAnulando(true)}
                disabled={Boolean(noAnulable)}
                aria-describedby={noAnulable ? 'motivo-no-anulable' : undefined}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/40 px-4 py-2.5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <Ban className="size-4" />
                Anular pedido
              </button>
              {noAnulable && <p id="motivo-no-anulable" className="text-xs text-muted-foreground">{noAnulable}</p>}
            </div>
          )}
        </div>
      </div>

      {anulando && (
        <DialogoAnular
          pedido={pedido}
          onCerrar={() => setAnulando(false)}
          onAnulado={() => {
            setAnulando(false);
            cargar();
          }}
        />
      )}
    </div>
  );
}
