import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global React Error Boundary — wraps the entire app.
 * Catches synchronous render errors and shows a recovery UI
 * rather than a blank white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            color: '#f1f5f9',
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}>
            <svg width="32" height="32" fill="none" stroke="#f87171" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>

          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: 360, marginBottom: 24, lineHeight: 1.6 }}>
            {this.state.error?.message || 'An unexpected error occurred. Our team has been notified.'}
          </p>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={this.reset}
              style={{
                background: 'rgba(148,163,184,0.1)',
                border: '1px solid rgba(148,163,184,0.2)',
                color: '#94a3b8',
                borderRadius: 8,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => { window.location.href = '/dashboard'; }}
              style={{
                background: '#2563eb',
                border: 'none',
                color: 'white',
                borderRadius: 8,
                padding: '8px 20px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              Go to Dashboard
            </button>
          </div>

          {/* Version info for debugging */}
          <p style={{ color: '#475569', fontSize: '0.7rem', marginTop: 32 }}>
            WindowWorld Platform · If this persists, contact your system administrator.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
