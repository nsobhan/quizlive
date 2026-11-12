import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches render errors so a bug shows a recoverable screen (with the message) instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('QuizLive crashed:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="bg-brand flex min-h-[100dvh] items-center justify-center p-4">
        <div className="card w-full max-w-md p-6 text-center">
          <div className="text-5xl" aria-hidden>😵</div>
          <h1 className="mt-2 text-2xl font-bold">Something went wrong</h1>
          <p className="mt-1 text-slate-600">Reloading will put you right back into your game.</p>
          <button className="btn-purple mt-4 w-full" onClick={() => location.reload()}>Reload</button>
          <details className="mt-4 text-left text-xs text-slate-500">
            <summary className="cursor-pointer">Error details (send these to the host)</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-2">
              {error.name}: {error.message}
              {'\n'}
              {navigator.userAgent}
              {'\n'}
              {error.stack?.split('\n').slice(0, 6).join('\n')}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
