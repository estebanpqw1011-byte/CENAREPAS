import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center flex flex-col items-center">
            <div className="size-14 rounded-2xl bg-[#FFE1D0] dark:bg-[#C1502D]/20 text-[#C1502D] dark:text-[#E2895F] flex items-center justify-center mb-4">
              <AlertTriangle className="size-7" />
            </div>

            <h2 className="text-xl font-bold text-foreground mb-2">
              Algo no salió como esperábamos
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6 leading-relaxed">
              Ocurrió un inconveniente al renderizar esta vista. Puedes recargar la página o volver al inicio.
            </p>

            {this.state.error?.message && (
              <div className="w-full p-3 rounded-xl bg-muted/60 border border-border text-left text-[11px] font-mono text-muted-foreground mb-6 max-h-24 overflow-y-auto break-words">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 h-10 rounded-full bg-[#C1502D] hover:bg-[#8A3418] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className="size-3.5" />
                <span>Reintentar</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 h-10 rounded-full bg-card hover:bg-muted border border-border text-foreground font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Home className="size-3.5" />
                <span>Ir al Inicio</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
