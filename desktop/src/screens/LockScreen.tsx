import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const PC_LABEL = import.meta.env.VITE_PC_LABEL || 'PC #1';
const PC_ID = import.meta.env.VITE_PC_ID || 'pc-001';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';
const MOBILE_APP_URL = import.meta.env.VITE_MOBILE_APP_URL || 'https://pcclub.kz/app';

export default function LockScreen() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your username');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Send unlock request to the backend. Can hit /api/pc/{pc_id}/unlock or /v1/pc/{pc_id}/unlock
      const endpoints = [
        `${SERVER_URL}/api/pc/${PC_ID}/unlock`,
        `${SERVER_URL}/v1/pc/${PC_ID}/unlock`
      ];

      let response: Response | null = null;
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: username.trim(),
              password: password || undefined,
              remaining_seconds: 3600,
            }),
          });
          if (response.ok) break;
        } catch (err) {
          lastError = err as Error;
        }
      }

      if (response && response.ok) {
        // WebSocket will push the UNLOCK action to App.tsx
        setError(null);
      } else {
        const data = response ? await response.json().catch(() => ({})) : null;
        setError(data?.error?.message || data?.detail || lastError?.message || 'Failed to unlock PC. Check credentials.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Header Bar */}
      <header style={styles.header}>
        <div style={styles.logoBadge}>
          <span style={styles.logoDot}></span>
          <span style={styles.logoText}>CYBER CLUB ARENA</span>
        </div>
        <div style={styles.clockContainer}>
          <div style={styles.timeText}>{currentTime}</div>
          <div style={styles.dateText}>{currentDate}</div>
        </div>
      </header>

      {/* Main Lock Screen Content */}
      <main style={styles.mainContent}>
        {/* Left Side: PC Label & QR Code for Mobile */}
        <div className="glass-panel" style={styles.qrCard}>
          <div style={styles.kioskTitleBadge}>STATION LOCKED</div>
          <h1 className="cyber-glitch-text" style={styles.pcHeader}>
            {PC_LABEL}
          </h1>
          <p style={styles.subText}>Scan with PC Club Mobile App to book and start instantly</p>

          <div style={styles.qrWrapper}>
            <QRCodeSVG
              value={`${MOBILE_APP_URL}?pc_id=${encodeURIComponent(PC_ID)}`}
              size={180}
              bgColor="#070913"
              fgColor="#00f0ff"
              level="H"
              includeMargin={false}
            />
            <div style={styles.qrScannerBeam}></div>
          </div>

          <div style={styles.appPromoContainer}>
            <span style={styles.phoneIcon}>📱</span>
            <span style={styles.appPromoText}>Kaspi & Card Instant Payment Supported</span>
          </div>
        </div>

        {/* Right Side: Manual Staff / Player Login Form */}
        <div className="glass-panel" style={styles.loginCard}>
          <div style={styles.loginCardHeader}>
            <h2 style={styles.loginTitle}>PLAYER / STAFF LOGIN</h2>
            <p style={styles.loginSubTitle}>Enter your registered username to unlock</p>
          </div>

          <form onSubmit={handleManualUnlock} style={styles.form}>
            {error && <div style={styles.errorAlert}>{error}</div>}

            <div style={styles.inputGroup}>
              <label style={styles.label}>USERNAME / PHONE</label>
              <input
                type="text"
                className="cyber-input"
                placeholder="e.g. +7 701 555 4433 or Vaqlur"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>PASSWORD / PIN</label>
              <input
                type="password"
                className="cyber-input"
                placeholder="Enter password or leave blank for guest"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="cyber-button"
              disabled={loading}
              style={styles.submitButton}
            >
              {loading ? 'CONNECTING...' : 'UNLOCK SESSION'}
            </button>
          </form>

          <div style={styles.helpFooter}>
            Need help? Ask club reception or press the call button on your desk.
          </div>
        </div>
      </main>

      {/* Bottom Kiosk Status Bar */}
      <footer style={styles.footer}>
        <div style={styles.footerStatus}>
          <span style={styles.statusIndicator}></span>
          <span>SYSTEM READY • TERMINAL #{PC_ID}</span>
        </div>
        <div style={styles.footerHotkeys}>
          Developer Exit: <kbd style={styles.kbd}>Ctrl</kbd> + <kbd style={styles.kbd}>Shift</kbd> + <kbd style={styles.kbd}>Q</kbd>
        </div>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '32px 48px',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(14, 18, 36, 0.8)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '30px',
    padding: '8px 20px',
  },
  logoDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#00f0ff',
    boxShadow: '0 0 10px #00f0ff',
  },
  logoText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#f8fafc',
  },
  clockContainer: {
    textAlign: 'right',
  },
  timeText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '36px',
    fontWeight: 700,
    color: '#00f0ff',
    textShadow: '0 0 15px rgba(0, 240, 255, 0.5)',
    letterSpacing: '2px',
  },
  dateText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  mainContent: {
    display: 'flex',
    gap: '40px',
    justifyContent: 'center',
    alignItems: 'stretch',
    maxWidth: '1100px',
    width: '100%',
    margin: 'auto',
  },
  qrCard: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
    textAlign: 'center',
  },
  kioskTitleBadge: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '12px',
    color: '#ff007f',
    letterSpacing: '3px',
    marginBottom: '8px',
    padding: '4px 12px',
    borderRadius: '4px',
    background: 'rgba(255, 0, 127, 0.1)',
    border: '1px solid rgba(255, 0, 127, 0.3)',
  },
  pcHeader: {
    fontSize: '54px',
    marginBottom: '12px',
    lineHeight: '1.1',
  },
  subText: {
    color: 'var(--text-muted)',
    fontSize: '15px',
    marginBottom: '28px',
    maxWidth: '320px',
  },
  qrWrapper: {
    padding: '16px',
    borderRadius: '12px',
    background: '#070913',
    border: '2px solid rgba(0, 240, 255, 0.4)',
    boxShadow: '0 0 25px rgba(0, 240, 255, 0.25)',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  qrScannerBeam: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: '#00f0ff',
    boxShadow: '0 0 8px #00f0ff',
    animation: 'scanBeam 2.5s infinite linear',
  },
  appPromoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'var(--text-accent)',
    fontSize: '13px',
    fontWeight: 600,
  },
  phoneIcon: {
    fontSize: '16px',
  },
  appPromoText: {
    letterSpacing: '0.5px',
  },
  loginCard: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '40px',
  },
  loginCardHeader: {
    marginBottom: '24px',
  },
  loginTitle: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '22px',
    color: '#f8fafc',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  loginSubTitle: {
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '12px',
    color: 'var(--cyan-neon)',
    letterSpacing: '1px',
  },
  submitButton: {
    marginTop: '10px',
    width: '100%',
    padding: '14px',
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.15)',
    border: '1px solid #ef4444',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: '14px',
  },
  helpFooter: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '16px',
  },
  footerStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '13px',
    fontFamily: 'var(--font-cyber)',
    color: 'var(--text-muted)',
  },
  statusIndicator: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    boxShadow: '0 0 8px #10b981',
  },
  footerHotkeys: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  kbd: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    padding: '2px 6px',
    fontFamily: 'monospace',
    color: '#e2e8f0',
  },
};
