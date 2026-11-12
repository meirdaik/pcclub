import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Kiosk ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#070913',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e2e8f0',
          fontFamily: "'Inter', sans-serif",
          padding: '24px',
          boxSizing: 'border-box',
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: '#0d1226',
            border: '1px solid #ff0055',
            borderRadius: '16px',
            padding: '28px',
            textAlign: 'center',
            boxShadow: '0 0 25px rgba(255, 0, 85, 0.25)',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
            <h2 style={{ color: '#ff0055', margin: '0 0 12px 0', fontSize: '20px' }}>
              KIOSK RECOVERY MODE
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
              A UI rendering error occurred. The kiosk shield remains active.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#00f0ff',
                color: '#070913',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              RELOAD KIOSK INTERFACE
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
