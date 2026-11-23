import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Layers, ShieldCheck, Zap, Laptop, ArrowUpRight } from 'lucide-react';
import { SectionTransition } from './SectionTransition';

export function CTASection() {
  return (
    <section className="relative py-20 sm:py-24 bg-[#fffbf0] text-slate-900 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Tarjeta Cinematográfica Principal (Flotante Tech sobre Fondo Claro) */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] bg-gradient-to-br from-[#1e0e07] via-[#160803] to-[#0c0402] p-8 sm:p-14 lg:p-16 text-center border border-white/15 shadow-[0_25px_70px_-15px_rgba(25,12,6,0.35),0_0_0_1px_rgba(255,255,255,0.06)] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent"
        >
          {/* Resplandor ambiental de marca multicapa */}
          <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 size-96 rounded-full bg-[radial-gradient(circle,rgba(193,80,45,0.35)_0%,transparent_70%)] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-20 size-80 rounded-full bg-[radial-gradient(circle,rgba(232,178,61,0.2)_0%,transparent_70%)] blur-3xl" />

          <div className="relative z-10 max-w-2xl mx-auto">
            
            {/* Eyebrow Pill */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-white/90 backdrop-blur-md mb-5 shadow-xs"
            >
              <Sparkles className="size-3.5 text-accent-gold" />
              <span className="landing-eyebrow text-accent-gold">Digitalización de Fábricas</span>
            </motion.div>

            {/* Titular Disciplinado Enfocado en el SOFTWARE */}
            <h2 className="landing-heading text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              ¿Listo para digitalizar
              <span className="block font-sans font-bold text-[#fbd28a] text-[0.95em] mt-1.5">
                tu fábrica de alimentos?
              </span>
            </h2>

            {/* Párrafo Descriptivo */}
            <p className="mx-auto mt-5 max-w-xl text-sm sm:text-base text-[#fffbf0]/80 leading-relaxed font-normal">
              Reemplaza hojas de cálculo y registros en papel por un sistema centralizado en tiempo real. Controla pedidos, producción, inventario y despacho desde una sola pantalla.
            </p>

            {/* Botones de Acción Pill de Alto Nivel */}
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5 sm:gap-4">
              
              {/* Botón Principal Pill: Solicitar Demo */}
              <motion.a
                href="#contacto"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="group inline-flex items-center gap-2.5 rounded-full bg-[#c1502d] hover:bg-[#a83f1d] py-2.5 pr-2.5 pl-6 text-xs sm:text-sm font-bold text-white shadow-lg shadow-[#c1502d]/30 transition-all cursor-pointer"
              >
                <span>Solicitar demo gratuita</span>
                <span className="relative grid size-7 place-items-center overflow-hidden rounded-full bg-white text-[#c1502d] shadow-xs">
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

              {/* Botón Secundario Ghost Pill: Ver el Sistema */}
              <motion.a
                href="#ventajas"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] hover:bg-white/[0.15] px-6 py-3 text-xs sm:text-sm font-semibold text-[#fffbf0] hover:text-white shadow-sm backdrop-blur-md transition-all cursor-pointer"
              >
                <Laptop className="size-4 text-accent-gold" aria-hidden="true" />
                <span>Ver el sistema en acción</span>
              </motion.a>
            </div>

            {/* Micro-Badges de Valor Inferiores */}
            <div className="mt-10 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                <Zap className="size-4 text-accent-gold shrink-0" />
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">+10 Módulos</h4>
                  <p className="text-[10px] text-white/85">Listos para tu planta</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                <Layers className="size-4 text-brand-light shrink-0" />
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">Implementación</h4>
                  <p className="text-[10px] text-white/85">Sin frenar tu operación</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white/[0.02] border border-white/5 p-2.5">
                <ShieldCheck className="size-4 text-[#8fc25a] shrink-0" />
                <div>
                  <h4 className="text-[11px] font-bold text-white leading-tight">100% Trazable</h4>
                  <p className="text-[10px] text-white/85">Lote a lote en vivo</p>
                </div>
              </div>
            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
}

