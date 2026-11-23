import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ClipboardCheck, Factory, ShieldCheck } from 'lucide-react';
import arepaImage from '../assets/arepa-amarilla.png';
import arepasX5Image from '../assets/arepas-x5.png';
import arepasX10Image from '../assets/arepas-x10.png';
import arepasYellowX5Image from '../assets/arepas-amarillas-x5.png';

/**
 * Catálogo de Masarepas tal como vive en el módulo de Productos de CENAREPAS.
 * No es una vitrina de venta: cada tarjeta muestra línea, lote y producción,
 * no precio — ver PRODUCT.md "Positioning Correction".
 */
const PRODUCTOS = [
  {
    id: 'arepa-amarilla',
    name: 'Arepa Amarilla (Tela / Media Tela)',
    linea: 'amarilla',
    lineaLabel: 'Variedad Amarilla',
    tag: { type: 'produccion', icon: Factory, label: 'Producción diaria', value: '1.240 unidades' },
    description: 'Presentaciones tela, media tela y extragrande. Maíz amarillo seleccionado y amasado a diario.',
    image: arepaImage,
    alt: 'Dos arepas amarillas asadas con mantequilla derretida, servidas junto a una mazorca de maíz fresco',
    rotate: -3,
    lift: 0,
  },
  {
    id: 'arepas-blancas',
    name: 'Arepas Blancas',
    linea: 'blanca',
    lineaLabel: 'Variedad Blanca',
    tag: { type: 'lote', icon: ClipboardCheck, label: 'Lote', value: '#204 · hace 2 horas', approved: true },
    description: 'Presentación única tradicional de maíz blanco con control de calidad aprobado antes de salir.',
    image: arepasX5Image,
    alt: 'Cinco arepas blancas apiladas en un plato, con mantequilla y un cuchillo al lado',
    rotate: 2,
    lift: 26,
  },
  {
    id: 'arepa-chocolo',
    name: 'Arepa de Chócolo',
    linea: 'chocolo',
    lineaLabel: 'Variedad Chócolo',
    tag: { type: 'produccion', icon: Factory, label: 'Producción diaria', value: '520 unidades' },
    description: 'Elaborada con maíz tierno dulce en presentación única, trazada en tiempo real en CENAREPAS.',
    image: arepasX10Image,
    alt: 'Arepa de chócolo empacada con etiqueta de trazabilidad del lote',
    rotate: -2,
    lift: 0,
  },
  {
    id: 'arepas-amarillas-x5',
    name: 'Arepas Amarillas (Extragrande)',
    linea: 'amarilla',
    lineaLabel: 'Variedad Amarilla',
    tag: { type: 'lote', icon: ClipboardCheck, label: 'Lote', value: '#187 · empacado hoy', approved: true },
    description: 'Formato especial para tiendas, supermercados y restaurantes, sincronizado con Ventas y Pedidos.',
    image: arepasYellowX5Image,
    alt: 'Cinco arepas amarillas asadas apiladas en un plato, junto a un bowl con queso desmenuzado',
    rotate: 3,
    lift: 26,
  },
];

const LINEA_BADGE_CLASSES = {
  amarilla: 'bg-[var(--landing-badge-gold-bg)] text-[var(--landing-badge-gold-text)]',
  blanca: 'bg-brand/10 text-brand-dark',
  chocolo: 'bg-accent-green/15 text-accent-green',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
};

function cardVariants(rotate) {
  return {
    hidden: { opacity: 0, y: 40, scale: 0.94, rotate: rotate * 2.6 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate,
      transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
    },
  };
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

export function ProductsSection() {
  const shouldReduceMotion = useReducedMotion();
  const isDesktop = useIsDesktop();
  const scattered = isDesktop && !shouldReduceMotion;

  return (
    <section id="productos" className="relative py-24 sm:py-32 bg-[var(--landing-tint-gold)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mb-16"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-brand">
            <Factory className="size-3.5" aria-hidden />
            <span className="landing-eyebrow">Masarepas en CENAREPAS</span>
          </span>
          <h2 className="landing-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mt-4">
            Así ve Masarepas su catálogo,
            <span className="block font-sans font-bold text-brand text-[0.9em] mt-1">
              lote a lote, dentro del sistema.
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mt-4">
            Cada arepa que produce Masarepas queda registrada en el módulo de Productos de
            CENAREPAS, con su línea, su lote y su producción diaria al día — sin hojas de cálculo sueltas.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          className="grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
        >
          {PRODUCTOS.map((product) => {
            const TagIcon = product.tag.icon;
            const restRotate = scattered ? product.rotate : 0;
            const restLift = scattered ? product.lift : 0;

            return (
              <motion.article
                key={product.id}
                variants={cardVariants(restRotate)}
                style={{ marginTop: restLift }}
                whileHover={
                  shouldReduceMotion
                    ? undefined
                    : { rotate: 0, y: restLift - 8, scale: 1.03 }
                }
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                className="group relative flex flex-col rounded-2xl bg-white border border-[#e8dcc0] p-3 pb-5 shadow-[0_10px_25px_-8px_rgba(45,20,10,0.08)] hover:shadow-xl hover:border-brand/30 transition-all duration-300 h-full w-full"
              >
                {/* Cinta de washi tape cálida */}
                <span
                  aria-hidden
                  className="absolute -top-2.5 left-1/2 h-5 w-14 -translate-x-1/2 -rotate-2 rounded-[2px] bg-accent-gold/40 border border-accent-gold/60 shadow-xs"
                />

                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#f5ecd8] shrink-0">
                  <img
                    src={product.image}
                    alt={product.alt}
                    width="480"
                    height="600"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    className={`absolute left-2.5 top-2.5 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-xs ${LINEA_BADGE_CLASSES[product.linea]}`}
                  >
                    {product.lineaLabel}
                  </span>
                </div>

                <div className="px-1.5 pt-3.5 text-center flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 min-h-[56px] flex items-center justify-center leading-snug">{product.name}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3 min-h-[48px]">{product.description}</p>
                  </div>

                  <div className="mt-auto pt-3 inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-full border border-[#e8dcc0] bg-[#fffbf0] px-3 py-1.5 text-[11px] font-semibold text-slate-800 self-center">
                    <TagIcon className="size-3.5 shrink-0 text-brand" aria-hidden />
                    <span className="text-slate-500 font-medium">{product.tag.label}:</span>
                    <span>{product.tag.value}</span>
                    {product.tag.approved ? (
                      <ShieldCheck className="size-3.5 shrink-0 text-accent-green" aria-hidden />
                    ) : null}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

      </div>
    </section>
  );
}
