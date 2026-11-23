import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageCircle, Mail, MapPin, Send, Check, Copy, CheckCheck,
  Clock, Sparkles, Truck, ShieldCheck, ArrowRight, Store, Factory,
  User, Package, CircleDot, Disc, Wheat, Laptop
} from 'lucide-react';
import contactImage from '../assets/arepas-contact.png';

const QUICK_TOPICS = [
  {
    id: 'mayor',
    label: 'Pedido al por mayor',
    icon: Package,
    prompt: 'Hola María, me gustaría cotizar un pedido al por mayor de arepas para mi negocio/supermercado.',
  },
  {
    id: 'amarillas',
    label: 'Arepas Amarillas (Tela / Media Tela)',
    icon: CircleDot,
    iconColor: 'text-[#e8b23d]',
    prompt: 'Hola, quisiera hacer un pedido de Arepas Amarillas en presentación tela/media tela.',
  },
  {
    id: 'blancas',
    label: 'Arepas Blancas',
    icon: Disc,
    iconColor: 'text-slate-400',
    prompt: 'Hola, quisiera hacer un pedido de paquetes de Arepas Blancas de maíz.',
  },
  {
    id: 'chocolo',
    label: 'Arepas de Chócolo',
    icon: Wheat,
    iconColor: 'text-[#5a7a3a]',
    prompt: 'Hola, quisiera pedir paquetes de Arepas de Chócolo tradicionales.',
  },
  {
    id: 'demo',
    label: 'Demo del Sistema CENAREPAS',
    icon: Laptop,
    iconColor: 'text-brand',
    prompt: 'Hola equipo CENAREPAS, me interesa agendar una demostración del software de gestión para fábricas de alimentos.',
  },
];

const LOCATIONS = [
  {
    name: 'Sede de Producción (Planta Principal)',
    role: 'Amasado, Asado y Abastecimiento Diario',
    address: 'Bello Oriente, Medellín, Colombia',
    hours: 'Lun – Sáb: 5:00 AM – 4:00 PM',
    status: 'Producción diaria activa',
    icon: Factory,
  },
  {
    name: 'Sede de Ventas & Distribución',
    role: 'Venta al detal y despacho mayorista (800 - 1.000 pqts/día)',
    address: 'Calle 89 #51-86, Barrio Aranjuez, Medellín',
    hours: 'Lun – Sáb: 6:00 AM – 6:00 PM',
    status: 'Despachos activos',
    icon: Store,
  },
];

