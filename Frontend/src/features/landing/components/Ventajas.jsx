import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ClipboardList, Factory, AlertTriangle, BarChart3, ArrowRight,
  Sparkles, CheckCircle2, Clock, ShieldCheck, Flame, Cpu, ArrowUpRight,
  Truck, Radio, ChevronRight, Layers, Bell, Search, RefreshCw
} from 'lucide-react';
import { SectionTransition } from './SectionTransition';

/**
 * Ventajas — caso de estudio del sistema CENAREPAS.
 * Fondo de sección claro (crema cálido #fffbf0) con recuadros oscuros de alto contraste.
 * El mockup grande del sistema (#482) toma el protagonismo central absoluto a ancho completo.
 */
const KPIS = [
  {
    id: 'pedidos',
    icon: ClipboardList,
    value: '1.248',
    title: 'Cero pedidos perdidos',
    description: 'Cada pedido sincronizado entre bodega, producción y ventas sin papel.',
    tone: 'brand',
  },
  {
    id: 'produccion',
    icon: Factory,
    value: '620 ar.',
    title: 'Producción en tiempo real',
    description: 'Ves cuántas arepas van en el lote actual y el tiempo exacto de salida.',
    tone: 'gold',
  },
  {
    id: 'alertas',
    icon: AlertTriangle,
    value: '12%',
    title: 'Alertas tempranas de materia prima',
    description: 'El sistema avisa antes de que la harina o empaque bajen del mínimo.',
    tone: 'brand',
  },
  {
    id: 'decisiones',
    icon: BarChart3,
    value: '+18%',
    title: 'Decisiones basadas en datos',
    description: 'Ventas por cliente, lote y canal siempre a la vista para decidir qué producir.',
    tone: 'green',
  },
];

const FLOW_STEPS = [
  {
    key: 'recibido',
    stepNumber: '01',
    label: 'Recibido',
    status: 'NUEVO PEDIDO',
    statusDesc: 'Inventario de masa y empaque reservado',
    tone: 'gold',
    agentHeadline: 'Validación Automática de Stock',
    agentMessage: 'Pedido #482 recibido de Restaurante La Sazón. Stock de harina verificado (840 kg disp.). 40 paquetes autorizados.',
    agentTime: '10:42:04 AM',
    eta: 'Salida estimada: 11:15 AM',
    temp: '182°C',
    batchProgress: 25,
    highlight: 'inventario',
  },
  {
    key: 'produccion',
    stepNumber: '02',
    label: 'En Asado',
    status: 'EN PRODUCCIÓN',
    statusDesc: 'Lote #204 en asador #2 · 400 arepas en cocción',
    tone: 'brand',
    agentHeadline: 'Monitoreo de Horneado en Planta',
    agentMessage: 'Lote #204 ingresado a Asador #2. Temperatura estable en 185°C. Tiempo de amasado completado con éxito.',
    agentTime: '10:42:28 AM',
    eta: 'Horneando: 12 min restantes',
    temp: '185°C',
    batchProgress: 72,
    highlight: 'produccion',
  },
  {
    key: 'listo',
    stepNumber: '03',
    label: 'Empacado',
    status: 'LISTO PARA DESPACHO',
    statusDesc: 'Control de calidad 99.2% · Asignado a Móvil 3',
    tone: 'green',
    agentHeadline: 'Calidad Verificada & Despacho',
    agentMessage: 'Control de calidad aprobado. 40 paquetes sellados herméticamente con código de lote #204. Móvil 3 notificado.',
    agentTime: '10:42:51 AM',
    eta: 'En ruta · Conductor: Carlos M.',
    temp: '180°C',
    batchProgress: 100,
    highlight: 'despacho',
  },
];

const ACCIONES_RAPIDAS = ['Imprimir comanda', 'Reasignar turno', 'Guía de despacho', 'Detalle de lote'];

