import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
    
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-skd-bg flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-skd-card border border-skd-border rounded-3xl p-8 text-center space-y-6 shadow-lg">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-skd-danger/10 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="text-skd-danger" size={32} />
            </div>

            {/* Error Message */}
            <div>
              <h2 className="text-xl font-bold text-skd-text mb-2">
                Oops! Terjadi Kesalahan
              </h2>
              <p className="text-sm text-skd-muted leading-relaxed">
                Aplikasi mengalami error yang tidak terduga. Coba refresh halaman atau kembali ke beranda.
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-skd-bg border border-skd-danger/20 rounded-xl p-4 text-left">
                <p className="text-xs font-mono text-skd-danger break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-skd-muted cursor-pointer hover:text-skd-text">
                      Stack Trace
                    </summary>
                    <pre className="text-[10px] text-skd-muted mt-2 overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-skd-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-md"
              >
                <RefreshCw size={18} />
                Refresh Halaman
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full py-3 bg-skd-card border border-skd-border text-skd-text rounded-xl font-bold hover:bg-skd-muted/5 transition-colors flex items-center justify-center gap-2"
              >
                <Home size={18} />
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
