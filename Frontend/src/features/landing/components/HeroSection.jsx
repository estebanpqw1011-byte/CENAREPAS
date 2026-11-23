import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useConfiguracion } from '../../../shared/contexts/ConfiguracionContext';
import defaultBasketImage from '../assets/arepas-basket.png';
import defaultVideoPoster from '../assets/hero-kneading-poster.webp';

export function HeroSection() {
  const { nombreProyecto, bannerImages, heroVideoUrl } = useConfiguracion();
  const videoRef = useRef(null);

  const showVideo = Boolean(heroVideoUrl);
  const fallbackImage = bannerImages && bannerImages.length > 0 ? bannerImages[0].url : defaultBasketImage;

  useEffect(() => {
    if (showVideo && videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    }
  }, [showVideo, heroVideoUrl]);

  return (
    <section
      id="inicio"
      className="relative w-full min-h-screen flex flex-col justify-end overflow-hidden bg-[var(--landing-cine)]"
    >
      <div className="absolute inset-0 w-full h-full overflow-hidden bg-[var(--landing-cine)]">
        {showVideo ? (
          <video
            ref={videoRef}
            key={heroVideoUrl}
            src={heroVideoUrl}
            poster={defaultVideoPoster}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover scale-[1.02] transform transition-transform duration-1000 ease-out"
          />
        ) : (
          <img
            src={fallbackImage}
            alt={nombreProyecto}
            className="w-full h-full object-cover scale-[1.02]"
          />
        )}
      </div>

      {/* ─── ZONA 1: Overlay Sutil de Legibilidad para el Video (15-20% opacidad) ─── */}
      <div className="absolute inset-0 bg-black/15 pointer-events-none z-0" />
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to right, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.1) 50%, transparent 100%)'
        }}
      />


      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pb-10 sm:pb-12 lg:pb-16">
        <div className="max-w-xl flex flex-col items-start text-left">

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 shadow-sm transition-all duration-200 cursor-default select-none"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8B23D] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8B23D]"></span>
            </span>
            <span className="landing-eyebrow text-[#FFFBF0] italic font-serif tracking-wide">
              • Sistema de gestión • <span className="not-italic font-sans">para fábricas de alimentos</span>
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="landing-display text-3xl sm:text-4xl md:text-5xl lg:text-[3.1rem] font-bold text-white mb-3 drop-shadow-sm"
          >
            <span className="block font-sans font-bold text-white">
              Gestiona tu <span className="landing-accent-serif font-normal text-[#FDF5E2]">fábrica</span>
            </span>
            <span className="block font-sans font-bold text-[#FDF5E2] text-[0.95em] tracking-tight mt-1">
              de principio a fin
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="text-[#FFFBF0]/85 text-sm sm:text-[15px] font-normal max-w-lg leading-relaxed mb-6"
          >
            CENAREPAS centraliza pedidos, producción, inventario y ventas de tu fábrica de alimentos
            en un solo sistema — con Masarepas, una fábrica de arepas real, como <span className="landing-accent-serif text-[#FDF5E2]">caso de uso</span>.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-wrap items-center gap-3.5"
          >
            <a
              href="#contacto"
              className="inline-flex items-center justify-between gap-2.5 pl-5 pr-2 py-2 rounded-full bg-[#C1502D] hover:bg-[#8A3418] text-white font-semibold text-xs tracking-wide shadow-md shadow-[#C1502D]/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 group cursor-pointer"
            >
              <span>Solicitar demo</span>
              <span className="w-6 h-6 rounded-full bg-white text-[#C1502D] flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5 shadow-xs">
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </span>
            </a>

            <a
              href="#nosotros"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-[#FFFBF0] hover:text-white font-medium text-xs tracking-wide backdrop-blur-md border border-white/20 shadow-sm hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Ver el sistema en acción</span>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.45 }}
            className="flex flex-wrap items-center gap-5 mt-6 pt-4 border-t border-white/15 text-[11px] text-white/85 font-medium"
          >
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A7A3A]" />
              <span>Pedidos en tiempo real</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#E8B23D]" />
              <span>Producción trazable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5A7A3A]" />
              <span>Reportes automáticos</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}