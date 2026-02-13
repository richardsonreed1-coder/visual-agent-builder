import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  nodeId?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class NodeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error(`[NodeErrorBoundary] Node ${this.props.nodeId || 'unknown'} render error:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-center min-w-[120px]">
          <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="text-[10px] text-red-600 font-medium">Render Error</p>
          <p className="text-[10px] text-red-400 truncate max-w-[140px]">
            {this.state.error?.message || 'Unknown error'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