const TONE = {
  brand: {
    chip: 'bg-[#c1502d]/25 text-[#f59e7a] border border-[#c1502d]/40',
    dot: 'bg-[#e2895f]',
    bar: 'from-[#c1502d] via-[#e2895f] to-[#fbd28a]',
    hex: '#e2895f',
    glow: 'rgba(193, 80, 45, 0.45)',
  },
  gold: {
    chip: 'bg-[#e8b23d]/25 text-[#fbd28a] border border-[#e8b23d]/40',
    dot: 'bg-[#e8b23d]',
    bar: 'from-[#e8b23d] to-[#fbd28a]',
    hex: '#e8b23d',
    glow: 'rgba(232, 178, 61, 0.45)',
  },
  green: {
    chip: 'bg-[#5a7a3a]/30 text-[#a3d97a] border border-[#5a7a3a]/50',
    dot: 'bg-[#8fc25a]',
    bar: 'from-[#5a7a3a] to-[#8fc25a]',
    hex: '#8fc25a',
    glow: 'rgba(90, 122, 58, 0.45)',
  },
};

const railContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const railItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
};

function useCycle(length, ms, enabled) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const id = setInterval(() => setStep((s) => (s + 1) % length), ms);
    return () => clearInterval(id);
  }, [enabled, length, ms]);
  return step;
}

function PulseDot({ className }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${className}`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}

function KpiCard({ icon: Icon, value, title, description, tone }) {
  const t = TONE[tone];
  return (
    <motion.div
      variants={railItem}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 350, damping: 22 }}
      className="group relative flex flex-col justify-between rounded-2xl border border-[#2a1408]/15 bg-gradient-to-b from-[#1c0d06] to-[#120703] p-5 shadow-[0_12px_24px_-8px_rgba(28,11,3,0.2)] transition-all duration-300 hover:border-[#c1502d]/45 hover:shadow-[0_20px_35px_-8px_rgba(28,11,3,0.35)] h-full w-full"
    >
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${t.chip}`}>
            <Icon className="size-4.5" aria-hidden />
          </span>
          <span className="font-mono text-base font-extrabold tracking-tight text-[#fbd28a]">
            {value}
          </span>
        </div>
        <h3 className="mt-3.5 text-sm font-bold leading-snug text-[#fffbf0] min-h-[40px] flex items-center">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-[#fffbf0]/65 line-clamp-3">{description}</p>
      </div>
      <div className="mt-auto pt-3 flex items-center gap-1 text-[10.5px] font-semibold text-[#fbd28a]/70 group-hover:text-[#fbd28a] transition-colors border-t border-white/5">
        <span>Trazado en sistema</span>
        <ChevronRight className="size-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </motion.div>
  );
}

