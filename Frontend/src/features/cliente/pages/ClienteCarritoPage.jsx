import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, ArrowRight, AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useClienteCart } from '../context/ClienteCartContext';
import { getProductosCatalogo } from '../services/catalogoService';
import { estaDisponible, estaVencido, formatCOP, precioDe, stockDe } from '../utils/catalogo';
import ProductoImagen from '../components/ProductoImagen';
import CantidadStepper from '../components/CantidadStepper';
import ErrorBanner from '../../../shared/components/ErrorBanner';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { toast } from '../../../shared/utils/toast.jsx';

// idsVigentes es null hasta que se consulta el catálogo.
const fueraDelCatalogo = (producto, idsVigentes) => idsVigentes !== null && !idsVigentes.has(producto.id_producto);

/** Qué impide pedir este ítem hoy (null si nada): lo mismo que rechaza el backend. */
function problemaDe(item, idsVigentes) {
  const { producto, cantidad } = item;
  if (fueraDelCatalogo(producto, idsVigentes)) return { texto: 'Ya no está en el catálogo.' };
  if (!estaDisponible(producto)) return { texto: estaVencido(producto) ? 'Está vencido.' : 'Se agotó.' };
  const stock = stockDe(producto);
  if (cantidad > stock) return { texto: `Solo hay ${stock} ${stock === 1 ? 'unidad disponible' : 'unidades disponibles'}.`, ajustarA: stock };
  return null;
}

