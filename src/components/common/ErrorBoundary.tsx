import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, showDetails: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Educore UI ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 bg-white rounded-lg border border-rose-200 shadow-2xs max-w-xl mx-auto space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-900">
                {this.props.fallbackTitle || 'Unable to display this view'}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                An unexpected error occurred while rendering this section. Your session and other active records remain safe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry / Reload View</span>
            </button>

            {this.state.error && (
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition cursor-pointer"
              >
                {this.state.showDetails ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Technical details</span>
              </button>
            )}
          </div>

          {this.state.showDetails && this.state.error && (
            <div className="p-3 bg-slate-50 rounded-md border border-slate-200 font-mono text-[11px] text-slate-700 overflow-x-auto max-h-40 leading-normal">
              <div className="font-bold text-rose-700">{this.state.error.name}: {this.state.error.message}</div>
              {this.state.error.stack && (
                <pre className="mt-2 text-slate-500 whitespace-pre-wrap text-[10px]">
                  {this.state.error.stack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
