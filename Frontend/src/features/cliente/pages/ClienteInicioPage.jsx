import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShoppingBag,
  Package,
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { api } from '../../../shared/services/api';

export default function ClienteInicioPage() {
  const [pedidosActivos, setPedidosActivos] = useState([]);
  const [saldoPendiente, setSaldoPendiente] = useState(0);
  const [perfilCompleto, setPerfilCompleto] = useState(true);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');

  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  })();

  const nombreUsuario = user.nombre || 'Cliente';

  useEffect(() => {
    let montado = true;
    async function cargarDatosInicio() {
      // Sin fila en cliente no hay pedidos ni créditos que pedir: además,
      // /mi/pedidos y /mi/creditos no filtran si el id_cliente es nulo.
      if (!user.id_cliente) {
        if (montado) {
          setPerfilCompleto(false);
          setCargando(false);
        }
        return;
      }

      try {
        setCargando(true);
        setErrorCarga('');
        const [listado, creditos] = await Promise.all([
          api.get('/mi/pedidos'),
          api.get('/mi/creditos'),
        ]);

        // Pedidos activos: Pendiente o En proceso (estados reales de la base)
        const activos = (listado || []).filter((p) => p.estado === 'Pendiente' || p.estado === 'En proceso');
        const totalSaldo = (creditos || [])
          .filter((c) => c.estado === 'Activo')
          .reduce((acc, c) => acc + (parseFloat(c.saldo_pendiente) || 0), 0);
        if (montado) {
          setPedidosActivos(activos);
          setSaldoPendiente(totalSaldo);
        }
      } catch (err) {
        if (montado) setErrorCarga(err?.message || 'No se pudieron cargar tus pedidos y créditos.');
      } finally {
        if (montado) setCargando(false);
      }
    }
    cargarDatosInicio();
    return () => { montado = false; };
  }, [user.id_cliente]);

  return (
    <div className="space-y-6">
      
      {/* Banner de "Completa tu perfil" si no tiene cliente asociado */}
      {!perfilCompleto && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl border border-[#E8B23D]/40 bg-[#E8B23D]/10 text-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D] shrink-0">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-foreground">
                Completa tu información de entrega
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Para poder despachar tus pedidos, necesitamos tu número de documento, dirección y barrio en el Área Metropolitana.
              </p>
            </div>
          </div>
          <NavLink
            to="/cliente/perfil"
            className="shrink-0 px-4 py-2 rounded-xl bg-[#C1502D] hover:bg-[#A84223] text-white text-xs font-bold transition-all shadow-xs"
          >
            Completar perfil
          </NavLink>
        </motion.div>
      )}

      {errorCarga && (
        <div role="alert" className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-xs sm:text-sm text-destructive flex items-start gap-2">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <span>{errorCarga}</span>
        </div>
      )}

      {/* Saludo y Hero de Bienvenida */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-6 sm:p-8 shadow-xs">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C1502D]/10 text-[#C1502D] text-xs font-bold mb-3">
            <Sparkles className="size-3.5" />
            <span>PORTAL DE AUTOGESTIÓN</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            ¡Hola, <span className="text-[#C1502D] dark:text-[#E8B23D]">{nombreUsuario}</span>!
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-2 leading-relaxed">
            Te damos la bienvenida a tu portal de clientes. Aquí puedes realizar pedidos de arepas recién hechas, verificar el estado de tus entregas y consultar tus saldos.
          </p>

          {/* Accesos Rápidos Principales */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <NavLink
              to="/cliente/catalogo"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#C1502D] hover:bg-[#A84223] active:bg-[#8C341A] text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
            >
              <ShoppingBag className="size-4" />
              <span>Hacer nuevo pedido</span>
              <ArrowRight className="size-4" />
            </NavLink>

            <NavLink
              to="/cliente/pedidos"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-semibold text-xs sm:text-sm transition-colors"
            >
              <Package className="size-4 text-[#C1502D] dark:text-[#E8B23D]" />
              <span>Mis pedidos</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen Financiero y Operativo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* Pedidos Activos */}
        <div className="p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pedidos en curso
            </span>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {cargando ? '...' : pedidosActivos.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {pedidosActivos.length === 1 ? '1 pedido en preparación' : `${pedidosActivos.length} pedidos activos`}
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#C1502D]/10 text-[#C1502D] dark:bg-[#E8B23D]/15 dark:text-[#E8B23D]">
            <Truck className="size-6" />
          </div>
        </div>

        {/* Saldo Pendiente */}
        <div className="p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Saldo Pendiente
            </span>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              {cargando ? '...' : `$${Number(saldoPendiente).toLocaleString('es-CO')}`}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Total por liquidar en tus créditos
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#E8B23D]/15 text-[#8A5A14] dark:text-[#E8B23D]">
            <CreditCard className="size-6" />
          </div>
        </div>

        {/* Sede Asignada */}
        <div className="p-5 rounded-2xl border border-border bg-card text-card-foreground shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Sede de Despacho
            </span>
            <div className="text-2xl font-extrabold text-foreground mt-1">
              Aranjuez
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cobertura en todo el Valle de Aburrá
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-[#5A7A3A]/10 text-[#5A7A3A] dark:text-[#AEC094]">
            <CheckCircle2 className="size-6" />
          </div>
        </div>

      </div>

      {/* Sección: Pedidos Recientes Activos */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="size-5 text-[#C1502D] dark:text-[#E8B23D]" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Tus Pedidos Activos
            </h2>
          </div>
          <NavLink
            to="/cliente/pedidos"
            className="text-xs font-bold text-[#C1502D] dark:text-[#E8B23D] hover:underline flex items-center gap-1"
          >
            <span>Ver historial completo</span>
            <ChevronRight className="size-3.5" />
          </NavLink>
        </div>

        {cargando ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Cargando tus pedidos...
          </div>
        ) : pedidosActivos.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3 text-muted-foreground">
              <ShoppingBag className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No tienes pedidos en curso en este momento
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Visita nuestro catálogo y disfruta de arepas frescas preparadas con el sabor tradicional de CENAREPAS.
            </p>
            <NavLink
              to="/cliente/catalogo"
              className="mt-4 px-4 py-2 rounded-xl bg-[#C1502D] text-white text-xs font-bold hover:bg-[#A84223] transition-colors"
            >
              Explorar Catálogo
            </NavLink>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidosActivos.map((pedido) => (
              <div
                key={pedido.id_pedido}
                className="p-4 rounded-2xl border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-foreground">
                      Pedido #{pedido.id_pedido}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                      pedido.estado === 'Pendiente'
                        ? 'bg-[#E8B23D]/20 text-[#8A5A14] dark:text-[#E8B23D]'
                        : 'bg-[#C1502D]/15 text-[#C1502D] dark:text-[#FFAAA0]'
                    }`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Entrega programada:{' '}
                    <span className="font-semibold text-foreground">
                      {pedido.fecha_entrega ? new Date(pedido.fecha_entrega).toLocaleDateString('es-CO') : 'Sin fecha'}
                    </span>{' '}
                    · Sede: {pedido.sede_nombre || 'Aranjuez'}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
                  <div className="text-right">
                    <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total</span>
                    <span className="text-sm font-extrabold text-[#C1502D] dark:text-[#E8B23D]">
                      ${Number(pedido.valor_total).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <NavLink
                    to={`/cliente/pedidos/${pedido.id_pedido}`}
                    className="px-3.5 py-1.5 rounded-xl border border-border bg-card text-xs font-bold hover:bg-muted transition-colors flex items-center gap-1"
                  >
                    <span>Detalle</span>
                    <ChevronRight className="size-3.5" />
                  </NavLink>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