export function ContactSection() {
  const [status, setStatus] = useState('idle'); // idle | sending | sent
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', message: '' });
  const [copiedField, setCopiedField] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTopicClick = (topic) => {
    if (activeTopic === topic.id) {
      setActiveTopic(null);
    } else {
      setActiveTopic(topic.id);
      setFormData((prev) => ({
        ...prev,
        message: prev.message ? `${prev.message}\n${topic.prompt}` : topic.prompt,
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setTimeout(() => {
      setStatus('sent');
      setFormData({ name: '', email: '', phone: '', message: '' });
      setActiveTopic(null);
    }, 1200);
  };

  return (
    <section id="contacto" className="relative py-16 sm:py-24 bg-[#fffbf0] text-slate-900 overflow-hidden">
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ─── Encabezado Principal de Contacto ─── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mb-16 sm:mb-20 text-left"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3.5 py-1 text-brand">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            <span className="landing-eyebrow">Contacto & Pedidos</span>
          </span>
          <h2 className="landing-heading text-3xl sm:text-4xl md:text-5xl lg:text-[3.2rem] font-bold text-slate-900 mt-4 tracking-tight">
            Hablemos de tu fábrica
            <span className="block font-sans font-bold text-brand text-[0.92em] mt-1">
              o haz tu pedido hoy mismo
            </span>
          </h2>
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed mt-4 max-w-2xl">
            Llevamos la tradición artesanal directamente a tu puerta o a tu negocio. Escríbenos para pedidos al por mayor, distribución a restaurantes o para digitalizar tu fábrica con CENAREPAS.
          </p>

          {/* Badges de Confianza Rápidos */}
          <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-[#e8dcc0]">
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 border border-[#e8dcc0] px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs">
              <Clock className="size-3.5 text-brand" />
              <span>Respuesta en &lt; 15 min</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 border border-[#e8dcc0] px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs">
              <Truck className="size-3.5 text-accent-green" />
              <span>Despacho diario en Medellín</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 border border-[#e8dcc0] px-3 py-1 text-xs font-semibold text-slate-700 shadow-xs">
              <ShieldCheck className="size-3.5 text-accent-gold" />
              <span>Garantía de calidad artesanal</span>
            </div>
          </div>
        </motion.div>

        {/* ─── Grid Principal: Hub de Canales (Izq) + Concierge de Formulario (Der) ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">

          {/* ══════════ COLUMNA IZQUIERDA (5 columnas): Canales Directos & Sedes ══════════ */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. Tarjeta Destacada de WhatsApp Directo */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -3 }}
              className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c0d06] via-[#150803] to-[#0c0402] p-6 sm:p-7 text-white shadow-xl shadow-black/10 border border-white/10"
            >
              <div className="absolute -right-8 -bottom-8 size-40 rounded-full bg-[#5a7a3a]/25 blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-10 items-center justify-center rounded-2xl bg-[#5a7a3a]/30 border border-[#5a7a3a]/50 text-[#a3d97a]">
                    <MessageCircle className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-extrabold text-white">WhatsApp Directo</h3>
                    <p className="text-xs text-[#fffbf0]/60">Atención inmediata a pedidos</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5a7a3a]/25 border border-[#5a7a3a]/40 px-2.5 py-0.5 text-[10px] font-semibold text-[#a3d97a]">
                  <span className="size-1.5 rounded-full bg-[#8fc25a] animate-pulse" />
                  En línea
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#fffbf0]/80 leading-relaxed mb-5">
                ¿Prefieres pedir por chat o necesitas cotización urgente? Escríbenos directamente y te confirmamos disponibilidad al instante.
              </p>

              <a
                href="https://wa.me/573113482845?text=Hola%20Mar%C3%ADa,%20me%20gustar%C3%ADa%20hacer%20un%20pedido%20o%20conocer%20m%C3%A1s%20del%20sistema%20CENAREPAS"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#5a7a3a] hover:bg-[#4a6b2c] text-white py-3 px-5 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-md shadow-[#5a7a3a]/25 group-hover:shadow-lg cursor-pointer"
              >
                <span>Chatear por WhatsApp (+57 311 348 2845)</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
            </motion.div>

            {/* 2. Tarjetas Rápidas de Teléfono y Correo con Botón de Copiado */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              
              {/* Teléfono */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="rounded-2xl border border-[#e8dcc0] bg-white/90 p-4.5 shadow-xs transition-all hover:border-brand/40 hover:shadow-md flex flex-col justify-between h-full w-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Phone className="size-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('+57 311 348 2845', 'phone')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand transition-colors cursor-pointer"
                      title="Copiar teléfono"
                    >
                      {copiedField === 'phone' ? (
                        <span className="flex items-center gap-1 text-accent-green font-bold">
                          <CheckCheck className="size-3" /> Copiado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="size-3" /> Copiar
                        </span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 min-h-[32px] flex items-center">Línea de Atención (María Quintero)</p>
                </div>
                <a href="tel:+573113482845" className="text-sm font-bold text-slate-900 hover:text-brand transition-colors block mt-2">
                  +57 311 348 2845
                </a>
              </motion.div>

              {/* Correo */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.12 }}
                className="rounded-2xl border border-[#e8dcc0] bg-white/90 p-4.5 shadow-xs transition-all hover:border-brand/40 hover:shadow-md flex flex-col justify-between h-full w-full"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex size-8 items-center justify-center rounded-xl bg-accent-gold/15 text-[#8a5a14]">
                      <Mail className="size-4" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('estebanpqw1011@gmail.com', 'email')}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand transition-colors cursor-pointer"
                      title="Copiar correo"
                    >
                      {copiedField === 'email' ? (
                        <span className="flex items-center gap-1 text-accent-green font-bold">
                          <CheckCheck className="size-3" /> Copiado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Copy className="size-3" /> Copiar
                        </span>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 min-h-[32px] flex items-center">Correo Electrónico</p>
                </div>
                <a href="mailto:estebanpqw1011@gmail.com" className="text-xs font-bold text-slate-900 hover:text-brand transition-colors block mt-2 truncate">
                  estebanpqw1011@gmail.com
                </a>
              </motion.div>

            </div>

            {/* 3. Puntos de Fábrica & Sucursales en Medellín */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="rounded-3xl border border-[#e8dcc0] bg-white/85 p-5 sm:p-6 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#e8dcc0]/70">
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-brand" />
                  <h4 className="text-sm font-bold text-slate-900">Puntos de Fábrica en Medellín</h4>
                </div>
                <span className="text-[11px] font-medium text-slate-500">2 ubicaciones</span>
              </div>

              <div className="space-y-3.5">
                {LOCATIONS.map((loc) => {
                  const LocIcon = loc.icon;
                  return (
                    <div
                      key={loc.name}
                      className="group rounded-2xl border border-[#e8dcc0]/60 bg-[#fffbf0]/60 p-3.5 transition-all hover:bg-white hover:border-brand/30 hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand mt-0.5">
                            <LocIcon className="size-4" />
                          </span>
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 group-hover:text-brand transition-colors">
                              {loc.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{loc.address}</p>
                            <p className="text-[10.5px] text-slate-600 mt-1">{loc.hours}</p>
                          </div>
                        </div>

                        <span className="shrink-0 rounded-full bg-accent-green/15 border border-accent-green/25 px-2 py-0.5 text-[9.5px] font-semibold text-accent-green">
                          {loc.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

          </div>

          {/* ══════════ COLUMNA DERECHA (7 columnas): Terminal Concierge de Pedido ══════════ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-7"
          >
            <div className="relative rounded-3xl border border-[#e8dcc0] bg-white/95 p-6 sm:p-9 shadow-[0_20px_50px_-15px_rgba(45,20,10,0.08)] backdrop-blur-md">
              
              {/* Resplandor decorativo sutil en la esquina */}
              <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand/10 blur-3xl" />

              <div className="relative z-10">
                
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Envíanos un mensaje o solicitud
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                      Elige un tema rápido o escribe tu mensaje detallado a continuación.
                    </p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-2xl bg-[#fffbf0] border border-[#e8dcc0] text-brand">
                    <Sparkles className="size-4.5" />
                  </span>
                </div>

                {/* Chips de selección rápida de tema */}
                <div className="mb-6">
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2.5">
                    ¿Sobre qué te gustaría consultar? (opcional)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_TOPICS.map((topic) => {
                      const isSelected = activeTopic === topic.id;
                      const TopicIcon = topic.icon;
                      return (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleTopicClick(topic)}
                          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-brand text-white shadow-xs border border-brand scale-102'
                              : 'bg-[#fffbf0] text-slate-700 border border-[#e8dcc0] hover:border-brand/40 hover:bg-white'
                          }`}
                        >
                          <TopicIcon className={`size-3.5 ${isSelected ? 'text-white' : (topic.iconColor || 'text-brand')}`} />
                          <span>{topic.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Tu nombre completo <span className="text-brand">*</span>
                      </label>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ej. Juan Pérez"
                          className="w-full rounded-2xl border border-[#e8dcc0] bg-[#fffbf0]/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Teléfono / WhatsApp */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Teléfono / WhatsApp
                      </label>
                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+57 300 000 0000"
                          className="w-full rounded-2xl border border-[#e8dcc0] bg-[#fffbf0]/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Correo Electrónico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Correo electrónico <span className="text-brand">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="tucorreo@empresa.com"
                        className="w-full rounded-2xl border border-[#e8dcc0] bg-[#fffbf0]/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Mensaje / Pedido */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mensaje o detalle del pedido <span className="text-brand">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="¿Qué productos necesitas, qué cantidad o qué dudas tienes sobre CENAREPAS?"
                        className="w-full rounded-2xl border border-[#e8dcc0] bg-[#fffbf0]/50 p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Banner de Estado Enviado */}
                  <AnimatePresence>
                    {status === 'sent' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="rounded-2xl border border-accent-green/30 bg-accent-green/10 p-3.5 text-xs text-accent-green font-bold flex items-center gap-2"
                      >
                        <Check className="size-4" />
                        <span>¡Mensaje enviado con éxito! Nos comunicaremos contigo en menos de 15 minutos.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Botón de Enviar */}
                  <motion.button
                    type="submit"
                    disabled={status === 'sending'}
                    whileHover={{ scale: status === 'idle' ? 1.015 : 1, y: -1 }}
                    whileTap={{ scale: 0.985 }}
                    className="w-full rounded-full bg-brand hover:bg-brand-dark text-white font-bold py-3.5 px-6 shadow-md shadow-brand/20 transition-all flex items-center justify-center gap-2.5 text-xs sm:text-sm tracking-wide cursor-pointer disabled:opacity-75"
                  >
                    {status === 'sending' && (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                        className="size-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    )}
                    {status === 'sent' && <Check className="size-4.5" />}
                    {status === 'idle' && <Send className="size-4.5" />}
                    <span>
                      {status === 'sending' ? 'Enviando solicitud…' : status === 'sent' ? 'Solicitud Enviada' : 'Enviar Solicitud'}
                    </span>
                  </motion.button>
                </form>

                {/* Cinta fotográfica inferior con imagen real */}
                <div className="mt-7 pt-6 border-t border-[#e8dcc0] flex items-center gap-4">
                  <div className="size-14 shrink-0 overflow-hidden rounded-2xl border border-[#e8dcc0] bg-[#f5ecd8]">
                    <img
                      src={contactImage}
                      alt="Arepas frescas recién hechas"
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Arepas Frescas Artesanales</h5>
                    <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                      100% maíz natural sin conservantes, empacadas y trazadas lote a lote en Medellín.
                    </p>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>

        </div>

      </div>
    </section>
  );
}