export default function ClienteCarritoPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, sincronizar, totalCount, totalAmount } = useClienteCart();
  const [verificando, setVerificando] = useState(true);
  const [errorVerificar, setErrorVerificar] = useState('');
  const [idsVigentes, setIdsVigentes] = useState(null);
  const [confirmarVaciar, setConfirmarVaciar] = useState(false);

  // Precios, stock y disponibilidad vigentes: el carrito guardado puede tener días.
  const verificar = useCallback(async () => {
    setVerificando(true);
    setErrorVerificar('');
    try {
      const vigentes = await getProductosCatalogo();
      const lista = Array.isArray(vigentes) ? vigentes : [];
      sincronizar(lista);
      setIdsVigentes(new Set(lista.map((p) => p.id_producto)));
    } catch (err) {
      setErrorVerificar(err?.message || 'No pudimos comprobar la disponibilidad de tus productos.');
    } finally {
      setVerificando(false);
    }
  }, [sincronizar]);

  useEffect(() => {
    verificar();
  }, [verificar]);

  const problemas = items.filter((i) => problemaDe(i, idsVigentes)).length;
  const puedeContinuar = items.length > 0 && !verificando && !errorVerificar && problemas === 0;

  const cambiarCantidad = (item, nueva) => {
    const stock = stockDe(item.producto);
    if (nueva > stock) {
      toast.warning(`Solo hay ${stock} unidades disponibles de ${item.producto.nombre}`);
      return;
    }
    if (nueva <= 0) toast.info(`Quitaste ${item.producto.nombre} del carrito`);
    updateQuantity(item.producto.id_producto, nueva);
  };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Tu carrito</h1>
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-4 py-14 text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-[#C1502D]/10 text-[#C1502D] dark:bg-[#C1502D]/15 dark:text-[#E8B23D]">
            <ShoppingCart className="size-8" strokeWidth={1.75} />
          </div>
          <h2 className="text-base font-bold text-foreground">Tu carrito está vacío</h2>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
            Agrega tus arepas favoritas desde el catálogo y aquí verás el resumen de tu pedido.
          </p>
          <NavLink
            to="/cliente/catalogo"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#C1502D] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A84223]"
          >
            Ver catálogo
            <ArrowRight className="size-4" />
          </NavLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Tu carrito</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? 'producto' : 'productos'} en tu pedido
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfirmarVaciar(true)}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10 cursor-pointer"
        >
          <Trash2 className="size-4" />
          Vaciar carrito
        </button>
      </header>

      <ErrorBanner message={errorVerificar} onRetry={verificar} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <ul className="space-y-3" aria-label="Productos del carrito">
          {items.map((item) => {
            const { producto, cantidad } = item;
            const problema = problemaDe(item, idsVigentes);
            const pedible = !fueraDelCatalogo(producto, idsVigentes) && estaDisponible(producto);
            return (
              <li
                key={producto.id_producto}
                className={`flex gap-3 rounded-2xl border bg-card p-3 sm:gap-4 sm:p-4 ${
                  problema ? 'border-[#C1502D]/40' : 'border-border'
                }`}
              >
                <ProductoImagen producto={producto} className="size-20 shrink-0 rounded-xl sm:size-24" />

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold leading-snug text-foreground sm:text-base">{producto.nombre}</h2>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatCOP(precioDe(producto))} c/u</p>
                    </div>
                    <span className="shrink-0 text-sm font-extrabold tabular-nums text-foreground sm:text-base">
                      {formatCOP(precioDe(producto) * cantidad)}
                    </span>
                  </div>

                  {problema && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]" role="alert">
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        {problema.texto}
                      </span>
                      {problema.ajustarA > 0 && (
                        <button
                          type="button"
                          onClick={() => updateQuantity(producto.id_producto, problema.ajustarA)}
                          className="underline underline-offset-2 hover:no-underline cursor-pointer"
                        >
                          Dejar {problema.ajustarA}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3">
                    {pedible ? (
                      <CantidadStepper
                        cantidad={cantidad}
                        max={stockDe(producto)}
                        nombre={producto.nombre}
                        size="sm"
                        onChange={(n) => cambiarCantidad(item, n)}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground tabular-nums">Cantidad: {cantidad}</span>
                    )}
                    {!pedible && (
                      <button
                        type="button"
                        onClick={() => removeItem(producto.id_producto)}
                        className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        Quitar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 lg:sticky lg:top-20" aria-label="Resumen del pedido">
          <h2 className="text-base font-bold text-foreground">Resumen del pedido</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-semibold tabular-nums text-foreground">{formatCOP(totalAmount)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Envío</dt>
              <dd className="font-semibold text-[#5A7A3A] dark:text-[#AEC094]">Sin costo</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-border pt-3 text-base">
              <dt className="font-bold text-foreground">Total</dt>
              <dd className="font-extrabold tabular-nums text-[#C1502D] dark:text-[#E8B23D]">{formatCOP(totalAmount)}</dd>
            </div>
          </dl>
          <p className="text-xs leading-relaxed text-muted-foreground">
            El valor final lo confirma CENAREPAS al registrar el pedido, con los precios vigentes.
          </p>

          <button
            type="button"
            disabled={!puedeContinuar}
            onClick={() => navigate('/cliente/checkout')}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C1502D] px-4 py-3 text-sm font-bold text-white shadow-xs transition-colors hover:bg-[#A84223] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] focus-visible:ring-offset-2"
          >
            {verificando ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Comprobando disponibilidad…
              </>
            ) : (
              <>
                Continuar con el pedido
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
          {!verificando && problemas > 0 && (
            <p className="text-xs font-semibold text-[#C1502D] dark:text-[#FFAAA0]">
              Corrige {problemas === 1 ? 'el producto marcado' : `los ${problemas} productos marcados`} para continuar.
            </p>
          )}

          <NavLink
            to="/cliente/catalogo"
            className="flex items-center justify-center gap-1.5 text-sm font-semibold text-[#C1502D] hover:underline dark:text-[#E8B23D]"
          >
            <ArrowLeft className="size-4" />
            Seguir comprando
          </NavLink>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={confirmarVaciar}
        title="Vaciar carrito"
        message="¿Quieres quitar todos los productos de tu carrito?"
        confirmText="Vaciar"
        onConfirm={() => {
          clearCart();
          setConfirmarVaciar(false);
          toast.info('Vaciaste tu carrito');
        }}
        onCancel={() => setConfirmarVaciar(false)}
      />
    </div>
  );
}
