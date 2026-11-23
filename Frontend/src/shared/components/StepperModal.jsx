import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, AlertCircle, Save } from 'lucide-react';

/**
 * StepperModal - Componente Base Reutilizable para Modales con Dimensiones Fijas
 * y Navegación por Pasos (Wizard / Stepper).
 *
 * @param {boolean} isOpen - Estado de visibilidad del modal
 * @param {function} onClose - Función para cerrar el modal
 * @param {string} category - Etiqueta superior / Eyebrow (ej. "CONFIGURACIÓN", "COMPRAS")
 * @param {string} title - Título principal del modal
 * @param {string} subtitle - Descripción corta bajo el título
 * @param {Array} steps - Array de pasos: [{ id, title, description, content, validate }]
 * @param {number} currentStep - Paso activo (opcional si es controlado externamente)
 * @param {function} onStepChange - Callback al cambiar de paso
 * @param {function} onSubmit - Callback al enviar el formulario final
 * @param {boolean} isLoading - Estado de carga / guardando
 * @param {string} submitLabel - Texto del botón de envío final (ej. "Guardar", "Guardar Cambios")
 * @param {string} mode - Modo: 'create' | 'edit' | 'view'
 * @param {boolean} isDirty - Indica si hay cambios sin guardar para pedir confirmación al cerrar
 * @param {string} size - Clase de ancho si se requiere ajuste especial (por defecto max-w-[740px])
 */
