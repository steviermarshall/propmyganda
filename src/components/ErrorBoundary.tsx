import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional custom fallback. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary so a render-time exception shows a branded
 * recovery screen instead of a blank white page.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Uncaught render error:", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) return this.props.fallback(error, this.reset);

    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-white text-lg font-bold uppercase tracking-widest">
            Something went wrong
          </h1>
          <p className="text-white/50 text-sm">
            An unexpected error broke this page. You can try again, or reload.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-left text-[11px] text-red-400/80 bg-black/60 border border-white/10 p-3 overflow-x-auto whitespace-pre-wrap break-all">
              {error.message}
            </pre>
          )}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={this.reset}
              className="text-[11px] uppercase tracking-widest text-white/70 hover:text-white border border-white/20 px-4 py-2"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-[11px] uppercase tracking-widest text-black bg-white px-4 py-2 font-bold"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
