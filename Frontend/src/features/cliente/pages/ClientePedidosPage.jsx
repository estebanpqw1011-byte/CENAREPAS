import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import { getMisPedidos } from '../services/pedidosService';
import { fechaCorta, resumenPagos } from '../utils/pedidos';
import { formatCOP } from '../utils/catalogo';
import EstadoPedidoBadge from '../components/EstadoPedidoBadge';
import { ESTADOS_PEDIDO } from '../../../shared/config/negocio';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { Skeleton } from '../../../shared/components/Skeleton';

export default function ClientePedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [estado, setEstado] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await getMisPedidos();
      setPedidos(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus pedidos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const conteo = useMemo(() => {
    const c = {};
    pedidos.forEach((p) => {
      c[p.estado] = (c[p.estado] || 0) + 1;
    });
    return c;
  }, [pedidos]);

  const visibles = estado ? pedidos.filter((p) => p.estado === estado) : pedidos;

  const chipClase = (activo) =>
    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] ${
      activo ? 'border-[#C1502D] bg-[#C1502D] text-white' : 'border-border bg-card text-foreground hover:bg-muted'
    }`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Mis pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulta el estado de tus pedidos, sus pagos y su historial.</p>
      </header>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por estado">
        <button type="button" aria-pressed={estado === null} onClick={() => setEstado(null)} className={chipClase(estado === null)}>
          Todos <span className="tabular-nums opacity-75">{pedidos.length}</span>
        </button>
        {ESTADOS_PEDIDO.map((e) => (
          <button key={e} type="button" aria-pressed={estado === e} onClick={() => setEstado(estado === e ? null : e)} className={chipClase(estado === e)}>
            {e} <span className="tabular-nums opacity-75">{conteo[e] || 0}</span>
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onRetry={cargar} />

      {cargando ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      ) : error ? null : visibles.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-4 py-14 text-center">
          <Package className="mb-3 size-8 text-[#C1502D] dark:text-[#E8B23D]" />
          <h2 className="text-base font-bold text-foreground">
            {estado ? `No tienes pedidos en estado ${estado}` : 'Aún no tienes pedidos'}
          </h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            {estado ? 'Elige otro estado para ver el resto de tus pedidos.' : 'Cuando hagas tu primer pedido, lo verás aquí con su estado y sus pagos.'}
          </p>
          {!estado && (
            <NavLink to="/cliente/catalogo" className="mt-4 inline-flex rounded-xl bg-[#C1502D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A84223]">
              Ver catálogo
            </NavLink>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visibles.map((p) => {
            const { saldo } = resumenPagos(p);
            const unidades = (p.detalles || []).reduce((s, d) => s + (Number(d.cantidad) || 0), 0);
            const conSaldo = p.id_credito && p.estado !== 'Anulado' && saldo > 0;
            return (
              <li key={p.id_pedido}>
                <NavLink
                  to={`/cliente/pedidos/${p.id_pedido}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-foreground">Pedido #{p.id_pedido}</span>
                      <EstadoPedidoBadge estado={p.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pedido el {fechaCorta(p.fecha_pedido)} · Entrega {fechaCorta(p.fecha_entrega)} · {unidades} {unidades === 1 ? 'producto' : 'productos'}
                    </p>
                    {conSaldo && (
                      <p className="text-xs font-semibold text-[#8A5A14] dark:text-[#E8B23D]">Saldo pendiente: {formatCOP(saldo)}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total</span>
                    <span className="text-base font-extrabold tabular-nums text-[#C1502D] dark:text-[#E8B23D]">{formatCOP(p.valor_total)}</span>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
