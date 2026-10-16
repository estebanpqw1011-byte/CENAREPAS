import React, { useCallback, useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, CreditCard, Loader2 } from 'lucide-react';
import { getMisCreditos, registrarAbonoCliente } from '../services/cuentaService';
import { formatCOP } from '../utils/catalogo';
import { fechaCorta } from '../utils/pedidos';
import EstadoPedidoBadge from '../components/EstadoPedidoBadge';
import ComprobanteUploader from '../components/ComprobanteUploader';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import { Skeleton } from '../../../shared/components/Skeleton';
import { toast } from '../../../shared/utils/toast.jsx';

// Medios del abono del cliente: los mismos que ofrece la app.
const MEDIOS_ABONO = ['Transferencia', 'Efectivo'];

/** Lo que aún se puede abonar: el saldo menos lo que está en revisión (como el backend). */
const disponibleDe = (credito) =>
  Math.max(0, Number(credito.saldo_pendiente) - Number(credito.valor_en_revision || 0));

function NuevoAbono({ credito, onRegistrado }) {
  const disponible = disponibleDe(credito);
  const [texto, setTexto] = useState('');
  const [medio, setMedio] = useState('Transferencia');
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const valor = Number(texto.replace(/\D/g, '')) || 0;

  const registrar = async () => {
    const nuevos = {};
    if (valor <= 0) nuevos.valor = 'Ingresa un valor mayor a $0';
    else if (valor > disponible) nuevos.valor = `El valor supera el saldo disponible (${formatCOP(disponible)})`;
    if (medio === 'Transferencia' && !comprobante) nuevos.comprobante = 'Adjunta el comprobante de la transferencia';
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setEnviando(true);
    try {
      await registrarAbonoCliente(credito.id_credito, {
        valor,
        medioPago: medio,
        comprobanteUrl: medio === 'Transferencia' ? comprobante?.url : undefined,
      });
      toast.success(`Abono de ${formatCOP(valor)} registrado. Quedó en revisión.`);
      onRegistrado();
    } catch (err) {
      const datos = err?.data || {};
      setErrores({
        valor: datos.errors?.valor_abonado,
        comprobante: datos.errors?.comprobante_url,
        general: datos.errors ? undefined : datos.message || err?.message || 'No se pudo registrar el abono',
      });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
      <h3 className="text-sm font-bold text-foreground">Registrar un abono</h3>
      <div className="space-y-1.5">
        <label htmlFor={`abono-${credito.id_credito}`} className="block text-sm font-semibold text-foreground">
          Valor <span className="font-normal text-muted-foreground">(máximo {formatCOP(disponible)})</span>
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input
            id={`abono-${credito.id_credito}`}
            inputMode="numeric"
            value={valor ? valor.toLocaleString('es-CO') : ''}
            onChange={(e) => {
              setTexto(e.target.value);
              setErrores((a) => ({ ...a, valor: undefined }));
            }}
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-7 pr-3.5 text-sm tabular-nums text-foreground focus:border-[#C1502D] focus:outline-none focus:ring-2 focus:ring-[#C1502D]/15"
            placeholder="0"
          />
        </div>
        {errores.valor && <p className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">{errores.valor}</p>}
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Medio de pago del abono">
        {MEDIOS_ABONO.map((m) => (
          <label
            key={m}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold ${
              medio === m ? 'border-[#C1502D] bg-[#C1502D]/5 text-foreground' : 'border-border text-foreground hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name={`medio-${credito.id_credito}`}
              checked={medio === m}
              onChange={() => {
                setMedio(m);
                setErrores((a) => ({ ...a, comprobante: undefined }));
              }}
              className="accent-[#C1502D]"
            />
            {m}
          </label>
        ))}
      </div>

      {medio === 'Transferencia' && (
        <ComprobanteUploader
          id={`comprobante-${credito.id_credito}`}
          valor={comprobante}
          onChange={setComprobante}
          error={errores.comprobante}
          onError={(mensaje) => setErrores((a) => ({ ...a, comprobante: mensaje }))}
          onSubiendo={setSubiendo}
        />
      )}

      {errores.general && <p role="alert" className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">{errores.general}</p>}

      <button
        type="button"
        onClick={registrar}
        disabled={enviando || subiendo}
        className="inline-flex items-center gap-2 rounded-xl bg-[#C1502D] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#A84223] disabled:opacity-60 cursor-pointer"
      >
        {enviando && <Loader2 className="size-4 animate-spin" />}
        Registrar abono
      </button>
      <p className="text-xs text-muted-foreground">El abono queda en revisión hasta que CENAREPAS lo confirme.</p>
    </div>
  );
}

function TarjetaCredito({ credito, abierto, onAlternar, onRegistrado }) {
  const disponible = disponibleDe(credito);
  const enRevision = Number(credito.valor_en_revision || 0);
  const puedeAbonar = credito.estado === 'Activo' && disponible > 0;

  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onAlternar}
        aria-expanded={abierto}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C1502D]"
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-extrabold text-foreground">Crédito del pedido #{credito.id_pedido}</span>
            <EstadoPedidoBadge estado={credito.estado} />
          </div>
          <p className="text-sm text-muted-foreground">
            Total {formatCOP(credito.valor_total)} · Abonado {formatCOP(credito.valor_abonado)}
            {enRevision > 0 && ` · En revisión ${formatCOP(enRevision)}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Saldo</span>
          <span className="text-base font-extrabold tabular-nums text-[#C1502D] dark:text-[#E8B23D]">{formatCOP(credito.saldo_pendiente)}</span>
        </div>
        <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>Pedido del {fechaCorta(credito.fecha_pedido)}</span>
            <span>Estado del pedido: {credito.pedido_estado}</span>
            <NavLink to={`/cliente/pedidos/${credito.id_pedido}`} className="font-semibold text-[#C1502D] hover:underline dark:text-[#E8B23D]">
              Ver pedido
            </NavLink>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold text-foreground">Abonos</h3>
            {(credito.abonos || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aún no hay abonos en este crédito.</p>
            ) : (
              <ul className="space-y-2">
                {credito.abonos.map((a) => (
                  <li key={a.id_abono} className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3 text-sm">
                    <span>
                      <span className="block font-semibold tabular-nums text-foreground">{formatCOP(a.valor_abonado)}</span>
                      <span className="block text-xs text-muted-foreground">{a.medio_pago} · {fechaCorta(a.fecha_abono || a.fecha_registro)}</span>
                      {a.motivo_rechazo && <span className="block text-xs text-destructive">{a.motivo_rechazo}</span>}
                    </span>
                    <EstadoPedidoBadge estado={a.estado} />
                  </li>
                ))}
              </ul>
            )}
            {enRevision > 0 && (
              <p className="text-xs text-muted-foreground">Los abonos en revisión se descuentan del saldo cuando CENAREPAS los aprueba.</p>
            )}
          </div>

          {puedeAbonar ? (
            <NuevoAbono credito={credito} onRegistrado={onRegistrado} />
          ) : (
            credito.estado === 'Activo' && (
              <p className="text-sm text-muted-foreground">El saldo ya está cubierto por abonos en revisión.</p>
            )
          )}
        </div>
      )}
    </li>
  );
}

export default function ClienteCreditosPage() {
  const [creditos, setCreditos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const lista = await getMisCreditos();
      setCreditos(Array.isArray(lista) ? lista : []);
    } catch (err) {
      setError(err?.message || 'No se pudieron cargar tus créditos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const saldoTotal = creditos
    .filter((c) => c.estado === 'Activo')
    .reduce((s, c) => s + (Number(c.saldo_pendiente) || 0), 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Mis créditos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Pedidos pagados con abono: lo abonado, lo que está en revisión y el saldo.</p>
        </div>
        {!cargando && !error && creditos.length > 0 && (
          <div className="rounded-2xl bg-[#E8B23D]/15 px-4 py-3 text-right">
            <span className="block text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#8A5A14] dark:text-[#E8B23D]">Saldo pendiente</span>
            <span className="text-xl font-extrabold tabular-nums text-foreground">{formatCOP(saldoTotal)}</span>
          </div>
        )}
      </header>

      <ErrorBanner message={error} onRetry={cargar} />

      {cargando ? (
        <div className="space-y-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
        </div>
      ) : error ? null : creditos.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-4 py-14 text-center">
          <CreditCard className="mb-3 size-8 text-[#C1502D] dark:text-[#E8B23D]" />
          <h2 className="text-base font-bold text-foreground">No tienes créditos</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Cuando pagues un pedido con abono, aquí verás su saldo y podrás registrar nuevos abonos.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {creditos.map((c) => (
            <TarjetaCredito
              key={c.id_credito}
              credito={c}
              abierto={abierto === c.id_credito}
              onAlternar={() => setAbierto(abierto === c.id_credito ? null : c.id_credito)}
              onRegistrado={cargar}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
