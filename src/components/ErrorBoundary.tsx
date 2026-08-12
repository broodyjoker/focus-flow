import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center font-sans antialiased text-slate-900 dark:text-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-6 shadow-sm border border-red-200 dark:border-red-800/50">
            <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold mb-3 tracking-tight">Something went wrong</h1>
          
          <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
            The app encountered a critical error while rendering. If you are stuck on a white screen, resetting the app settings usually fixes the problem.
          </p>

          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold rounded-xl shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
          >
            <RefreshCcw size={18} />
            Reset App
          </button>
          
          {this.state.error && (
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-900 rounded-lg text-left text-xs text-slate-500 dark:text-slate-400 w-full max-w-lg overflow-auto max-h-32 border border-slate-200 dark:border-slate-800">
              <pre className="font-mono">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
