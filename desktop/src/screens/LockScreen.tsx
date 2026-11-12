import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Cpu, HardDrive, Wifi, Lock, Zap, Monitor, Sparkles, CheckCircle2, KeyRound } from 'lucide-react';
import { SessionInfo } from '../types';
import { getAppConfig, initAppConfig } from '../services/config';
import { socketService } from '../services/socket';
import ConnectionSetupModal from '../components/ConnectionSetupModal';
import ParallaxBackground from '../components/ParallaxBackground';

interface LockScreenProps {
  onUnlock?: (session: SessionInfo) => void;
  onOpenAdmin?: () => void;
}

interface TariffPill {
  id: string;
  name: string;
  price: string;
  durationSec: number;
  badge?: string;
}

const TARIFFS: TariffPill[] = [
  { id: '1h', name: '1 HOUR', price: '1,000₸', durationSec: 3600 },
  { id: '3h', name: '3 HOURS PACK', price: '2,500₸', durationSec: 10800, badge: 'HOT' },
  { id: '5h', name: '5 HOURS PRO', price: '3,800₸', durationSec: 18000, badge: 'POPULAR' },
  { id: 'night', name: 'ALL-NIGHT VIP', price: '5,500₸', durationSec: 28800, badge: 'BEST VALUE' },
];

