// =============================================================================
// React Error Boundary
// Phase 7.1: Prevents full-page white screen crash from rendering errors
// =============================================================================

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

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
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught rendering error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-red-50 border border-red-200 rounded-lg m-2">
          <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-sm font-semibold text-red-800 mb-1">
            {this.props.fallbackTitle || 'Something went wrong'}
          </h3>
          <p className="text-xs text-red-600 text-center mb-3 max-w-xs">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
          >
            <RefreshCw size={12} />
            Try Again
          </button>
          {this.state.errorInfo && (
            <details className="mt-3 w-full max-h-32 overflow-auto">
              <summary className="text-xs text-red-500 cursor-pointer">Stack trace</summary>
              <pre className="text-[10px] text-red-400 mt-1 whitespace-pre-wrap break-all">
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
