import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 p-4 rounded-xl bg-[#C1502D]/10 dark:bg-[#C1502D]/15 border border-[#C1502D]/30 text-[#C1502D] dark:text-[#FFAAA0]"
    >
      <AlertTriangle className="size-5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">No se pudieron cargar los datos</p>
        <p className="text-xs mt-0.5 opacity-90">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-current/30 hover:bg-[#C1502D]/10 transition-colors shrink-0"
        >
          <RefreshCw className="size-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
