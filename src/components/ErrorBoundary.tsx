import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
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

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.hash = '#/home';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] rounded-2xl m-4 shadow-sm animate-in fade-in">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-serif text-xl font-bold text-[var(--text-primary)]">
                {this.props.fallbackTitle || 'Section Display Recovery'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                An unexpected interface issue was caught. Your data remains completely safe.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-[var(--bg-surface-muted)] rounded-lg text-left overflow-x-auto text-[11px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)]">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[var(--accent-gold)] text-[#0B1325] rounded-lg hover:bg-[var(--accent-gold-hover)] flex items-center gap-2 cursor-pointer font-bold shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload View</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-muted)] flex items-center gap-2 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
