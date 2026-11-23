import React, { useState, useRef, useEffect, useId, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from './utils';

/**
 * Reusable searchable Combobox / Select component.
 * 
 * @param {Object} props
 * @param {Array<{value: any, label: any, disabled?: boolean}>} props.options
 * @param {any} props.value Current selected value (single or array if multiple)
 * @param {function} props.onChange Callback when value changes: onChange(syntheticEvent) & onValueChange(val)
 * @param {function} [props.onValueChange] Optional direct-value callback: onValueChange(val)
 * @param {string} [props.placeholder='Seleccionar...']
 * @param {string} [props.searchPlaceholder='Buscar...']
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.multiple=false]
 * @param {boolean} [props.allowClear=false]
 * @param {string} [props.id]
 * @param {string} [props.name]
 * @param {string} [props.className]
 * @param {string} [props.emptyMessage='No se encontraron resultados']
 */
export function Combobox({
  options = [],
  value,
  onChange,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  multiple = false,
  allowClear = false,
  id,
  name,
  className,
  emptyMessage = 'No se encontraron resultados',
  required = false,
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize options to ensure uniform { value, label, disabled } structure
  const normalizedOptions = useMemo(() => {
    if (!Array.isArray(options)) return [];
    return options.map((opt) => {
      if (opt !== null && typeof opt === 'object' && 'value' in opt) {
        return {
          value: opt.value,
          label: opt.label !== undefined && opt.label !== null ? String(opt.label) : String(opt.value),
          disabled: Boolean(opt.disabled),
        };
      }
      return {
        value: opt,
        label: opt !== undefined && opt !== null ? String(opt) : '',
        disabled: false,
      };
    });
  }, [options]);

  // Find currently selected option(s)
  const selectedOptions = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value)) return [];
      return normalizedOptions.filter((opt) =>
        value.some((v) => String(v) === String(opt.value))
      );
    }
    if (value === undefined || value === null || value === '') return [];
    const match = normalizedOptions.find((opt) => String(opt.value) === String(value));
    return match ? [match] : [];
  }, [normalizedOptions, value, multiple]);

  // Filtered options based on user search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return normalizedOptions;
    const term = searchTerm.toLowerCase().trim();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(term)
    );
  }, [normalizedOptions, searchTerm]);

  // Emit change event
  const triggerChange = (newVal) => {
    onValueChange?.(newVal);
    if (onChange) {
      const syntheticEvent = {
        target: {
          value: newVal,
          name: name || inputId,
          id: inputId,
        },
        currentTarget: {
          value: newVal,
          name: name || inputId,
          id: inputId,
        },
        type: 'change',
        preventDefault: () => {},
        stopPropagation: () => {},
      };
      onChange(syntheticEvent);
    }
  };

  const handleSelect = (option) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? [...value] : [];
      const existsIndex = currentValues.findIndex((v) => String(v) === String(option.value));
      let nextValues;
      if (existsIndex >= 0) {
        nextValues = currentValues.filter((_, i) => i !== existsIndex);
      } else {
        nextValues = [...currentValues, option.value];
      }
      triggerChange(nextValues);
      setSearchTerm('');
      inputRef.current?.focus();
    } else {
      triggerChange(option.value);
      setSearchTerm('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const newVal = multiple ? [] : '';
    triggerChange(newVal);
    setSearchTerm('');
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;

      case 'Enter':
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (!isOpen) {
          e.preventDefault();
          setIsOpen(true);
        }
        break;

      case 'Escape':
        if (isOpen) {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;

      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          setHighlightedIndex(-1);
        }
        break;

      default:
        break;
    }
  };

  const isOptionSelected = (opt) => {
    if (multiple) {
      return Array.isArray(value) && value.some((v) => String(v) === String(opt.value));
    }
    return selectedOptions.length > 0 && String(selectedOptions[0].value) === String(opt.value);
  };

  const displayLabel = useMemo(() => {
    if (multiple) {
      if (selectedOptions.length === 0) return '';
      return selectedOptions.map((o) => o.label).join(', ');
    }
    return selectedOptions[0]?.label || '';
  }, [selectedOptions, multiple]);

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full min-w-0 max-w-full select-none', className)}
      {...rest}
    >
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={multiple ? (Array.isArray(value) && value.length ? 'selected' : '') : (value ?? '')}
          required={required}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Main trigger button / search input container */}
      <div
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
            if (!isOpen) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={cn(
          'flex h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-lg border border-input bg-input-background px-3 text-sm text-foreground transition-all duration-150 shadow-2xs box-border overflow-hidden',
          isOpen ? 'ring-2 ring-ring ring-offset-1 border-primary' : 'hover:border-muted-foreground/40',
          disabled && 'cursor-not-allowed opacity-50 bg-muted/30'
        )}
      >
        <div className="flex flex-1 items-center min-w-0 overflow-hidden h-full">
          {isOpen ? (
            <div className="flex w-full items-center gap-2 min-w-0 overflow-hidden h-full">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                id={inputId}
                name={name}
                type="text"
                role="combobox"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-controls={listboxId}
                aria-activedescendant={
                  highlightedIndex >= 0 ? `${inputId}-opt-${highlightedIndex}` : undefined
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder={displayLabel || searchPlaceholder}
                disabled={disabled}
                autoComplete="off"
                onClick={(e) => e.stopPropagation()}
                className="w-full min-w-0 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none truncate h-full leading-normal"
              />
            </div>
          ) : (
            <span
              id={inputId}
              className={cn(
                'truncate block text-left w-full min-w-0 text-ellipsis overflow-hidden whitespace-nowrap text-sm leading-normal',
                !displayLabel && 'text-muted-foreground'
              )}
            >
              {displayLabel || placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {allowClear && (displayLabel || (multiple && selectedOptions.length > 0)) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Limpiar selección"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 opacity-60 transition-transform duration-200 shrink-0',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-multiselectable={multiple}
          className="absolute left-0 top-full mt-1.5 z-50 max-h-60 w-full min-w-full overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-xl p-1 animate-in fade-in-50 zoom-in-95 duration-150 custom-scrollbar"
        >
          {filteredOptions.length === 0 ? (
            <div className="py-3 px-3 text-center text-xs text-muted-foreground truncate">
              {emptyMessage}
            </div>
          ) : (
            <div ref={listRef} className="space-y-0.5">
              {filteredOptions.map((opt, idx) => {
                const selected = isOptionSelected(opt);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    id={`${inputId}-opt-${idx}`}
                    role="option"
                    aria-selected={selected}
                    aria-disabled={opt.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelect(opt);
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={cn(
                      'relative flex w-full min-w-0 cursor-pointer select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none transition-colors duration-150',
                      isHighlighted && 'bg-accent text-accent-foreground',
                      selected && 'bg-primary/10 text-primary font-medium',
                      opt.disabled && 'pointer-events-none opacity-40'
                    )}
                  >
                    <span className="truncate flex-1 min-w-0 text-left text-ellipsis overflow-hidden whitespace-nowrap">{opt.label}</span>
                    {selected && (
                      <Check className="h-4 w-4 shrink-0 text-primary ml-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Combobox;
