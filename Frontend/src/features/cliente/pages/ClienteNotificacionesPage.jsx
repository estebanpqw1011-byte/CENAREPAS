import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useClienteNotifications } from '../context/ClienteNotificationContext';
import { fechaHora } from '../utils/pedidos';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { Skeleton } from '../../../shared/components/Skeleton';
import { toast } from '../../../shared/utils/toast.jsx';

export default function ClienteNotificacionesPage() {
  const navigate = useNavigate();
  const { notificaciones, noLeidas, cargando, error, marcarLeida, marcarTodasLeidas, recargar } = useClienteNotifications();

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrir = async (n) => {
    if (!n.leida) await marcarLeida(n.id_notificacion);
    if (n.id_pedido) navigate(`/cliente/pedidos/${n.id_pedido}`);
  };

  const marcarTodas = async () => {
    if (await marcarTodasLeidas()) toast.success('Marcaste todas como leídas');
  };

  const primeraCarga = cargando && notificaciones.length === 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Notificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {noLeidas > 0 ? `Tienes ${noLeidas} sin leer.` : 'Estás al día.'}
          </p>
        </div>
        {noLeidas > 0 && (
          <button
            type="button"
            onClick={marcarTodas}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3.5 py-2 text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
          >
            <CheckCheck className="size-4" />
            Marcar todas como leídas
          </button>
        )}
      </header>

      <ErrorBanner message={error} onRetry={recargar} />

      {primeraCarga ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : notificaciones.length === 0 ? (
        !error && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-4 py-14 text-center">
            <Bell className="mb-3 size-8 text-[#C1502D] dark:text-[#E8B23D]" />
            <h2 className="text-base font-bold text-foreground">No tienes notificaciones</h2>
            <p className="mt-1.5 max-w-md text-sm text-muted-foreground">Te avisaremos aquí cuando cambie el estado de tus pedidos o de tus abonos.</p>
          </div>
        )
      ) : (
        <ul className="space-y-2.5">
          {notificaciones.map((n) => (
            <li key={n.id_notificacion}>
              <button
                type="button"
                onClick={() => abrir(n)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] ${
                  n.leida ? 'border-border bg-card hover:bg-muted/40' : 'border-[#C1502D]/30 bg-[#C1502D]/5 hover:bg-[#C1502D]/10 dark:bg-[#C1502D]/10'
                }`}
              >
                <span className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.leida ? 'bg-transparent' : 'bg-[#C1502D]'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className={`text-sm text-foreground ${n.leida ? 'font-semibold' : 'font-bold'}`}>
                      {n.titulo}
                      {!n.leida && <span className="sr-only"> (sin leer)</span>}
                    </span>
                    <span className="text-xs text-muted-foreground">{fechaHora(n.fecha_creacion)}</span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{n.mensaje}</span>
                </span>
                {n.id_pedido && <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
