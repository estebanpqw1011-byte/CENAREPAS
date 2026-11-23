import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Wheat, ShieldCheck, Thermometer, ClipboardCheck, Sparkle, TrendingUp,
  Truck, Package, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, Cell, AreaChart, Area, ReferenceDot,
  RadialBarChart, RadialBar, PolarAngleAxis,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATS = [
  {
    value: '10+',
    unit: 'módulos',
    desc: 'ventas, producción, insumos, pedidos y más',
    color: 'text-brand',
  },
  {
    value: '1',
    unit: 'sistema',
    desc: 'que conecta toda la operación de tu fábrica',
    color: 'text-accent-green',
  },
  {
    value: '100%',
    unit: 'trazable',
    desc: 'cada lote y cada pedido queda registrado',
    color: 'text-accent-gold',
  },
];

const PRODUCCION_SEMANA = [
  { dia: 'Lun', unidades: 380 },
  { dia: 'Mar', unidades: 410 },
  { dia: 'Mié', unidades: 395 },
  { dia: 'Jue', unidades: 460 },
  { dia: 'Vie', unidades: 520 },
  { dia: 'Sáb', unidades: 610, destacada: true },
];

const CALIDAD_SEMANA = [
  { dia: 'Lun', aprobados: 96.1 },
  { dia: 'Mar', aprobados: 96.8 },
  { dia: 'Mié', aprobados: 97.4 },
  { dia: 'Jue', aprobados: 98.0 },
  { dia: 'Vie', aprobados: 98.6 },
  { dia: 'Sáb', aprobados: 99.2, destacada: true },
];

const CALIDAD_DELTA = (
  CALIDAD_SEMANA[CALIDAD_SEMANA.length - 1].aprobados - CALIDAD_SEMANA[0].aprobados
).toFixed(1);

const DESPACHO_HOY = [{ name: 'A tiempo', value: 94 }];

// Beige de Humo (#a8916f): par de texto silenciado ya documentado en DESIGN.md
// para fondos oscuros (~6:1 de contraste verificado) — se reutiliza aquí en las
// tarjetas oscuras de "Nosotros" en vez de white/opacidad sin verificar.
const MUTED_ON_DARK = 'text-[#a8916f]';

function ChartTooltip({ active, payload, label, unit, decimals = 0 }) {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="rounded-xl border border-[#e8dcc0] bg-[#fffbf0] px-3.5 py-2.5 shadow-[0_14px_28px_-6px_rgba(0,0,0,0.45)]"
    >
      {label != null && (
        <p className="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[#78633f]">
          {label}
        </p>
      )}
      <p className="text-sm font-bold text-[#2a1206]">
        {decimals ? value.toFixed(decimals) : value.toLocaleString('es-CO')}
        {unit ? <span className="font-normal text-[#78633f]"> {unit}</span> : null}
      </p>
    </motion.div>
  );
}

function DiaTick({ x, y, payload, data }) {
  const item = data.find((d) => d.dia === payload.value);
  return (
    <text
      x={x}
      y={y + 13}
      textAnchor="middle"
      fontSize={10}
      fontFamily="Poppins, sans-serif"
      fontWeight={item?.destacada ? 700 : 500}
      fill={item?.destacada ? '#fbd28a' : '#a8916f'}
    >
      {payload.value}
    </text>
  );
}

function ActivityCard({ icon: Icon, iconBg, iconColor, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1c0b03] p-3 mb-2.5 shadow-sm min-h-[62px]">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${iconBg} ${iconColor}`}>
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <h4 className="text-xs font-semibold text-[#fffbf0] truncate">{title}</h4>
        <p className={`text-[11px] ${MUTED_ON_DARK} truncate`}>{subtitle}</p>
      </div>
    </div>
  );
}

function WindowChrome({ label }) {
  return (
    <div className="flex items-center gap-1.5 border-b border-white/10 bg-[#160802] px-3 py-2">
      <span className="size-2 rounded-full bg-red-400/70" />
      <span className="size-2 rounded-full bg-yellow-400/70" />
      <span className="size-2 rounded-full bg-green-400/70" />
      <span className={`ml-auto text-[10px] ${MUTED_ON_DARK}`}>{label}</span>
    </div>
  );
}

