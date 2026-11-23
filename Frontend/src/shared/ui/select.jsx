import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './utils';

const SelectContext = createContext(null);

export function Select({ value, onValueChange, defaultValue, children, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value !== undefined ? value : defaultValue || '');
  const [itemsMap, setItemsMap] = useState({});
  const triggerRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value);
    }
  }, [value]);

  const handleSelect = useCallback(
    (val) => {
      if (value === undefined) {
        setSelectedValue(val);
      }
      onValueChange?.(val);
      setOpen(false);
    },
    [value, onValueChange]
  );

  const registerItem = useCallback((val, label) => {
    setItemsMap((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

  return (
    <SelectContext.Provider
      value={{
        open,
        setOpen,
        selectedValue,
        handleSelect,
        triggerRef,
        itemsMap,
        registerItem,
        disabled,
      }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, children, ...props }) {
  const { open, setOpen, disabled, triggerRef } = useContext(SelectContext);

  return (
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-expanded={open}
      disabled={disabled}
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-10 w-full min-w-0 max-w-full items-center justify-between gap-2 rounded-lg border border-input bg-input-background px-3 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-2xs box-border overflow-hidden',
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0 truncate text-left text-ellipsis overflow-hidden whitespace-nowrap">{children}</div>
      <ChevronDown
        className={cn(
          'h-4 w-4 opacity-50 transition-transform duration-200 shrink-0 ml-auto',
          open && 'rotate-180'
        )}
      />
    </button>
  );
}

export function SelectValue({ placeholder = 'Seleccionar...' }) {
  const { selectedValue, itemsMap } = useContext(SelectContext);
  const displayLabel = itemsMap[selectedValue] || selectedValue;

  return (
    <span className={cn('truncate block min-w-0 text-ellipsis overflow-hidden whitespace-nowrap', !displayLabel && 'text-muted-foreground')}>
      {displayLabel || placeholder}
    </span>
  );
}

export function SelectContent({ className, children, ...props }) {
  const { open, setOpen, triggerRef } = useContext(SelectContext);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, opensUp: false });
  const contentRef = useRef(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const opensUp = spaceBelow < 240 && spaceAbove > spaceBelow;

      setCoords({
        top: opensUp ? rect.top + window.scrollY - 6 : rect.bottom + window.scrollY + 6,
        bottom: opensUp ? window.innerHeight - rect.top - window.scrollY + 6 : undefined,
        left: rect.left + window.scrollX,
        width: rect.width,
        opensUp,
      });
    }
  }, [open, triggerRef]);

  useEffect(() => {
    if (!open) return;
    const handleDown = (e) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = (e) => {
      if (contentRef.current && !contentRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDown);
    window.addEventListener('resize', handleScroll);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, setOpen, triggerRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={contentRef}
      style={{
        position: 'absolute',
        top: coords.opensUp ? undefined : `${coords.top}px`,
        bottom: coords.opensUp ? `${coords.bottom}px` : undefined,
        left: `${coords.left}px`,
        width: `${coords.width}px`,
        zIndex: 9999,
      }}
      className={cn(
        'max-h-60 overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl p-1 animate-in fade-in-50 zoom-in-95 duration-150 custom-scrollbar',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
}

export function SelectItem({ value, className, children, disabled = false, ...props }) {
  const { selectedValue, handleSelect, registerItem } = useContext(SelectContext);
  const isSelected = String(selectedValue) === String(value);

  useEffect(() => {
    if (typeof children === 'string') {
      registerItem(value, children);
    } else if (Array.isArray(children)) {
      const text = children.filter((c) => typeof c === 'string').join(' ');
      if (text) registerItem(value, text);
    }
  }, [value, children, registerItem]);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      onClick={() => {
        if (!disabled) handleSelect(value);
      }}
      className={cn(
        'relative flex w-full min-w-0 cursor-pointer select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors',
        isSelected && 'bg-primary/10 text-primary font-medium',
        disabled && 'pointer-events-none opacity-50',
        className
      )}
      {...props}
    >
      <span className="truncate flex-1 min-w-0 text-ellipsis overflow-hidden whitespace-nowrap">{children}</span>
      {isSelected && <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />}
    </div>
  );
}

export function SelectGroup({ className, children, ...props }) {
  return <div className={cn('p-1', className)} {...props}>{children}</div>;
}

export function SelectLabel({ className, children, ...props }) {
  return <div className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props}>{children}</div>;
}

export function SelectSeparator({ className, ...props }) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />;
}

export function SelectScrollUpButton() {
  return null;
}

export function SelectScrollDownButton() {
  return null;
}
