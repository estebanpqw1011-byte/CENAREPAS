import React from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Wheat, Store, Users } from 'lucide-react';
import { SectionTransition } from './SectionTransition';

const STATS = [
  { icon: CalendarClock, value: '800–1.000', label: 'Paquetes diarios comercializados en Aranjuez' },
  { icon: Wheat, value: '3', label: 'Variedades de maíz (Amarilla, Blanca, Chócolo)' },
  { icon: Store, value: '2', label: 'Sedes conectadas (Bello Oriente y Aranjuez)' },
  { icon: Users, value: '100%', label: 'Trazabilidad de lotes, recetas e insumos' },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export function StatsSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--landing-tint-gold)] py-14 sm:py-16">
      {/* ─── Unión fluida entre Nosotros (#fffbf0) y Estadísticas (tint-gold) ─── */}
      <SectionTransition from="#fffbf0" to="var(--landing-tint-gold)" height="h-12 sm:h-14" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          className="grid grid-cols-2 gap-8 lg:grid-cols-4 lg:divide-x lg:divide-brand/15 items-stretch"
        >
          {STATS.map(({ icon: Icon, value, label }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              className="flex flex-col items-center gap-2.5 text-center lg:px-6 h-full justify-start"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand shrink-0">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="text-3xl font-extrabold tracking-tight text-brand-dark sm:text-4xl min-h-[44px] flex items-center justify-center">
                {value}
              </span>
              <span className="max-w-[14rem] text-sm font-medium leading-snug text-slate-600 mt-auto">
                {label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
