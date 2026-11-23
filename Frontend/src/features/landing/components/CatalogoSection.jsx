import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, LayoutGrid, ShoppingBasket, ShoppingCart, CircleCheckBig } from 'lucide-react';

/** El flujo del catálogo público, igual que en la app: categorías → carrito → pedido. */
const PASOS = [
  {
    icon: LayoutGrid,
    titulo: 'Elige una categoría',
    texto: 'Nuestras líneas de arepas, organizadas para que encuentres la tuya rápido.',
    color: 'bg-brand/10 text-brand',
  },
  {
    icon: ShoppingCart,
    titulo: 'Arma tu carrito',
    texto: 'Suma, quita y ajusta cantidades; tu carrito te acompaña mientras exploras.',
    color: 'bg-accent-gold/20 text-[#8A5A14]',
  },
  {
    icon: CircleCheckBig,
    titulo: 'Confirma tu pedido',
    texto: 'Inicia sesión o crea tu cuenta solo al final, para confirmar la entrega.',
    color: 'bg-accent-green/15 text-accent-green',
  },
];

/**
 * Invitación al catálogo público (/catalogo). Ocupa el lugar de la antigua
 * sección de productos y conserva su fondo (tint-gold), el mismo de
 * Estadísticas: entre las dos no hay costura. Usa la paleta fija de la
 * landing, que no cambia con el tema.
 */
export function CatalogoSection() {
  const reducir = useReducedMotion();
  const aparecer = (retraso = 0) =>
    reducir
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.55, delay: retraso, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <section
      id="catalogo"
      className="relative overflow-hidden bg-[var(--landing-tint-gold)] py-16 text-slate-900 sm:py-24"
    >
      {/* Decoración: halos radiales que se desvanecen solos hasta alfa 0 antes de su
          propio borde (closest-side) y quedan dentro del alto de la sección, así el
          overflow no los recorta en línea recta. Sin blur ni imágenes. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-40 top-1/2 size-[30rem] -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(193,80,45,0.10),rgba(193,80,45,0))]"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/2 size-[28rem] -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(232,178,61,0.18),rgba(232,178,61,0))]"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8">
        <motion.div {...aparecer()} className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-brand">
            <ShoppingBasket className="size-3.5" aria-hidden />
            <span className="landing-eyebrow">Catálogo en línea</span>
          </span>

          <h2 className="landing-heading mt-4 text-3xl font-bold text-slate-900 sm:text-4xl md:text-5xl">
            Antójate de arepas
            <span className="landing-accent-serif mt-1 block font-normal text-brand">
              recién hechas
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0">
            Explora nuestras líneas de arepas por categoría, arma tu carrito a tu ritmo y haz tu pedido
            cuando estés listo.
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
            <motion.div
              whileHover={reducir ? undefined : { scale: 1.03, y: -2 }}
              whileTap={reducir ? undefined : { scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 26 }}
            >
              <Link
                to="/catalogo"
                className="group inline-flex items-center gap-3 rounded-full bg-[#C1502D] py-3 pl-8 pr-3 text-base font-bold text-white shadow-lg shadow-[#C1502D]/30 transition-colors hover:bg-[#A83F1D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B23D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fdf3dc] sm:text-lg"
              >
                <span>Ir al catálogo</span>
                <span className="relative grid size-9 place-items-center overflow-hidden rounded-full bg-white text-[#C1502D] shadow-xs">
                  <ArrowRight
                    className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-6"
                    aria-hidden="true"
                  />
                  <ArrowRight
                    className="absolute size-4 -translate-x-6 transition-transform duration-300 ease-out group-hover:translate-x-0"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </motion.div>
            <p className="text-sm text-slate-600">No necesitas iniciar sesión para explorar.</p>
          </div>
        </motion.div>

        <ol className="grid gap-4" aria-label="Cómo pedir desde el catálogo">
          {PASOS.map((paso, i) => {
            const Icono = paso.icon;
            return (
              <motion.li
                key={paso.titulo}
                {...aparecer(0.08 * (i + 1))}
                className="flex items-start gap-4 rounded-2xl border border-[#e8dcc0] bg-white p-5 shadow-[0_10px_25px_-12px_rgba(61,42,23,0.18)]"
              >
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${paso.color}`}>
                  <Icono className="size-6" aria-hidden />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#78633f]">Paso {i + 1}</p>
                  <h3 className="mt-0.5 text-lg font-bold leading-snug text-slate-900">{paso.titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{paso.texto}</p>
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default CatalogoSection;