export function StepperModal({
  isOpen,
  onClose,
  category = 'GESTIÓN',
  title = 'Formulario',
  subtitle = '',
  steps = [],
  currentStep: controlledStep,
  onStepChange,
  onSubmit,
  isLoading = false,
  submitLabel = 'Guardar',
  mode = 'create',
  isDirty = false,
  size = 'max-w-[740px]',
}) {
  const [internalStep, setInternalStep] = useState(0);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [stepError, setStepError] = useState('');
  const shouldReduceMotion = useReducedMotion();
  const modalRef = useRef(null);

  const isControlled = controlledStep !== undefined;
  const activeStep = isControlled ? controlledStep : internalStep;
  const totalSteps = steps.length || 1;
  const isLastStep = activeStep === totalSteps - 1;
  const isFirstStep = activeStep === 0;
  const isViewMode = mode === 'view';

  // Resetear al abrir o cerrar
  useEffect(() => {
    if (isOpen) {
      if (!isControlled) setInternalStep(0);
      setStepError('');
      setShowConfirmClose(false);
    }
  }, [isOpen, isControlled]);

  // Manejador de tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty]);

  if (!isOpen) return null;

  const currentStepData = steps[activeStep] || {};

  const changeStep = (nextStep) => {
    if (nextStep < 0 || nextStep >= totalSteps) return;
    setStepError('');
    if (isControlled && onStepChange) {
      onStepChange(nextStep);
    } else {
      setInternalStep(nextStep);
    }
  };

  const handleNext = async () => {
    setStepError('');
    // Ejecutar validación del paso actual si existe
    if (currentStepData.validate) {
      try {
        const validationResult = await currentStepData.validate();
        if (validationResult === false) return;
        if (typeof validationResult === 'string' && validationResult.trim().length > 0) {
          setStepError(validationResult);
          return;
        }
      } catch (err) {
        setStepError(err?.message || 'Por favor completa todos los campos requeridos del paso.');
        return;
      }
    }

    if (!isLastStep) {
      changeStep(activeStep + 1);
    } else if (onSubmit && !isViewMode) {
      onSubmit();
    }
  };

  const handlePrev = () => {
    setStepError('');
    if (!isFirstStep) {
      changeStep(activeStep - 1);
    } else {
      handleRequestClose();
    }
  };

  const handleRequestClose = () => {
    if (isDirty && !isViewMode) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const handleStepBadgeClick = async (targetIdx) => {
    if (isViewMode) {
      changeStep(targetIdx);
      return;
    }

    // Permitir retroceder libremente
    if (targetIdx < activeStep) {
      changeStep(targetIdx);
      return;
    }

    // Para avanzar a un paso posterior, validar el paso actual primero
    if (currentStepData.validate) {
      try {
        const validationResult = await currentStepData.validate();
        if (validationResult === false) return;
        if (typeof validationResult === 'string' && validationResult.trim().length > 0) {
          setStepError(validationResult);
          return;
        }
      } catch (err) {
        setStepError(err?.message || 'Por favor completa los campos requeridos antes de continuar.');
        return;
      }
    }

    changeStep(targetIdx);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in-50 duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-stepper-title"
    >
      {/* Contenedor del Modal con Dimensiones Fijas Uniformes */}
      <div
        ref={modalRef}
        className={`w-full ${size} h-[600px] max-h-[90vh] bg-card text-card-foreground border border-border rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all`}
      >
        {/* ══════════════════ 1. ENCABEZADO FIJO ══════════════════ */}
        <header className="px-5 sm:px-6 pt-4 pb-3.5 border-b border-border bg-card shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {category && (
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-[#C1502D] dark:text-[#E8B23D] block mb-0.5">
                  {category}
                </span>
              )}
              <h2
                id="modal-stepper-title"
                className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight leading-snug truncate m-0"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-1 m-0">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Botón Cerrar (X) */}
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={isLoading}
              className="p-2 -mr-1.5 -mt-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Cerrar modal"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Stepper / Indicador de Pasos Unificado con Línea Conectora y Porcentaje a la Derecha */}
          {totalSteps > 1 && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between gap-3">
              <nav aria-label="Progreso de pasos" className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                {steps.map((st, idx) => {
                  const isPassed = idx < activeStep;
                  const isCurrent = idx === activeStep;

                  return (
                    <React.Fragment key={st.id || idx}>
                      <button
                        type="button"
                        onClick={() => handleStepBadgeClick(idx)}
                        disabled={isLoading}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`group px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer select-none border shrink-0 ${
                          isCurrent
                            ? 'bg-[#FFE1D0]/60 dark:bg-[#C1502D]/15 text-[#C1502D] dark:text-[#E8B23D] border-[#C1502D]/30 font-bold'
                            : isPassed
                            ? 'bg-muted/40 text-foreground border-transparent hover:bg-muted/70'
                            : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted/30'
                        }`}
                      >
                        <span
                          className={`size-5 rounded-full flex items-center justify-center text-[10.5px] shrink-0 font-extrabold transition-transform ${
                            isPassed
                              ? 'bg-[#5A7A3A] text-white'
                              : isCurrent
                              ? 'bg-[#C1502D] dark:bg-[#E8B23D] text-white dark:text-slate-900 shadow-xs'
                              : 'bg-muted-foreground/20 text-muted-foreground'
                          }`}
                        >
                          {isPassed ? <Check className="size-3 stroke-[3]" /> : idx + 1}
                        </span>
                        <span className="whitespace-nowrap text-[11.5px] tracking-tight">{st.title || `Paso ${idx + 1}`}</span>
                      </button>

                      {idx < totalSteps - 1 && (
                        <div
                          className={`h-0.5 w-3 sm:w-6 rounded-full shrink-0 transition-colors ${
                            idx < activeStep ? 'bg-[#5A7A3A]' : 'bg-border'
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </nav>

              <div className="shrink-0 text-[11px] font-bold text-[#C1502D] dark:text-[#E8B23D] bg-[#FFE1D0]/50 dark:bg-[#C1502D]/20 px-2 py-0.5 rounded-full border border-[#C1502D]/20">
                {Math.round(((activeStep + 1) / totalSteps) * 100)}%
              </div>
            </div>
          )}
        </header>

        {/* ══════════════════ 2. CUERPO CENTRAL (SCROLL UNIFICADO) ══════════════════ */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 flex flex-col">
          {/* Mensaje de Error de Validación del Paso */}
          {stepError && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5"
              role="alert"
            >
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{stepError}</div>
            </motion.div>
          )}

          {/* Render del Contenido del Paso con Transición */}
          <div className="flex-1 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: 'easeInOut' }}
                className="flex-1 flex flex-col"
              >
                {currentStepData.content || null}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* ══════════════════ 3. PIE FIJO DE ACCIONES ══════════════════ */}
        <footer className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-border bg-card/95 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          {/* Botón Izquierdo: Cancelar (si está en paso 0) o Atrás (si está en paso > 0) */}
          <div>
            <button
              type="button"
              onClick={handlePrev}
              disabled={isLoading}
              className="h-10 px-4 rounded-xl border border-border hover:bg-muted text-foreground text-xs sm:text-sm font-semibold transition-colors cursor-pointer flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {!isFirstStep && <ChevronLeft className="size-4" />}
              <span>{isFirstStep ? 'Cancelar' : 'Atrás'}</span>
            </button>
          </div>

          {/* Botón Derecho Principal: Continuar (pasos intermedios) o Guardar (último paso) */}
          <div className="flex items-center gap-2">
            {isViewMode ? (
              !isLastStep ? (
                <button
                  type="button"
                  onClick={() => changeStep(activeStep + 1)}
                  className="h-10 px-5 rounded-full bg-[#C1502D] hover:bg-[#8A3418] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#C1502D]/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98"
                >
                  <span>Continuar</span>
                  <ChevronRight className="size-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-5 rounded-full bg-[#C1502D] hover:bg-[#8A3418] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#C1502D]/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>Cerrar</span>
                </button>
              )
            ) : !isLastStep ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className="h-10 px-5 rounded-full bg-[#C1502D] hover:bg-[#8A3418] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#C1502D]/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D]"
              >
                <span>Continuar</span>
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                disabled={isLoading}
                className={`h-10 px-6 rounded-full text-white text-xs sm:text-sm font-bold shadow-md shadow-[#C1502D]/25 transition-all cursor-pointer flex items-center gap-2 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C1502D] ${
                  isLoading ? 'bg-[#C1502D]/70 cursor-not-allowed' : 'bg-[#C1502D] hover:bg-[#8A3418]'
                }`}
              >
                {isLoading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.7, ease: 'linear' }}
                      className="size-3.5 border-2 border-white/30 border-t-white rounded-full"
                    />
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-4" />
                    <span>{submitLabel}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </footer>

        {/* Modal de Confirmación al Intentar Cerrar con Cambios */}
        <AnimatePresence>
          {showConfirmClose && (
            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-card border border-border rounded-2xl p-5 shadow-2xl text-center"
              >
                <div className="size-11 rounded-full bg-[#FFE1D0] dark:bg-[#C1502D]/20 text-[#C1502D] dark:text-[#E8B23D] flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="size-6" />
                </div>
                <h3 className="text-base font-bold text-foreground mb-1.5">
                  ¿Descartar cambios?
                </h3>
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  Tienes modificaciones sin guardar en este formulario. Si sales ahora, la información ingresada se perderá.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClose(false)}
                    className="flex-1 h-9.5 rounded-xl border border-border hover:bg-muted text-foreground text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Seguir editando
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmClose(false);
                      onClose();
                    }}
                    className="flex-1 h-9.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-colors cursor-pointer"
                  >
                    Descartar y salir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default StepperModal;
