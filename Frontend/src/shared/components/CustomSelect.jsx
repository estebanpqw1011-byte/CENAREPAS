import React, { useState, useRef, useEffect, Children, isValidElement } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

/**
 * CustomSelect - CENAREPAS Styled Select Component
 * - Replaces native browser selects with branded CenArepas aesthetic
 * - Compatible with both options prop and children <option> elements
 * - Dispatches compatible onChange for both (val) => ... and (e) => ...
 */
export function CustomSelect({
  value,
  onChange,
  options,
  children,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = '',
  id,
  name,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalizar opciones a partir de prop options o children <option>
  const normalizedOptions = React.useMemo(() => {
    if (options && Array.isArray(options)) {
      return options.map((opt) => {
        if (typeof opt === 'object' && opt !== null) {
          return { value: String(opt.value), label: opt.label ?? String(opt.value) };
        }
        return { value: String(opt), label: String(opt) };
      });
    }

    if (children) {
      const parsed = [];
      Children.forEach(children, (child) => {
        if (isValidElement(child) && child.type === 'option') {
          parsed.push({
            value: String(child.props.value ?? child.props.children),
            label: child.props.children,
          });
        }
      });
      return parsed;
    }

    return [];
  }, [options, children]);

  // Encontrar la etiqueta seleccionada
  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const displayLabel = selectedOption
    ? selectedOption.label
    : value !== undefined && value !== null && value !== ''
    ? String(value)
    : placeholder;

  // Cierre al hacer clic fuera o presionar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optValue) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      // Soporta tanto onChange(value) como onChange({ target: { value, name } })
      const syntheticEvent = {
        target: { value: optValue, name, id },
        currentTarget: { value: optValue, name, id },
      };
      onChange(syntheticEvent);
      // Por si el callback espera directamente el valor
      if (typeof onChange === 'function' && onChange.length <= 1) {
        try {
          onChange(optValue);
        } catch {
          // Ignorar si ya se ejecutó con el evento sintético
        }
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 max-w-full select-none ${className || ''}`}>
      {/* Botón Trigger */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 h-10 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all cursor-pointer select-none box-border min-w-0 max-w-full overflow-hidden ${
          isOpen
            ? 'border-[#C1502D] dark:border-[#E8B23D] ring-2 ring-[#C1502D]/15 dark:ring-[#E8B23D]/20 bg-card text-foreground'
            : 'border-input bg-input-background text-foreground hover:border-[#C1502D]/40 dark:hover:border-[#E8B23D]/40'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'shadow-xs'}`}
      >
        <span className="truncate text-left block flex-1 min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">
          {displayLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ease-out ml-auto ${
            isOpen ? 'rotate-180 text-[#C1502D] dark:text-[#E8B23D]' : 'rotate-0'
          }`}
        />
      </button>

      {/* Menú Desplegable con Animación Suave */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full mt-1.5 w-full min-w-full max-h-60 overflow-y-auto rounded-xl border border-border bg-card dark:bg-[#111820] shadow-xl p-1 z-50 custom-scrollbar flex flex-col gap-0.5"
            role="listbox"
          >
            {normalizedOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center truncate">
                Sin opciones disponibles
              </div>
            ) : (
              normalizedOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer text-left min-w-0 ${
                      isSelected
                        ? 'bg-[#FFE1D0] dark:bg-[#C1502D]/20 text-[#8C491A] dark:text-[#E8B23D] font-bold'
                        : 'text-foreground hover:bg-[#FFFBF0] dark:hover:bg-[#1A232F]'
                    }`}
                  >
                    <span className="truncate flex-1 min-w-0 text-left text-ellipsis overflow-hidden whitespace-nowrap">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-[#C1502D] dark:text-[#E8B23D] shrink-0 ml-auto" />
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CustomSelect;
