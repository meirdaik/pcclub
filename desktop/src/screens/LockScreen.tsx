import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SessionInfo } from '../types';
import { getAppConfig, initAppConfig } from '../services/config';
import { socketService } from '../services/socket';
import ConnectionSetupModal from '../components/ConnectionSetupModal';


interface LockScreenProps {
  onUnlock?: (session: SessionInfo) => void;
  onOpenAdmin?: () => void;
}

export default function LockScreen({ onUnlock, onOpenAdmin }: LockScreenProps) {
  const [config, setConfig] = useState(getAppConfig());
  const pcLabel = config.pcLabel;
  const pcId = config.pcId;
  const serverUrl = config.serverUrl;
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [username, setUsername] = useState('player1');
  const [password, setPassword] = useState('player123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(socketService.isConnected());
  const [qrToken, setQrToken] = useState<string>('init-token');
  const [reservation, setReservation] = useState<{
    isReserved: boolean;
    reservedFor?: string;
    reservedUntil?: string;
  } | null>(null);

  useEffect(() => {
    initAppConfig().then((cfg) => {
      setConfig(cfg);
    });

    const unsubscribe = socketService.onMessage((msg: any) => {
      // Rotating QR token update
      if (msg.qr_token) {
        setQrToken(msg.qr_token);
      }
      if (msg.type === 'qr_token_update' && msg.token) {
        setQrToken(msg.token);
      }

      // Reservation update from upcoming bookings
      if (msg.reservation) {
        setReservation({
          isReserved: true,
          reservedFor: msg.reservation.user,
          reservedUntil: msg.reservation.starts_at || msg.reservation.ends_at,
        });
      } else if (msg.type === 'reservation_update') {
        if (msg.is_reserved) {
          setReservation({
            isReserved: true,
            reservedFor: msg.reserved_for,
            reservedUntil: msg.starts_at || msg.ends_at,
          });
        } else {
          setReservation(null);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      );
      setIsWsConnected(socketService.isConnected());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Ctrl+Shift+S admin shortcut to open Connection Setup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        setIsSetupOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleManualUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setError('Please enter your username');
      return;
    }

    const isAdmin = trimmedUser.toLowerCase() === 'admin';

    // Enforce booking hold state
    if (reservation?.isReserved && reservation.reservedFor) {
      if (trimmedUser.toLowerCase() !== reservation.reservedFor.toLowerCase() && !isAdmin) {
        setError(`This station is reserved for @${reservation.reservedFor}. Only @${reservation.reservedFor} or Admin can log in.`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    let authSucceeded = false;
    let authData: any = null;

    try {
      const endpoints = [
        `${serverUrl}/api/pc/${pcId}/unlock`,
        `${serverUrl}/v1/pc/${pcId}/unlock`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: trimmedUser,
              password: password || undefined,
              remaining_seconds: isAdmin ? 99999 : 3600,
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (response.status === 401) {
            setError('Invalid username or password.');
            setLoading(false);
            return;
          }

          if (response.ok) {
            const resJson = await response.json();
            authData = resJson.data || resJson;
            authSucceeded = true;
            break;
          }
        } catch {
          // try next endpoint
        }
      }
    } catch (err: unknown) {
      console.warn('Backend sync failed:', err);
    } finally {
      setLoading(false);
    }

    if (authSucceeded && authData) {
      if (onUnlock) {
        onUnlock({
          username: authData.username || trimmedUser,
          remainingSeconds: authData.remaining_seconds || (isAdmin ? 99999 : 3600),
          isAdmin: Boolean(authData.is_admin || isAdmin),
          balanceKzt: authData.balance,
        });
      }
    } else {
      setError('Cannot connect to club server. Check Server IP in Setup (Ctrl+Shift+S).');
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
        <div style={styles.headerRightControls}>
          <button
            onClick={() => setIsSetupOpen(true)}
            className="cyber-button secondary"
            style={styles.setupBtn}
            title="Configure Server LAN IP and Station ID (Ctrl+Shift+S)"
          >
            ⚙️ SETUP
          </button>
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="cyber-button secondary"
              style={styles.adminMapBtn}
              title="Open Cashier & Club Administration Map"
            >
              🖥️ CASHIER MAP
            </button>
          )}
          <div style={styles.clockContainer}>
            <div style={styles.timeText}>{currentTime}</div>
            <div style={styles.dateText}>{currentDate}</div>
          </div>
        </div>
      </header>

      {/* Disconnection Warning Ribbon */}
      {!isWsConnected && (
        <div
          onClick={() => setIsSetupOpen(true)}
          style={styles.disconnectedBanner}
          title="Click to configure Server IP"
        >
          <span>⚠️ Server Disconnected at {serverUrl} — Click here or press Ctrl+Shift+S to open Connection Setup</span>
        </div>
      )}

      {/* Main Lock Screen Content */}
      <main style={styles.mainContent}>
        {/* Left Side: PC Label & QR Code for Mobile */}
        <div className="glass-panel" style={styles.qrCard}>
          {reservation?.isReserved ? (
            <div style={styles.reservedBanner}>
              <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>🔒 RESERVED STATION</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#ffea00', margin: '4px 0' }}>
                FOR @{reservation.reservedFor?.toUpperCase()}
              </div>
              <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                Hold active until {reservation.reservedUntil ? new Date(reservation.reservedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'match time'}
              </div>
            </div>
          ) : (
            <div style={styles.kioskTitleBadge}>STATION LOCKED</div>
          )}
          <h1 className="cyber-glitch-text" style={styles.pcHeader}>
            {pcLabel}
          </h1>
          <p style={styles.subText}>
            {reservation?.isReserved
              ? `Scan or log in as @${reservation.reservedFor} to start your booked slot`
              : 'Scan with PC Club Mobile App to start instantly'}
          </p>

          <div style={styles.qrWrapper}>
            <QRCodeSVG
              value={JSON.stringify({ pc_id: pcId, qr_token: qrToken })}
              size={180}
              bgColor="#070913"
              fgColor="#00f0ff"
              level="H"
              includeMargin={false}
            />
            <div style={styles.qrScannerBeam}></div>
          </div>

          <div style={styles.tokenStatusBadge}>
            <span style={{ color: '#00ff88', fontSize: '11px', fontWeight: 'bold' }}>
              ⚡ Dynamic Anti-Replay QR Active
            </span>
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
          <span>SYSTEM READY • TERMINAL #{pcId}</span>
        </div>
        <div style={styles.footerHotkeys}>
          Setup: <kbd style={styles.kbd}>Ctrl</kbd> + <kbd style={styles.kbd}>Shift</kbd> + <kbd style={styles.kbd}>S</kbd> | Emergency Exit: <kbd style={styles.kbd}>Ctrl</kbd> + <kbd style={styles.kbd}>Shift</kbd> + <kbd style={styles.kbd}>Q</kbd>
        </div>
      </footer>

      {/* Station & Server Connection Setup Modal */}
      {isSetupOpen && (
        <ConnectionSetupModal
          onClose={() => setIsSetupOpen(false)}
          onSaved={() => {
            setConfig(getAppConfig());
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  setupBtn: {
    padding: '8px 16px',
    fontSize: '12px',
    letterSpacing: '0.8px',
  },
  reservedBanner: {
    padding: '12px 16px',
    backgroundColor: 'rgba(181, 23, 158, 0.25)',
    border: '1px solid #ffea00',
    borderRadius: '10px',
    textAlign: 'center',
    marginBottom: '12px',
    boxShadow: '0 0 15px rgba(255, 234, 0, 0.25)',
  },
  tokenStatusBadge: {
    marginTop: '10px',
    padding: '4px 12px',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '20px',
  },
  disconnectedBanner: {
    margin: '10px 0',
    padding: '10px 18px',
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    border: '1px solid #ff0055',
    borderRadius: '8px',
    color: '#ff4d88',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 0 12px rgba(255, 0, 85, 0.25)',
  },
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
  headerRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
  },
  adminMapBtn: {
    padding: '8px 18px',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    borderColor: 'rgba(0, 240, 255, 0.5)',
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
