import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  confirmVariant = 'danger',
  loadingText,
  icon: CustomIcon,
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  // Manejo de la tecla Escape para cerrar el modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  const getVariantStyles = () => {
    switch (confirmVariant) {
      case 'success':
        return {
          iconBg: 'bg-[#5A7A3A]/15 border-[#5A7A3A]/30 text-[#5A7A3A] dark:text-[#AEC094]',
          buttonBg: 'bg-[#5A7A3A] hover:bg-[#4A6430] text-white shadow-[#5A7A3A]/25',
        };
      case 'warning':
        return {
          iconBg: 'bg-[#E8B23D]/20 border-[#E8B23D]/30 text-[#B87A18] dark:text-[#E8B23D]',
          buttonBg: 'bg-[#C1502D] hover:bg-[#8A3418] text-white shadow-[#C1502D]/25',
        };
      case 'primary':
        return {
          iconBg: 'bg-[#C1502D]/15 border-[#C1502D]/30 text-[#C1502D] dark:text-[#E8B23D]',
          buttonBg: 'bg-[#C1502D] hover:bg-[#8A3418] text-white shadow-[#C1502D]/25',
        };
      case 'danger':
      default:
        return {
          iconBg: 'bg-[#FFE1D0] dark:bg-[#C1502D]/20 border-[#E8DCC0] dark:border-[rgba(148,163,184,0.18)] text-[#C1502D] dark:text-[#E8B23D]',
          buttonBg: 'bg-[#C1502D] hover:bg-[#8A3418] text-white shadow-[#C1502D]/25',
        };
    }
  };

  const styles = getVariantStyles();
  const IconComponent = CustomIcon || AlertTriangle;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop con Blur y Cierre al Hacer Clic Fuera */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isLoading ? undefined : onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            aria-hidden="true"
          />

          {/* Modal Card con Animación Scale + Fade */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className="relative z-10 w-full max-w-md bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
          >
            {/* Botón de cerrar superior */}
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="absolute top-4 right-4 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-40"
              aria-label="Cerrar modal"
            >
              <X className="size-4" />
            </button>

            {/* Encabezado con Icono Estilizado */}
            <div className="flex items-start gap-4 mb-3">
              <div className={`size-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-xs ${styles.iconBg}`}>
                <IconComponent className="size-6 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 id="confirm-dialog-title" className="text-base sm:text-lg font-bold text-foreground leading-snug m-0">
                  {title}
                </h2>
              </div>
            </div>

            {/* Mensaje descriptivo con detalles del elemento */}
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2.5 mb-6">
              {message}
            </p>

            {/* Botones de Acción */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 h-11 px-4 border border-border bg-card hover:bg-muted text-foreground font-semibold rounded-xl text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 h-11 px-4 active:translate-y-[0.5px] font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${styles.buttonBg}`}
              >
                {isLoading ? (
                  <>
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{loadingText || (confirmText === 'Eliminar' ? 'Eliminando…' : 'Guardando…')}</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