export default function LockScreen({ onUnlock, onOpenAdmin }: LockScreenProps) {
  const [config, setConfig] = useState(getAppConfig());
  const pcLabel = config.pcLabel || 'PC #1';
  const pcId = config.pcId || 'pc-001';
  const serverUrl = config.serverUrl;

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [username, setUsername] = useState('player1');
  const [password, setPassword] = useState('player123');
  const [selectedTariff, setSelectedTariff] = useState<TariffPill>(TARIFFS[0]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(socketService.isConnected());
  const [qrToken, setQrToken] = useState<string>('init-token');
  const [tokenAge, setTokenAge] = useState<number>(0);
  const [reservation, setReservation] = useState<{
    isReserved: boolean;
    reservedFor?: string;
    reservedUntil?: string;
  } | null>(null);

  // Parallax mouse position for Hero Watermark
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    initAppConfig().then((cfg) => {
      setConfig(cfg);
    });

    const unsubscribe = socketService.onMessage((msg: any) => {
      if (msg.qr_token) {
        setQrToken(msg.qr_token);
        setTokenAge(0);
      }
      if (msg.type === 'qr_token_update' && msg.token) {
        setQrToken(msg.token);
        setTokenAge(0);
      }

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
      setTokenAge((prev) => (prev >= 100 ? 0 : prev + 5));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
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
              remaining_seconds: isAdmin ? 99999 : selectedTariff.durationSec,
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
          remainingSeconds: authData.remaining_seconds || (isAdmin ? 99999 : selectedTariff.durationSec),
          isAdmin: Boolean(authData.is_admin || isAdmin),
          balanceKzt: authData.balance,
        });
      }
    } else {
      setError('Cannot connect to club server. Check Server IP in Setup (Ctrl+Shift+S).');
    }
  };

  return (
    <ParallaxBackground>
      <div style={styles.container}>
        {/* Giant Ambient Watermark */}
        <div
          style={{
            ...styles.giantWatermark,
            transform: `translate3d(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px, 0)`,
          }}
        >
          {pcLabel.toUpperCase()}
        </div>

        {/* Top Header Bar */}
        <header style={styles.header}>
          <div style={styles.logoBadge}>
            <div style={styles.logoDotPulse} />
            <span style={styles.logoText}>CYBER CLUB ARENA</span>
            <span style={styles.arenaStatusPill}>
              <Sparkles size={11} style={{ marginRight: 4 }} />
              VIP ESPORTS RIG
            </span>
          </div>

          <div style={styles.headerRightControls}>
            <button
              onClick={() => setIsSetupOpen(true)}
              className="cyber-button secondary"
              style={styles.headerBtn}
              title="Configure Server LAN IP and Station ID (Ctrl+Shift+S)"
            >
              <Monitor size={13} style={{ marginRight: 6 }} /> SETUP
            </button>
            {onOpenAdmin && (
              <button
                onClick={onOpenAdmin}
                className="cyber-button secondary"
                style={styles.headerBtn}
                title="Open Cashier & Club Administration Map"
              >
                <KeyRound size={13} style={{ marginRight: 6 }} /> CASHIER MAP
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
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setIsSetupOpen(true)}
            style={styles.disconnectedBanner}
            title="Click to configure Server IP"
          >
            <span>⚠️ Server Disconnected at {serverUrl} — Click here or press Ctrl+Shift+S to open Connection Setup</span>
          </motion.div>
        )}

        {/* Main Attract-Mode Split Screen */}
        <main style={styles.mainContent}>
          {/* Left Hero Card: Dynamic QR & Station Showcase */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={styles.glassCard}
          >
            {reservation?.isReserved ? (
              <div style={styles.reservedBanner}>
                <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '2px', color: '#ffea00' }}>
                  🔒 RESERVED STATION
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', margin: '4px 0' }}>
                  FOR @{reservation.reservedFor?.toUpperCase()}
                </div>
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                  Active until {reservation.reservedUntil ? new Date(reservation.reservedUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'match time'}
                </div>
              </div>
            ) : (
              <div style={styles.kioskTitleBadge}>
                <Shield size={12} color="#00f0ff" />
                <span>TERMINAL LOCKED • READY TO PLAY</span>
              </div>
            )}

            <h1 style={styles.pcHeader}>{pcLabel}</h1>
            <p style={styles.subText}>
              {reservation?.isReserved
                ? `Scan or log in as @${reservation.reservedFor} to start your booked slot`
                : 'Scan dynamic QR with PC Club Mobile to start instantly with Kaspi & Card'}
            </p>

            {/* Futuristic QR Portal with Moving Laser Beam */}
            <div style={styles.qrPortal}>
              <div style={styles.qrCornerTL} />
              <div style={styles.qrCornerTR} />
              <div style={styles.qrCornerBL} />
              <div style={styles.qrCornerBR} />
              <div style={styles.qrLaserBeam} />

              <QRCodeSVG
                value={JSON.stringify({ pc_id: pcId, qr_token: qrToken })}
                size={180}
                bgColor="#090d1e"
                fgColor="#00f0ff"
                level="H"
                includeMargin={false}
              />
            </div>

            {/* Rotating Token Progress Bar */}
            <div style={styles.tokenStatusContainer}>
              <div style={styles.tokenStatusText}>
                <span>⚡ Dynamic Anti-Replay QR</span>
                <span style={{ color: '#00ff88', fontFamily: 'monospace' }}>SECURE</span>
              </div>
              <div style={styles.tokenProgressBarTrack}>
                <div style={{ ...styles.tokenProgressBarFill, width: `${100 - tokenAge}%` }} />
              </div>
            </div>

            <div style={styles.specFeatures}>
              <div style={styles.specItem}>
                <CheckCircle2 size={13} color="#00ff88" />
                <span>RTX 4080 Super • 360Hz OLED</span>
              </div>
              <div style={styles.specItem}>
                <CheckCircle2 size={13} color="#00ff88" />
                <span>Vanguard & FaceIt Anti-Cheat Ready</span>
              </div>
            </div>
          </motion.div>

          {/* Right Hero Card: Quick Tariffs & Player Login */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            style={styles.glassCard}
          >
            <div style={styles.cardHeader}>
              <h2 style={styles.cardTitle}>PLAYER AUTHENTICATION</h2>
              <p style={styles.cardSubtitle}>Select a session package and enter your credentials</p>
            </div>

            {/* Interactive Tariff Pills */}
            <div style={styles.tariffGrid}>
              {TARIFFS.map((t) => {
                const isSelected = selectedTariff.id === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTariff(t)}
                    style={{
                      ...styles.tariffPill,
                      borderColor: isSelected ? '#00f0ff' : 'rgba(255, 255, 255, 0.08)',
                      backgroundColor: isSelected ? 'rgba(0, 240, 255, 0.12)' : 'rgba(15, 23, 42, 0.6)',
                      boxShadow: isSelected ? '0 0 16px rgba(0, 240, 255, 0.3)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: isSelected ? '#00f0ff' : '#cbd5e1' }}>
                        {t.name}
                      </span>
                      {t.badge && (
                        <span style={styles.tariffBadge}>{t.badge}</span>
                      )}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff', marginTop: 3 }}>
                      {t.price}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleManualUnlock} style={styles.form}>
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={styles.errorAlert}
                  >
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>USERNAME / PHONE</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="e.g. +7 701 555 4433 or Vaqlur"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.inputField}
                    autoFocus
                  />
                </div>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.inputLabel}>PASSWORD / PIN</label>
                <div style={styles.inputWrapper}>
                  <input
                    type="password"
                    className="cyber-input"
                    placeholder="Enter password or leave blank for guest"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.inputField}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="shimmer-button"
                disabled={loading}
                style={styles.submitBtn}
              >
                <Zap size={16} style={{ marginRight: 8 }} />
                {loading ? 'AUTHENTICATING STATION...' : `START SESSION (${selectedTariff.price})`}
              </button>
            </form>

            <div style={styles.helpFooter}>
              <span>Need help or cash top-up? Press <b>Call Reception</b> or visit the cashier desk.</span>
            </div>
          </motion.div>
        </main>

        {/* Bottom Sleek Frosted Telemetry Dock */}
        <footer style={styles.telemetryDock}>
          <div style={styles.dockLeft}>
            <div style={styles.dockItem}>
              <Cpu size={14} color="#00f0ff" />
              <span>CPU: <b>INTEL I7-14700KF</b></span>
            </div>
            <div style={styles.dockItem}>
              <HardDrive size={14} color="#a855f7" />
              <span>RAM: <b>64GB DDR5</b></span>
            </div>
            <div style={styles.dockBadgeGreen}>
              <Shield size={12} style={{ marginRight: 4 }} />
              UEFI SECURE BOOT: ACTIVE
            </div>
          </div>

          <div style={styles.dockRight}>
            <div style={styles.dockItem}>
              <Wifi size={14} color={isWsConnected ? '#00ff88' : '#ff0055'} />
              <span>SERVER LAN: <b>{serverUrl.replace(/^https?:\/\//, '')}</b></span>
            </div>
            <div style={styles.hotkeyTag}>
              <Lock size={12} style={{ marginRight: 4 }} />
              ADMIN: <kbd style={styles.kbd}>Ctrl+Shift+A</kbd>
            </div>
          </div>
        </footer>

        {/* Station Setup Modal */}
        {isSetupOpen && (
          <ConnectionSetupModal
            onClose={() => setIsSetupOpen(false)}
            onSaved={() => {
              setConfig(getAppConfig());
            }}
          />
        )}
      </div>
    </ParallaxBackground>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '24px 36px',
    justifyContent: 'space-between',
    position: 'relative',
  },
  giantWatermark: {
    position: 'absolute',
    top: '30%',
    left: '8%',
    fontFamily: 'var(--font-cyber)',
    fontSize: '180px',
    fontWeight: 900,
    color: 'rgba(0, 240, 255, 0.03)',
    letterSpacing: '12px',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
    whiteSpace: 'nowrap',
    willChange: 'transform',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    zIndex: 5,
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(15, 23, 42, 0.75)',
    border: '1px solid rgba(0, 240, 255, 0.25)',
    borderRadius: '30px',
    padding: '8px 20px',
    backdropFilter: 'blur(16px)',
  },
  logoDotPulse: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#00f0ff',
    boxShadow: '0 0 12px #00f0ff',
    animation: 'pulse 1.5s infinite',
  },
  logoText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '2px',
    color: '#f8fafc',
  },
  arenaStatusPill: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 800,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    color: '#c084fc',
    border: '1px solid rgba(168, 85, 247, 0.35)',
    padding: '2px 8px',
    borderRadius: '12px',
    letterSpacing: '1px',
  },
  headerRightControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  headerBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '7px 14px',
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    borderRadius: '8px',
  },
  clockContainer: {
    textAlign: 'right',
  },
  timeText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '32px',
    fontWeight: 800,
    color: '#00f0ff',
    textShadow: '0 0 18px rgba(0, 240, 255, 0.4)',
    letterSpacing: '2px',
    lineHeight: 1,
  },
  dateText: {
    fontSize: '12px',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginTop: '4px',
  },
  disconnectedBanner: {
    margin: '10px 0',
    padding: '10px 18px',
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    border: '1px solid #ff0055',
    borderRadius: '8px',
    color: '#ff4d88',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: '0 0 16px rgba(255, 0, 85, 0.25)',
    backdropFilter: 'blur(12px)',
    zIndex: 5,
  },
  mainContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '32px',
    flex: 1,
    padding: '20px 0',
    zIndex: 5,
  },
  glassCard: {
    flex: 1,
    maxWidth: '480px',
    minHeight: '490px',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(0, 240, 255, 0.22)',
    borderRadius: '24px',
    padding: '32px',
    backdropFilter: 'blur(28px)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 240, 255, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    position: 'relative',
  },
  reservedBanner: {
    padding: '12px 16px',
    backgroundColor: 'rgba(181, 23, 158, 0.25)',
    border: '1px solid #ffea00',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '10px',
    boxShadow: '0 0 20px rgba(255, 234, 0, 0.3)',
  },
  kioskTitleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '14px',
    fontSize: '10px',
    fontWeight: 800,
    color: '#00f0ff',
    letterSpacing: '1px',
    width: 'fit-content',
  },
  pcHeader: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '38px',
    fontWeight: 900,
    color: '#f8fafc',
    letterSpacing: '2px',
    margin: '8px 0 4px 0',
    textShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
  },
  subText: {
    fontSize: '13px',
    color: '#94a3b8',
    lineHeight: 1.4,
    marginBottom: '12px',
  },
  qrPortal: {
    position: 'relative',
    width: '210px',
    height: '210px',
    margin: '0 auto',
    padding: '15px',
    backgroundColor: '#090d1e',
    borderRadius: '16px',
    border: '1px solid rgba(0, 240, 255, 0.35)',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrCornerTL: { position: 'absolute', top: 4, left: 4, width: 12, height: 12, borderTop: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff' },
  qrCornerTR: { position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderTop: '2px solid #00f0ff', borderRight: '2px solid #00f0ff' },
  qrCornerBL: { position: 'absolute', bottom: 4, left: 4, width: 12, height: 12, borderBottom: '2px solid #00f0ff', borderLeft: '2px solid #00f0ff' },
  qrCornerBR: { position: 'absolute', bottom: 4, right: 4, width: 12, height: 12, borderBottom: '2px solid #00f0ff', borderRight: '2px solid #00f0ff' },
  qrLaserBeam: {
    position: 'absolute',
    left: '5%',
    width: '90%',
    height: '3px',
    backgroundColor: '#00f0ff',
    boxShadow: '0 0 12px #00f0ff, 0 0 24px #00f0ff',
    animation: 'scanlineLaser 2.2s ease-in-out infinite',
    zIndex: 3,
  },
  tokenStatusContainer: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: 'rgba(10, 16, 32, 0.65)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  tokenStatusText: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 700,
    color: '#cbd5e1',
    marginBottom: '6px',
  },
  tokenProgressBarTrack: {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  tokenProgressBarFill: {
    height: '100%',
    backgroundColor: '#00f0ff',
    boxShadow: '0 0 8px #00f0ff',
    transition: 'width 1s linear',
  },
  specFeatures: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginTop: '10px',
  },
  specItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#cbd5e1',
  },
  cardHeader: {
    marginBottom: '12px',
  },
  cardTitle: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '18px',
    fontWeight: 800,
    color: '#00f0ff',
    letterSpacing: '1px',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  tariffGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '16px',
  },
  tariffPill: {
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  tariffBadge: {
    fontSize: '8px',
    fontWeight: 900,
    padding: '2px 5px',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 0, 127, 0.25)',
    color: '#ff007f',
    letterSpacing: '0.5px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  errorAlert: {
    padding: '10px 14px',
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    border: '1px solid #ff0055',
    borderRadius: '8px',
    color: '#ff4d88',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px',
  },
  inputLabel: {
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#94a3b8',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputField: {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'rgba(9, 14, 28, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  submitBtn: {
    marginTop: '6px',
    padding: '12px',
    borderRadius: '10px',
    border: 'none',
    color: '#070913',
    fontWeight: 900,
    fontSize: '13px',
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpFooter: {
    fontSize: '11px',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '12px',
  },
  telemetryDock: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 24px',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
    zIndex: 5,
  },
  dockLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  dockRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  dockItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#cbd5e1',
  },
  dockBadgeGreen: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 800,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    color: '#00ff88',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    padding: '3px 10px',
    borderRadius: '12px',
    letterSpacing: '1px',
  },
  hotkeyTag: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: '#94a3b8',
  },
  kbd: {
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    color: '#00f0ff',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    border: '1px solid rgba(0, 240, 255, 0.25)',
    marginLeft: '4px',
  },
};