export function AboutSection() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="nosotros" className="relative overflow-hidden -mt-px pt-10 sm:pt-14 pb-16 sm:pb-24 bg-[#fffbf0]">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-14"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-brand">
            <Wheat className="size-3.5" aria-hidden />
            <span className="landing-eyebrow">¿Por qué CENAREPAS?</span>
          </span>
          <h2 className="landing-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mt-4">
            Nace para digitalizar{' '}
            <span className="landing-accent-serif font-normal text-brand">fábricas de alimentos</span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mt-4">
            Masarepas, empresa medellinense liderada por María Quintero Figueroa con sedes en Bello Oriente y Aranjuez, produce y comercializa entre 800 y 1.000 paquetes diarios. CENAREPAS centraliza toda su operación: control de insumos, fichas técnicas de recetas, lotes de producción y despacho en tiempo real.
          </p>
        </motion.div>

        {/* Bloque de estadísticas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-brand/15 mb-16 pb-16 border-b border-slate-100"
        >
          {STATS.map(({ value, unit, desc, color }) => (
            <div key={unit} className="sm:px-8 first:sm:pl-0 last:sm:pr-0">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {value}
                </span>
                <span className={`font-sans font-bold text-xl sm:text-2xl ${color}`}>
                  {unit}
                </span>
              </div>
              <p className="mt-3 max-w-[15rem] text-sm leading-relaxed text-slate-500">
                {desc}
              </p>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">

          {/* Columna 1: Elaboración */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col h-full"
          >
            <div className="flex flex-col mb-4 lg:min-h-[128px]">
              <div className="flex items-center gap-2 mb-1.5">
                <Wheat className="w-5 h-5 text-brand shrink-0" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Producción</h3>
              </div>
              <p className="text-sm font-normal text-slate-600 leading-relaxed lg:min-h-[88px]">
                El módulo de producción registra cada etapa en tiempo real. Así lo usa Masarepas
                para seguir su producción diaria de arepas, del amasado al horneado.
              </p>
            </div>

            <div className="relative rounded-2xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] border border-white/10 p-4 overflow-hidden h-full flex-1 flex flex-col justify-between">
              <div>
                <ActivityCard
                  icon={Wheat}
                  iconBg="bg-brand/20"
                  iconColor="text-brand-light"
                  title="Amasado de la masa"
                  subtitle="Producción de hoy · en proceso"
                />
                <ActivityCard
                  icon={ShieldCheck}
                  iconBg="bg-accent-green/20"
                  iconColor="text-[#8fc25a]"
                  title="Control de calidad aprobado"
                  subtitle="Lote #204 · hace 2 horas"
                />
              </div>

              {/* Ventana de app: producción semanal */}
              <motion.div
                className="rounded-xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] overflow-hidden shadow-lg flex-1 flex flex-col justify-between mt-auto"
                whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: '0 20px 34px -16px rgba(193,80,45,0.35)' }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              >
                <WindowChrome label="Producción" />
                <div className="px-3.5 pt-2.5 min-h-[44px] flex items-center justify-between">
                  <p className={`text-[11px] ${MUTED_ON_DARK}`}>Unidades esta semana</p>
                </div>
                <div className="h-[100px] w-full px-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={PRODUCCION_SEMANA}
                      margin={{ top: 14, right: 6, left: 6, bottom: 0 }}
                      barSize={16}
                    >
                      <defs>
                        <linearGradient id="aboutBarNeutral" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a3d97a" />
                          <stop offset="100%" stopColor="#4a6b2c" />
                        </linearGradient>
                        <linearGradient id="aboutBarHot" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fbd28a" />
                          <stop offset="50%" stopColor="#e8b23d" />
                          <stop offset="100%" stopColor="#c1502d" />
                        </linearGradient>
                        <filter id="aboutBarGlow" x="-60%" y="-60%" width="220%" height="220%">
                          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#e8b23d" floodOpacity="0.6" />
                        </filter>
                      </defs>
                      <XAxis
                        dataKey="dia"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tick={(props) => <DiaTick {...props} data={PRODUCCION_SEMANA} />}
                      />
                      <YAxis hide domain={[0, 'dataMax + 120']} />
                      <Tooltip
                        content={<ChartTooltip unit="unidades" />}
                        cursor={{ fill: 'rgba(232,178,61,0.08)' }}
                      />
                      <Bar
                        dataKey="unidades"
                        radius={[6, 6, 2, 2]}
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={1100}
                        animationEasing="ease-out"
                      >
                        {PRODUCCION_SEMANA.map((d) => (
                          <Cell
                            key={d.dia}
                            fill={d.destacada ? 'url(#aboutBarHot)' : 'url(#aboutBarNeutral)'}
                            filter={d.destacada ? 'url(#aboutBarGlow)' : undefined}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center pb-2.5 pt-1 mt-auto min-h-[38px] items-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-[#c9a97e]">
                    <span className="size-1.5 rounded-full bg-[#e8b23d] animate-pulse" />
                    Horneando en el asador…
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Columna 2: Cuidamos cada detalle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="flex flex-col h-full"
          >
            <div className="flex flex-col mb-4 lg:min-h-[128px]">
              <div className="flex items-center gap-2 mb-1.5">
                <ShieldCheck className="w-5 h-5 text-accent-green shrink-0" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Control de calidad</h3>
              </div>
              <p className="text-sm font-normal text-slate-600 leading-relaxed lg:min-h-[88px]">
                Cada lote se registra y aprueba antes de salir de la fábrica. Masarepas lo usa para
                que ningún lote llegue al cliente sin pasar por control de calidad.
              </p>
            </div>

            <div className="relative rounded-2xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] border border-white/10 p-4 overflow-hidden h-full flex-1 flex flex-col justify-between">
              <div>
                <ActivityCard
                  icon={Thermometer}
                  iconBg="bg-accent-gold/20"
                  iconColor="text-[#fbd28a]"
                  title="Temperatura del horno"
                  subtitle="Monitoreada cada hora · en rango"
                />
                <ActivityCard
                  icon={ClipboardCheck}
                  iconBg="bg-brand/20"
                  iconColor="text-brand-light"
                  title="Trazabilidad del lote"
                  subtitle="Registro completo · verificado"
                />
              </div>

              {/* Ventana de app: tendencia de calidad */}
              <motion.div
                className="rounded-xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] overflow-hidden shadow-lg flex-1 flex flex-col justify-between mt-auto"
                whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: '0 20px 34px -16px rgba(90,122,58,0.4)' }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              >
                <WindowChrome label="Calidad" />

                <div className="flex items-center justify-between gap-2 px-3.5 pt-2.5 min-h-[44px]">
                  <div>
                    <p className="text-[0.8rem] font-semibold text-[#fffbf0]">Vamos mejorando este mes</p>
                    <p className={`text-[10px] ${MUTED_ON_DARK}`}>% de lotes aprobados</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#5a7a3a]/25 px-2 py-0.5 text-[0.68rem] font-semibold text-[#a3d97a]">
                    <TrendingUp className="size-3" aria-hidden />
                    +{CALIDAD_DELTA} pts
                  </span>
                </div>

                <div className="relative h-[100px] w-full px-1 pt-1.5">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CALIDAD_SEMANA} margin={{ top: 12, right: 10, left: 6, bottom: 0 }}>
                      <defs>
                        <linearGradient id="aboutCalidadFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a3d97a" stopOpacity={0.5} />
                          <stop offset="60%" stopColor="#a3d97a" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#a3d97a" stopOpacity={0} />
                        </linearGradient>
                        <filter id="aboutDotGlow" x="-80%" y="-80%" width="260%" height="260%">
                          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#a3d97a" floodOpacity="0.85" />
                        </filter>
                      </defs>
                      <XAxis
                        dataKey="dia"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        tick={(props) => <DiaTick {...props} data={CALIDAD_SEMANA} />}
                      />
                      <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip
                        content={<ChartTooltip unit="% aprobados" decimals={1} />}
                        cursor={{ stroke: '#a3d97a', strokeOpacity: 0.35, strokeWidth: 1.5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="aprobados"
                        stroke="#a3d97a"
                        strokeWidth={2.5}
                        fill="url(#aboutCalidadFill)"
                        dot={false}
                        activeDot={{ r: 4.5, fill: '#a3d97a', stroke: '#1c0b03', strokeWidth: 2 }}
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={1400}
                        animationEasing="ease-out"
                      />
                      <ReferenceDot
                        x="Sáb"
                        y={99.2}
                        r={4.5}
                        fill="#a3d97a"
                        stroke="#1c0b03"
                        strokeWidth={2}
                        filter="url(#aboutDotGlow)"
                        isFront
                      />
                    </AreaChart>
                  </ResponsiveContainer>

                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.92 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: shouldReduceMotion ? 0 : 1.2 }}
                    className="pointer-events-none absolute right-1 top-0 flex flex-col items-center rounded-lg border border-[#a3d97a]/40 bg-[#1c0b03]/95 px-2 py-1 text-center shadow-[0_10px_20px_-6px_rgba(0,0,0,0.6)] backdrop-blur-sm"
                  >
                    <span className="text-[0.72rem] font-extrabold leading-none text-[#a3d97a]">99.2%</span>
                    <span className={`mt-0.5 text-[9px] leading-none ${MUTED_ON_DARK}`}>hoy</span>
                  </motion.div>
                </div>

                <div className="flex items-center justify-center gap-2 pb-2.5 pt-1 mt-auto min-h-[38px]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-[#5a7a3a]/20 px-3 py-1.5 text-[11px] text-[#8fc25a]">
                    <Sparkle className="size-3" aria-hidden />
                    Control de calidad al día
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Columna 3: Despacho */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="flex flex-col h-full"
          >
            <div className="flex flex-col mb-4 lg:min-h-[128px]">
              <div className="flex items-center gap-2 mb-1.5">
                <Truck className="w-5 h-5 text-accent-gold shrink-0" aria-hidden />
                <h3 className="text-lg font-bold text-slate-900">Despacho y logística</h3>
              </div>
              <p className="text-sm font-normal text-slate-600 leading-relaxed lg:min-h-[88px]">
                El módulo de pedidos conecta producción con entrega. Masarepas lo usa para saber,
                en todo momento, qué pedido está listo y cuál sigue en ruta.
              </p>
            </div>

            <div className="relative rounded-2xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] border border-white/10 p-4 overflow-hidden h-full flex-1 flex flex-col justify-between">
              <div>
                <ActivityCard
                  icon={Package}
                  iconBg="bg-brand/20"
                  iconColor="text-brand-light"
                  title="Pedidos despachados hoy"
                  subtitle="48 pedidos · a tiempo"
                />
                <ActivityCard
                  icon={Clock}
                  iconBg="bg-accent-green/20"
                  iconColor="text-[#8fc25a]"
                  title="Tiempo promedio de entrega"
                  subtitle="38 min · zona Medellín"
                />
              </div>

              {/* Ventana de app: pedidos a tiempo */}
              <motion.div
                className="rounded-xl bg-gradient-to-b from-[#2a1206] to-[#1c0b03] overflow-hidden shadow-lg flex-1 flex flex-col justify-between mt-auto"
                whileHover={shouldReduceMotion ? undefined : { y: -3, boxShadow: '0 20px 34px -16px rgba(232,178,61,0.4)' }}
                transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              >
                <WindowChrome label="Despacho" />
                <div className="px-3.5 pt-2.5 min-h-[44px] flex items-center justify-between">
                  <p className={`text-[11px] ${MUTED_ON_DARK}`}>Pedidos a tiempo hoy</p>
                </div>
                <div className="relative h-[100px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      data={DESPACHO_HOY}
                      innerRadius="72%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      barSize={10}
                    >
                      <defs>
                        <linearGradient id="despachoRadial" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fbd28a" />
                          <stop offset="100%" stopColor="#e8b23d" />
                        </linearGradient>
                        <filter id="despachoGlow" x="-60%" y="-60%" width="220%" height="220%">
                          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#e8b23d" floodOpacity="0.55" />
                        </filter>
                      </defs>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar
                        dataKey="value"
                        cornerRadius={20}
                        background={{ fill: 'rgba(255,255,255,0.06)' }}
                        fill="url(#despachoRadial)"
                        filter="url(#despachoGlow)"
                        isAnimationActive={!shouldReduceMotion}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      />
                      <Tooltip content={<ChartTooltip unit="% a tiempo" />} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.9 }}
                    className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <span className="text-lg font-extrabold leading-none text-[#fbd28a]">94%</span>
                    <span className={`mt-0.5 text-[9px] leading-none ${MUTED_ON_DARK}`}>a tiempo</span>
                  </motion.div>
                </div>
                <div className="flex justify-center pb-2.5 pt-1 mt-auto min-h-[38px] items-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-[#c9a97e]">
                    <span className="size-1.5 rounded-full bg-[#e8b23d] animate-pulse" />
                    2 rutas activas ahora
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
