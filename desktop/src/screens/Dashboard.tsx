import React, { useState, useEffect } from 'react';
import { SessionInfo, GameItem } from '../types';

interface DashboardProps {
  session: SessionInfo;
  onSessionEnd: () => void;
}

const PC_LABEL = import.meta.env.VITE_PC_LABEL || 'PC #1';
const PC_ID = import.meta.env.VITE_PC_ID || 'pc-001';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8000';

const DEFAULT_GAMES: GameItem[] = [
  {
    id: 'steam',
    name: 'Steam',
    category: 'Game Launcher',
    icon: '🎮',
    exePath: 'C:\\Program Files (x86)\\Steam\\steam.exe',
    popular: true,
  },
  {
    id: 'dota2',
    name: 'Dota 2',
    category: 'MOBA',
    icon: '🛡️',
    exePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\bin\\win64\\dota2.exe',
    popular: true,
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    category: 'Tactical FPS',
    icon: '🎯',
    exePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe',
    popular: true,
  },
  {
    id: 'browser',
    name: 'Web Browser',
    category: 'Internet',
    icon: '🌐',
    exePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    popular: false,
  },
  {
    id: 'valorant',
    name: 'Valorant',
    category: 'Tactical Shooter',
    icon: '⚡',
    exePath: 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
    popular: true,
  },
  {
    id: 'discord',
    name: 'Discord',
    category: 'Voice Chat',
    icon: '🎧',
    exePath: 'C:\\Users\\Admin\\AppData\\Local\\Discord\\Update.exe',
    popular: false,
  },
];

