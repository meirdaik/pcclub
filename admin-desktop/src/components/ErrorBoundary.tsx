import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Admin Console ErrorBoundary caught an error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.header}>
              <span style={styles.icon}>⚠️</span>
              <h2 className="font-orbitron" style={styles.title}>
                ADMIN CONSOLE RECOVERY
              </h2>
            </div>

            <p style={styles.description}>
              An unexpected UI error occurred while rendering the cashier view.
              Your server and club PCs remain active in the background.
            </p>

            {this.state.error && (
              <div style={styles.errorBox}>
                <div style={styles.errorName}>{this.state.error.name}: {this.state.error.message}</div>
                {this.state.errorInfo?.componentStack && (
                  <pre style={styles.stackTrace}>
                    {this.state.errorInfo.componentStack.slice(0, 500)}
                  </pre>
                )}
              </div>
            )}

            <div style={styles.buttonGroup}>
              <button
                onClick={this.handleReset}
                className="cyber-button"
                style={styles.btnPrimary}
              >
                🔄 RESUME CONSOLE
              </button>
              <button
                onClick={this.handleReload}
                className="cyber-button secondary"
                style={styles.btnSecondary}
              >
                ⟳ RELOAD WINDOW
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: '#070913',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    color: '#e2e8f0',
  },
  card: {
    maxWidth: '620px',
    width: '100%',
    backgroundColor: '#0d1226',
    border: '1px solid #ff0055',
    borderRadius: '16px',
    boxShadow: '0 0 30px rgba(255, 0, 85, 0.25)',
    padding: '32px',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    fontSize: '28px',
  },
  title: {
    fontSize: '22px',
    color: '#ff0055',
    margin: 0,
    letterSpacing: '1px',
  },
  description: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.6',
    marginBottom: '20px',
  },
  errorBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 0, 85, 0.3)',
    borderRadius: '8px',
    padding: '16px',
    textAlign: 'left',
    marginBottom: '24px',
    overflowX: 'auto',
  },
  errorName: {
    color: '#ff5577',
    fontWeight: 'bold',
    fontSize: '13px',
    marginBottom: '8px',
    fontFamily: 'monospace',
  },
  stackTrace: {
    color: '#64748b',
    fontSize: '11px',
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  buttonGroup: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
  },
  btnPrimary: {
    padding: '12px 28px',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  btnSecondary: {
    padding: '12px 24px',
    fontSize: '13px',
  },
};
