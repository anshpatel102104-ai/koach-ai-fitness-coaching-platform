import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportError, isChunkLoadError } from '@/lib/errorReporting';

/**
 * Catches render errors so one broken component can't white-screen the app.
 *
 *   <ErrorBoundary scope="page" resetKey={location.pathname}>…</ErrorBoundary>
 *
 * scope="page": fallback sits inside the layout (sidebar/nav stay usable) and
 * clears when resetKey changes (navigating away). scope="app": full-screen last
 * resort. A failed lazy-chunk load (usually a new deploy) offers a reload.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportError(error, {
      source: isChunkLoadError(error) ? 'chunk' : 'render',
      componentStack: info?.componentStack,
    });
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = isChunkLoadError(error);
    const fullScreen = this.props.scope === 'app';
    const title = chunk ? 'A new version of KOACH is available' : 'This page ran into a problem';
    const message = chunk
      ? 'Reload to get the latest version. Your data is saved.'
      : 'Your data is safe. Try again, or go back to your dashboard. We have been notified.';

    return (
      <div
        role="alert"
        className={fullScreen
          ? 'fixed inset-0 flex items-center justify-center bg-background px-4'
          : 'flex min-h-[50vh] items-center justify-center px-4 py-12'}
      >
        <div className="max-w-md text-center">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button onClick={() => (chunk ? window.location.reload() : this.setState({ error: null }))}>
              <RefreshCw /> {chunk ? 'Reload' : 'Try again'}
            </Button>
            {!chunk && (
              <Button variant="outline" onClick={() => window.location.assign(this.props.homePath || '/')}>
                Go to dashboard
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }
}