export default function Dashboard({ session, onSessionEnd }: DashboardProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(session.remainingSeconds);
  const [activeModal, setActiveModal] = useState<'food' | 'admin' | null>(null);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    setSecondsLeft(session.remainingSeconds);
  }, [session.remainingSeconds]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      onSessionEnd();
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsLeft, onSessionEnd]);

  // Format seconds into HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLaunchGame = async (game: GameItem) => {
    setLaunchStatus(`Launching ${game.name}...`);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.launchApp(game.exePath);
        if (result.success) {
          setLaunchStatus(`Started ${game.name} successfully!`);
        } else {
          setLaunchStatus(`Notice: ${result.error || 'Game process dispatched'}`);
        }
      } else {
        // Fallback in regular browser dev preview
        console.log(`[Dev] Simulating launch of ${game.name} at path: ${game.exePath}`);
        setLaunchStatus(`[Simulated] Launching ${game.name}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Launch failed';
      setLaunchStatus(`Error launching ${game.name}: ${msg}`);
    }

    setTimeout(() => setLaunchStatus(null), 4000);
  };

  const handleEndSession = async () => {
    if (confirm('Are you sure you want to end your gaming session?')) {
      try {
        await fetch(`${SERVER_URL}/v1/pc/${PC_ID}/lock`, { method: 'POST' });
      } catch (err) {
        console.error('Failed to send lock request', err);
      }
      onSessionEnd();
    }
  };

  const isLowTime = secondsLeft < 300; // < 5 minutes

  return (
    <div style={styles.container}>
      {/* Top Gamer Header */}
      <header className="glass-panel" style={styles.topBar}>
        <div style={styles.playerInfo}>
          <div style={styles.avatar}>🎮</div>
          <div>
            <div style={styles.welcomeText}>WELCOME BACK</div>
            <div style={styles.usernameText}>{session.username}</div>
          </div>
          <div style={styles.stationBadge}>{PC_LABEL}</div>
        </div>

        {/* Live Countdown Timer */}
        <div style={styles.timerCenter}>
          <div style={styles.timerLabel}>SESSION TIME REMAINING</div>
          <div
            style={{
              ...styles.timerValue,
              color: isLowTime ? '#ef4444' : '#00f0ff',
              textShadow: isLowTime
                ? '0 0 15px rgba(239, 68, 68, 0.6)'
                : '0 0 15px rgba(0, 240, 255, 0.5)',
            }}
          >
            {formatTime(secondsLeft)}
          </div>
        </div>

        {/* Balance & Actions */}
        <div style={styles.headerRight}>
          <div style={styles.balanceCard}>
            <span style={styles.balanceLabel}>CLUB BALANCE</span>
            <span style={styles.balanceValue}>
              {session.balanceKzt ? `${session.balanceKzt.toLocaleString()} ₸` : '5,000 ₸'}
            </span>
          </div>

          <button
            onClick={handleEndSession}
            className="cyber-button danger"
            style={styles.endSessionBtn}
          >
            LOGOUT
          </button>
        </div>
      </header>

      {/* Action Bar (Order Food / Call Admin) */}
      <div style={styles.quickActionsBar}>
        <button
          onClick={() => setActiveModal('food')}
          className="cyber-button"
          style={styles.actionBtn}
        >
          🍔 ORDER FOOD & DRINKS
        </button>
        <button
          onClick={() => setActiveModal('admin')}
          className="cyber-button secondary"
          style={styles.actionBtn}
        >
          🔔 CALL ADMIN / OPERATOR
        </button>

        {launchStatus && (
          <div style={styles.statusToast}>
            <span>⚡ {launchStatus}</span>
          </div>
        )}
      </div>

      {/* Main Game Launcher Grid */}
      <main style={styles.mainArea}>
        <div style={styles.sectionHeader}>
          <h2 className="cyber-glitch-text" style={styles.sectionTitle}>
            INSTALLED GAMES & APPS
          </h2>
          <span style={styles.sectionSub}>CLICK LAUNCH TO PLAY DIRECTLY</span>
        </div>

        <div style={styles.grid}>
          {DEFAULT_GAMES.map((game) => (
            <div key={game.id} className="glass-panel" style={styles.gameCard}>
              {game.popular && <div style={styles.popularBadge}>HOT</div>}
              <div style={styles.gameIconWrapper}>
                <span style={styles.gameEmoji}>{game.icon}</span>
              </div>
              <div style={styles.gameInfo}>
                <h3 style={styles.gameTitle}>{game.name}</h3>
                <span style={styles.gameCategory}>{game.category}</span>
              </div>
              <button
                onClick={() => handleLaunchGame(game)}
                className="cyber-button"
                style={styles.launchBtn}
              >
                PLAY NOW
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Food / Drinks Modal */}
      {activeModal === 'food' && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h2 className="cyber-glitch-text" style={styles.modalTitle}>CLUB BAR & SNACKS</h2>
            <p style={styles.modalSub}>Select snacks or energy drinks delivered to {PC_LABEL}</p>
            <div style={styles.menuGrid}>
              <div style={styles.menuItem}>
                <span>Red Bull Energy (250ml)</span>
                <span style={styles.priceTag}>1,200 ₸</span>
              </div>
              <div style={styles.menuItem}>
                <span>Monster Energy Ultra</span>
                <span style={styles.priceTag}>1,400 ₸</span>
              </div>
              <div style={styles.menuItem}>
                <span>Club Sandwich Combo</span>
                <span style={styles.priceTag}>2,500 ₸</span>
              </div>
              <div style={styles.menuItem}>
                <span>Pringles Sour Cream</span>
                <span style={styles.priceTag}>1,500 ₸</span>
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button
                className="cyber-button"
                onClick={() => {
                  alert(`Order placed for ${PC_LABEL}! The club administrator is on the way.`);
                  setActiveModal(null);
                }}
              >
                CONFIRM ORDER
              </button>
              <button
                className="cyber-button secondary"
                onClick={() => setActiveModal(null)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Call Admin Modal */}
      {activeModal === 'admin' && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <h2 className="cyber-purple-text" style={styles.modalTitle}>CALL ADMINISTRATOR</h2>
            <p style={styles.modalSub}>Station {PC_LABEL} is requesting assistance</p>
            <div style={{ margin: '20px 0', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              The club administrator has been notified via the admin console and will come to your station shortly.
            </div>
            <div style={styles.modalButtons}>
              <button
                className="cyber-button secondary"
                onClick={() => {
                  alert(`Administrator alerted for ${PC_LABEL}!`);
                  setActiveModal(null);
                }}
              >
                SEND NOTIFICATION
              </button>
              <button
                className="cyber-button"
                onClick={() => setActiveModal(null)}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '24px 32px',
    gap: '20px',
    overflowY: 'auto',
    zIndex: 1,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 28px',
  },
  playerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #00f0ff 0%, #a855f7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 0 15px rgba(0, 240, 255, 0.4)',
  },
  welcomeText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '11px',
    letterSpacing: '1.5px',
    color: 'var(--text-muted)',
  },
  usernameText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '18px',
    fontWeight: 700,
    color: '#fff',
    letterSpacing: '1px',
  },
  stationBadge: {
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontFamily: 'var(--font-cyber)',
    fontSize: '12px',
    color: '#00f0ff',
  },
  timerCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  },
  timerLabel: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '11px',
    letterSpacing: '2px',
    color: 'var(--text-muted)',
    marginBottom: '4px',
  },
  timerValue: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '36px',
    fontWeight: 900,
    letterSpacing: '2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  balanceCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    background: 'rgba(10, 15, 30, 0.6)',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
  },
  balanceLabel: {
    fontSize: '11px',
    fontFamily: 'var(--font-cyber)',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
  },
  balanceValue: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '18px',
    fontWeight: 700,
    color: '#10b981',
    textShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
  },
  endSessionBtn: {
    padding: '10px 18px',
    fontSize: '12px',
  },
  quickActionsBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  actionBtn: {
    fontSize: '13px',
    padding: '10px 20px',
  },
  statusToast: {
    background: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid var(--cyan-neon)',
    padding: '8px 16px',
    borderRadius: '6px',
    color: '#00f0ff',
    fontFamily: 'var(--font-cyber)',
    fontSize: '13px',
    animation: 'fadeIn 0.3s ease',
  },
  mainArea: {
    flex: '1',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  sectionTitle: {
    fontSize: '20px',
    letterSpacing: '1.5px',
  },
  sectionSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-cyber)',
    letterSpacing: '1px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  gameCard: {
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 20px',
    alignItems: 'center',
    textAlign: 'center',
    gap: '14px',
    position: 'relative',
    transition: 'all 0.25s ease',
  },
  popularBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#ff007f',
    color: '#fff',
    fontSize: '10px',
    fontFamily: 'var(--font-cyber)',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 700,
    boxShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
  },
  gameIconWrapper: {
    width: '72px',
    height: '72px',
    borderRadius: '16px',
    background: 'rgba(0, 240, 255, 0.08)',
    border: '1px solid rgba(0, 240, 255, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.15)',
  },
  gameEmoji: {
    fontSize: '36px',
  },
  gameInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gameTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'var(--font-cyber)',
    color: '#f8fafc',
  },
  gameCategory: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  launchBtn: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '12px',
    marginTop: '6px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modalContent: {
    width: '500px',
    padding: '32px',
    textAlign: 'center',
  },
  modalTitle: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  modalSub: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    marginBottom: '20px',
  },
  menuGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  menuItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'rgba(10, 15, 30, 0.6)',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
    fontSize: '14px',
  },
  priceTag: {
    color: '#00f0ff',
    fontWeight: 700,
    fontFamily: 'var(--font-cyber)',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
};