function DominantLaptopMockup({ shouldReduceMotion }) {
  const activeStep = useCycle(FLOW_STEPS.length, 3800, !shouldReduceMotion);
  const current = FLOW_STEPS[activeStep];
  const t = TONE[current.tone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
      className="relative mx-auto w-full max-w-6xl"
    >
      {/* Resplandor cinemático ambiental multicapa (Terracota & Oro) */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-16 -inset-y-12 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_50%_35%,rgba(193,80,45,0.28),rgba(232,178,61,0.12)_55%,transparent_75%)] blur-3xl"
      />

      {/* Chasis principal del Mockup */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/20 bg-[#0e0704] shadow-[0_35px_100px_-20px_rgba(18,11,7,0.65),0_0_0_1px_rgba(255,255,255,0.08)] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/40 after:to-transparent">
        
        {/* ─── 1. Barra Superior / Chrome de la Aplicación ─── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#160b06] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Botones de ventana macOS */}
            <div className="flex gap-1.5" aria-hidden>
              <span className="size-3 rounded-full bg-[#ff5f56]/90 shadow-xs" />
              <span className="size-3 rounded-full bg-[#ffbd2e]/90 shadow-xs" />
              <span className="size-3 rounded-full bg-[#27c93f]/90 shadow-xs" />
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 pl-3">
              <span className="text-xs font-black tracking-wider text-[#e8b23d]">CENAREPAS</span>
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#fffbf0]/75">
                v2.4 Live Core
              </span>
            </div>

            {/* Pestañas de navegación de software */}
            <nav className="hidden md:flex items-center gap-1 pl-3">
              {[
                { name: 'Pedidos en Vivo', active: true, badge: '1 activo' },
                { name: 'Producción & Hornos', active: false },
                { name: 'Inventario', active: false },
                { name: 'Despacho', active: false },
              ].map((tab) => (
                <span
                  key={tab.name}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    tab.active
                      ? 'bg-white/15 text-white font-semibold shadow-xs'
                      : 'text-[#fffbf0]/80 hover:text-white'
                  }`}
                >
                  {tab.name}
                  {tab.badge && (
                    <span className="rounded-full bg-[#c1502d] px-1.5 py-0.2 text-[9px] text-white">
                      {tab.badge}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          {/* Telemetría en vivo en el header */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#fffbf0]/80">
              <Flame className="size-3.5 text-[#e2895f]" />
              <span>Asador #2: <strong className="text-white">{current.temp}</strong></span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#5a7a3a]/30 border border-[#5a7a3a]/50 px-3 py-1 text-xs font-semibold text-[#a3d97a]">
              <PulseDot className="bg-[#8fc25a]" />
              Sincronizado en tiempo real
            </span>
          </div>
        </div>

        {/* ─── 2. Cuerpo del Sistema: Panel Agente (izq) + Detalle de Operación (der) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">

          {/* Panel Izquierdo: Agente IA Operativo */}
          <div className="border-b lg:border-b-0 lg:border-r border-white/10 bg-[#090402] p-5 flex flex-col justify-between gap-5">
            <div>
              {/* Header del Agente */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-[#e8b23d]/20 text-[#e8b23d] border border-[#e8b23d]/30">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-white block">
                      Agente CENAREPAS
                    </span>
                    <span className="text-[10px] text-[#fffbf0]/50">Autónomo · Asistente</span>
                  </div>
                </div>
                <Radio className="size-3.5 text-[#8fc25a] animate-pulse" />
              </div>

              {/* Registro Dinámico de Pasos */}
              <div className="space-y-3">
                {FLOW_STEPS.map((step, idx) => {
                  const isActive = idx === activeStep;
                  const isDone = idx < activeStep;
                  return (
                    <motion.div
                      key={step.key}
                      animate={{
                        borderColor: isActive ? 'rgba(226,137,95,0.5)' : 'rgba(255,255,255,0.06)',
                        backgroundColor: isActive ? 'rgba(193,80,45,0.14)' : 'rgba(255,255,255,0.02)',
                        scale: isActive ? 1.01 : 1,
                      }}
                      className="rounded-xl border p-3 transition-all duration-300 relative overflow-hidden"
                    >
                      {isActive && (
                        <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#c1502d] to-[#e8b23d]" />
                      )}
                      
                      <div className="flex items-center justify-between mb-1.5 pl-1">
                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 className="size-3.5 text-[#8fc25a]" />
                          ) : isActive ? (
                            <PulseDot className="bg-[#e8b23d]" />
                          ) : (
                            <Clock className="size-3.5 text-[#fffbf0]/30" />
                          )}
                          <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-[#fffbf0]/50'}`}>
                            Paso {step.stepNumber}: {step.label}
                          </span>
                        </div>
                        <span className="text-[9.5px] font-mono text-[#fffbf0]/40">{step.agentTime}</span>
                      </div>

                      <p className={`text-[11px] leading-relaxed pl-1 ${isActive ? 'text-[#fffbf0] font-medium' : 'text-[#fffbf0]/45'}`}>
                        {step.agentMessage}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Widget de Telemetría al pie del Agente */}
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between text-[11px] text-[#fffbf0]/80 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <Cpu className="size-3.5 text-[#e8b23d]" />
                  Carga del Servidor
                </span>
                <span className="font-mono text-[#8fc25a]">4% · Óptimo</span>
              </div>
              <div className="flex items-center justify-between text-[10.5px] text-[#fffbf0]/50 border-t border-white/5 pt-1.5">
                <span>Lotes registrados hoy:</span>
                <strong className="text-[#fffbf0]">18 lotes</strong>
              </div>
            </div>
          </div>

          {/* Panel Derecho: Interfaz Viva de Operaciones y Planta */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6 bg-gradient-to-br from-[#130804] via-[#0f0603] to-[#090402]">
            
            {/* Fila 1: Encabezado del Pedido con Status Badge Animado y Acciones */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/15 to-white/5 text-white font-mono font-extrabold text-base border border-white/15 shadow-inner">
                    #482
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                        Restaurante La Sazón
                      </h4>
                      <span className="rounded-md bg-brand/20 border border-brand/30 px-2 py-0.5 text-[10px] font-bold text-brand-light">
                        Prioridad Alta
                      </span>
                    </div>
                    <p className="text-xs text-[#fffbf0]/65 mt-0.5">
                      40 paquetes · Arepas de Maíz Blanco x10 · Empaque Especial
                    </p>
                  </div>
                </div>

                {/* Status Badge Animado con Framer Motion */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={current.status}
                    initial={{ opacity: 0, y: -8, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.94 }}
                    transition={{ duration: 0.25 }}
                    className={`rounded-full px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider shadow-md ${t.chip}`}
                  >
                    {current.status}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Fila 2: Matriz de 4 Indicadores Operativos con Highlight Reactivo */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.05]">
                  <span className="text-[10.5px] uppercase font-bold text-[#fffbf0]/45 block">Línea Asignada</span>
                  <span className="text-xs sm:text-sm font-bold text-[#fffbf0] mt-0.5 block">Línea Clásica</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.05]">
                  <span className="text-[10.5px] uppercase font-bold text-[#fffbf0]/45 block">Lote de Masa</span>
                  <span className="text-xs sm:text-sm font-bold text-[#fbd28a] mt-0.5 block">#204 (Activo)</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.05]">
                  <span className="text-[10.5px] uppercase font-bold text-[#fffbf0]/45 block">Destino</span>
                  <span className="text-xs sm:text-sm font-bold text-[#fffbf0] mt-0.5 block">Bello Oriente / Centro</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.05]">
                  <span className="text-[10.5px] uppercase font-bold text-[#fffbf0]/45 block">Control de Calidad</span>
                  <span className="text-xs sm:text-sm font-bold text-[#8fc25a] flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    99.2% Aprobado
                  </span>
                </div>
              </div>
            </div>

            {/* Fila 3: Pipeline Visual de Fábrica con Animación Dinámica */}
            <div className="rounded-2xl border border-white/10 bg-[#090402]/90 p-5 shadow-inner">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PulseDot className="bg-[#e8b23d]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">
                    Línea de Producción & Salida
                  </span>
                </div>
                <span className="text-xs font-mono font-extrabold text-[#fbd28a]">
                  {current.batchProgress}% Completado
                </span>
              </div>

              {/* Barra de progreso animada con resplandor */}
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${t.bar}`}
                  initial={false}
                  animate={{ width: `${current.batchProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                />
              </div>

              {/* Nodos del Pipeline con detalles */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {FLOW_STEPS.map((step, idx) => {
                  const isActive = idx === activeStep;
                  const isPassed = idx <= activeStep;
                  return (
                    <div
                      key={step.key}
                      className={`flex flex-col items-center text-center p-2 rounded-xl transition-colors ${
                        isActive ? 'bg-white/[0.06] border border-white/10' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`size-2.5 rounded-full transition-colors duration-300 ${
                            isPassed ? TONE[step.tone].dot : 'bg-white/20'
                          }`}
                        />
                        <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-[#fffbf0]/45'}`}>
                          {step.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#fffbf0]/60">
                        {step.key === 'recibido' ? 'Tolva Bodega' : step.key === 'produccion' ? 'Asador #2' : 'Móvil en Ruta'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Fila 4: Barra Inferior con Acciones Rápidas y ETA */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {ACCIONES_RAPIDAS.map((accion) => (
                  <button
                    key={accion}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-[#fffbf0]/80 transition-all hover:border-brand/50 hover:bg-white/10 hover:text-white cursor-pointer active:scale-95"
                  >
                    {accion}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-[#fffbf0]/75 font-medium">
                <Truck className="size-3.5 text-[#e8b23d]" />
                <span>{current.eta}</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Base física y sombra del portátil */}
      <div className="mx-auto -mt-1 h-4 w-[90%] rounded-b-2xl bg-gradient-to-b from-[#241208] to-[#0e0704] border-x border-b border-white/15 shadow-2xl" />
      <div className="mx-auto h-1.5 w-[44%] rounded-b-full bg-[#1b0d06]" />
    </motion.div>
  );
}

export function Ventajas() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section
      id="ventajas"
      className="relative py-20 sm:py-28 bg-[#fffbf0] text-slate-900 overflow-hidden"
    >
      {/* ─── Unión fluida en OKLCH entre Productos (tint-gold) y Ventajas (crema) ─── */}
      <SectionTransition from="var(--landing-tint-gold)" to="#fffbf0" height="h-16 sm:h-20" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado con disciplina tipográfica en fondo claro */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center mb-12 sm:mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-brand">
            <PulseDot className="bg-brand" />
            <span className="landing-eyebrow">Sistema CENAREPAS</span>
          </span>
          <h2 className="landing-heading mt-4 text-3xl sm:text-4xl md:text-5xl lg:text-[3.2rem] font-bold text-slate-900">
            Tu fábrica, <span className="landing-accent-serif font-normal text-brand">controlada</span>
            <span className="block font-sans font-bold text-brand text-[0.92em] mt-1">
              desde una sola pantalla
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base sm:text-lg leading-relaxed text-slate-600">
            CENAREPAS conecta pedidos, producción y ventas en un solo panel. Mientras tú decides,
            el sistema se actualiza solo en tiempo real.
          </p>
        </motion.div>

        {/* ─── 1. Fila de 4 Cards de Ventajas (Recuadros oscuros de alto contraste) ─── */}
        <motion.div
          variants={railContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-14 sm:mb-18 items-stretch"
        >
          {KPIS.map((kpi) => (
            <KpiCard key={kpi.id} {...kpi} />
          ))}
        </motion.div>

        {/* ─── 2. Mockup Gigante y Protagónico de la Pantalla del Sistema a Ancho Completo ─── */}
        <div className="w-full">
          <DominantLaptopMockup shouldReduceMotion={shouldReduceMotion} />
        </div>

        {/* ─── 3. Botón CTA hacia contacto ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-16 sm:mt-20 flex justify-center"
        >
          <motion.a
            href="#contacto"
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            className="group inline-flex items-center gap-2.5 rounded-full bg-brand py-2.5 pr-2.5 pl-6 text-xs sm:text-sm font-semibold text-white shadow-md shadow-brand/20 transition-colors hover:bg-brand-dark cursor-pointer"
          >
            Entra al futuro de tu negocio
            <span className="relative grid size-7 place-items-center overflow-hidden rounded-full bg-white text-brand shadow-xs">
              <ArrowRight
                className="size-3.5 transition-transform duration-300 ease-out group-hover:translate-x-5"
                aria-hidden="true"
              />
              <ArrowRight
                className="absolute size-3.5 -translate-x-5 transition-transform duration-300 ease-out group-hover:translate-x-0"
                aria-hidden="true"
              />
            </span>
          </motion.a>
        </motion.div>

      </div>
    </section>
  );
}


