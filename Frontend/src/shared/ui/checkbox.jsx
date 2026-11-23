import React from 'react';
import { Check } from 'lucide-react';

export function Checkbox({
  checked = false,
  onChange,
  onCheckedChange,
  disabled = false,
  id,
  name,
  className = '',
  'aria-label': ariaLabel,
  ...props
}) {
  const isChecked = Boolean(checked);

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    const nextVal = !isChecked;
    if (onChange) onChange({ target: { checked: nextVal, name, id } });
    if (onCheckedChange) onCheckedChange(nextVal);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleClick(e);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      id={id}
      name={name}
      aria-checked={isChecked}
      aria-label={ariaLabel}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`size-4 shrink-0 rounded-[4px] border transition-all duration-150 flex items-center justify-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        isChecked
          ? 'bg-primary border-primary text-primary-foreground shadow-xs'
          : 'border-input bg-input-background dark:bg-input/20 hover:border-primary/60 hover:bg-muted/30'
      } ${className}`}
      {...props}
    >
      {isChecked && <Check className="size-3 stroke-[3]" />}
    </button>
  );
}

export default Checkbox;
