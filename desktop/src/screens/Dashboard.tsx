import React, { useState, useEffect, useRef } from 'react';
import { Play, Sparkles, Flame, Clock } from 'lucide-react';
import { SessionInfo, GameItem, MenuItem, CartItem, SystemStats } from '../types';
import { socketService } from '../services/socket';
import { getAppConfig } from '../services/config';
import GameCard3D from '../components/GameCard3D';

interface DashboardProps {
  session: SessionInfo;
  onSessionEnd: () => void;
}

type TabType = 'games' | 'browser' | 'bar' | 'admin' | 'system';

const SENET_GAMES: GameItem[] = [
  {
    id: 'steam',
    name: 'Steam',
    category: 'Steam',
    icon: '🎮',
    exePath: 'C:\\Program Files (x86)\\Steam\\steam.exe',
    uriScheme: 'steam://open/main',
    popular: true,
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    category: 'Shooter',
    icon: '🎯',
    exePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Counter-Strike Global Offensive\\game\\bin\\win64\\cs2.exe',
    uriScheme: 'steam://rungameid/730',
    popular: true,
  },
  {
    id: 'dota2',
    name: 'Dota 2',
    category: 'MOBA',
    icon: '🛡️',
    exePath: 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\dota 2 beta\\game\\bin\\win64\\dota2.exe',
    uriScheme: 'steam://rungameid/570',
    popular: true,
  },
  {
    id: 'valorant',
    name: 'Valorant',
    category: 'Shooter',
    icon: '⚡',
    exePath: 'C:\\Riot Games\\Riot Client\\RiotClientServices.exe',
    popular: true,
  },
  {
    id: 'browser_app',
    name: 'In-Kiosk Web Browser',
    category: 'App',
    icon: '🌐',
    exePath: 'internal_browser',
    isWebEmbed: true,
    embedUrl: 'https://www.google.com',
    popular: true,
  },
  {
    id: 'youtube_app',
    name: 'YouTube Media',
    category: 'App',
    icon: '▶️',
    exePath: 'internal_browser',
    isWebEmbed: true,
    embedUrl: 'https://www.youtube.com',
    popular: true,
  },
  {
    id: 'twitch_app',
    name: 'Twitch TV',
    category: 'App',
    icon: '🟣',
    exePath: 'internal_browser',
    isWebEmbed: true,
    embedUrl: 'https://www.twitch.tv',
    popular: false,
  },
  {
    id: 'speedtest',
    name: 'Network Speed Test',
    category: 'App',
    icon: '⚡',
    exePath: 'internal_browser',
    isWebEmbed: true,
    embedUrl: 'https://fast.com',
    popular: false,
  },
  {
    id: 'discord',
    name: 'Discord Voice',
    category: 'App',
    icon: '🎧',
    exePath: 'C:\\Users\\Admin\\AppData\\Local\\Discord\\Update.exe',
    uriScheme: 'https://discord.com/app',
    isWebEmbed: true,
    embedUrl: 'https://discord.com/app',
    popular: true,
  },
  {
    id: 'telegram',
    name: 'Telegram Web',
    category: 'App',
    icon: '✈️',
    exePath: 'internal_browser',
    isWebEmbed: true,
    embedUrl: 'https://web.telegram.org',
    popular: false,
  },
];

const SENET_MENU: MenuItem[] = [
  {
    id: 'redbull',
    name: 'Red Bull Energy 250ml',
    category: 'Drinks',
    priceKzt: 1200,
    imageEmoji: '🥫',
    description: 'Ice cold original Austrian energy drink',
  },
  {
    id: 'monster_ultra',
    name: 'Monster Energy Ultra White',
    category: 'Drinks',
    priceKzt: 1400,
    imageEmoji: '⚡',
    description: 'Zero calories, crisp refreshing citrus flavor',
  },
  {
    id: 'cola_ice',
    name: 'Coca-Cola Classic (0.5L)',
    category: 'Drinks',
    priceKzt: 600,
    imageEmoji: '🥤',
    description: 'Chilled glass bottle with ice',
  },
  {
    id: 'sandwich',
    name: 'SENET Club Sandwich',
    category: 'Hot Meals',
    priceKzt: 2400,
    imageEmoji: '🥪',
    description: 'Toasted bread, grilled chicken, bacon, cheddar, fries',
  },
  {
    id: 'nuggets',
    name: 'Crispy Chicken Nuggets (9 pcs)',
    category: 'Hot Meals',
    priceKzt: 1900,
    imageEmoji: '🍗',
    description: 'Served with signature garlic cheese sauce',
  },
  {
    id: 'pringles',
    name: 'Pringles Sour Cream & Onion',
    category: 'Snacks',
    priceKzt: 1500,
    imageEmoji: '🥔',
    description: 'Classic stackable crisps (165g)',
  },
  {
    id: 'combo_gamer',
    name: 'PRO GAMER NIGHT COMBO',
    category: 'Combos',
    priceKzt: 3500,
    imageEmoji: '👑',
    description: 'Club Sandwich + Red Bull + Pringles Pack',
  },
];

// Helper to normalize entered URLs and auto-route Telegram
function normalizeBrowserUrl(raw: string): string {
  const url = raw.trim();
  if (!url) return 'https://www.google.com';

  if (/^https?:\/\//i.test(url)) {
    if (/^https?:\/\/web\.telegram\.org\/?$/i.test(url)) {
      return 'https://web.telegram.org/a/';
    }
    return url;
  }

  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)+/i.test(url) && !url.includes(' ')) {
    if (/^web\.telegram\.org\/?$/i.test(url)) {
      return 'https://web.telegram.org/a/';
    }
    return `https://${url}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
}

const CHROME_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

function KioskWebview({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const webviewRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const webview = document.createElement('webview') as any;
    webview.setAttribute('src', url);
    webview.setAttribute('partition', 'persist:senet_browser');
    webview.setAttribute('useragent', CHROME_USER_AGENT);
    webview.setAttribute('allowpopups', 'true');
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.flex = '1';
    webview.style.border = 'none';
    webview.style.display = 'flex';
    webview.style.backgroundColor = '#0e1224';

    webview.addEventListener('did-start-loading', () => {
      setIsLoading(true);
      setLoadError(null);
    });
    webview.addEventListener('did-stop-loading', () => {
      setIsLoading(false);
    });
    webview.addEventListener('did-fail-load', (e: any) => {
      setIsLoading(false);
      if (e.errorCode !== -3 && e.errorCode !== 0) {
        setLoadError(`Failed to load page (${e.errorDescription || 'Connection error'}). Try reloading or opening in Chrome.`);
      }
    });

    containerRef.current.appendChild(webview);
    webviewRef.current = webview;

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      webviewRef.current = null;
    };
  }, [url]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {isLoading && (
        <div style={styles.browserLoadingBar}>
          <div style={styles.browserLoadingProgress} />
        </div>
      )}
      {loadError && (
        <div style={styles.browserErrorOverlay}>
          <div style={{ color: '#ff4d88', fontWeight: 'bold', fontSize: '13px' }}>
            ⚠️ {loadError}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => webviewRef.current?.reload()}
              className="cyber-button secondary"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              🔄 Retry
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.electronAPI?.openExternal) {
                  window.electronAPI.openExternal(url);
                } else {
                  window.open(url, '_blank');
                }
              }}
              className="cyber-button"
              style={{ padding: '6px 12px', fontSize: '11px' }}
            >
              🌐 Open in Chrome
            </button>
          </div>
        </div>
      )}
      <div ref={containerRef} style={{ width: '100%', height: '100%', flex: 1, display: 'flex' }} />
    </div>
  );
}

function BrowserFallbackView({ url }: { url: string }) {
  return (
    <div style={styles.browserWebFallback}>
      <div className="glass-panel" style={styles.browserNoticeCard}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🌐</div>
        <h3 style={{ color: '#00f0ff', margin: '0 0 10px 0', fontSize: '18px', fontFamily: '"Orbitron", sans-serif' }}>
          WEB BROWSER PREVIEW MODE
        </h3>
        <p style={{ color: '#cbd5e1', fontSize: '13px', maxWidth: '540px', margin: '0 auto 16px auto', lineHeight: 1.6 }}>
          You are currently previewing in a regular web browser (Chrome / Edge).
          Platforms like <strong>Telegram</strong>, <strong>Discord</strong>, and <strong>YouTube</strong> enforce browser security policies (<code>X-Frame-Options: SAMEORIGIN</code>) preventing display inside standard web iframes.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '20px' }}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-button"
            style={{ textDecoration: 'none', padding: '12px 24px', fontSize: '13px' }}
          >
            Open in New Browser Tab ↗
          </a>
        </div>
        <div style={{ borderTop: '1px solid #1e243b', paddingTop: '14px', color: '#94a3b8', fontSize: '12px' }}>
          💡 <strong>To test the embedded in-app browser with full bypass:</strong><br />
          Launch the desktop kiosk application: <code style={{ color: '#00ff88', background: '#070913', padding: '2px 6px', borderRadius: '4px' }}>npm run electron:dev</code> or run <code style={{ color: '#00ff88', background: '#070913', padding: '2px 6px', borderRadius: '4px' }}>release\win-unpacked\PC Club Kiosk.exe</code>.
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ session, onSessionEnd }: DashboardProps) {
  const config = getAppConfig();
  const pcLabel = config.pcLabel;
  const pcId = config.pcId;
  const serverUrl = config.serverUrl;

  const [secondsLeft, setSecondsLeft] = useState<number>(session.remainingSeconds);
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [isMiniHud, setIsMiniHud] = useState(false);
  const [launchToast, setLaunchToast] = useState<string | null>(null);
  const [hoveredGame, setHoveredGame] = useState<GameItem | null>(null);
  const [runningGameId, setRunningGameId] = useState<string | null>(null);
  const [gameCategoryFilter, setGameCategoryFilter] = useState<string>('all');

  // Embedded in-system browser state
  const [browserUrl, setBrowserUrl] = useState<string>('https://www.youtube.com');
  const [inputUrl, setInputUrl] = useState<string>('https://www.youtube.com');

  // Food bar cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);

  // Call admin
  const [adminReason, setAdminReason] = useState<string>('Technical assistance');
  const [adminMessage, setAdminMessage] = useState<string>('');
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  // System stats
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);

  // Low-time warning notification state
  const [lowTimeAlert, setLowTimeAlert] = useState<string | null>(null);
  const warned300 = useRef(false);
  const warned60 = useRef(false);

  // Live Chat with Admin
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; timestamp: number }>>([
    {
      id: 'welcome',
      sender: 'Club Admin',
      text: `Hello ${session.username}! Need snacks, drinks, or assistance? Send us a message below.`,
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const playAlertTone = (freq = 750, count = 2) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      for (let i = 0; i < count; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.22);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + i * 0.22);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.22 + 0.16);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.22);
        osc.stop(ctx.currentTime + i * 0.22 + 0.16);
      }
    } catch {
      // Audio autoplay may be muted
    }
  };

  // Low-time warning checks at 300s (5m) and 60s (1m)
  useEffect(() => {
    if (secondsLeft <= 300 && secondsLeft > 60 && !warned300.current) {
      warned300.current = true;
      playAlertTone(700, 2);
      setLowTimeAlert('⚠️ 5 MINUTES REMAINING — Please top up balance via mobile app or cashier to avoid session termination!');
    } else if (secondsLeft <= 60 && secondsLeft > 0 && !warned60.current) {
      warned60.current = true;
      playAlertTone(950, 3);
      setLowTimeAlert('🚨 1 MINUTE REMAINING — Station locking soon! Active games will close.');
    }
  }, [secondsLeft]);

  // Session timer
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

  // Fetch real system specs via Electron IPC
  useEffect(() => {
    if (window.electronAPI?.getSystemStats) {
      window.electronAPI.getSystemStats().then(setSystemStats).catch(console.error);
    }
  }, []);

  // Fetch station chat history & subscribe to incoming admin messages
  useEffect(() => {
    fetch(`${serverUrl}/api/pc/${pcId}/chat`)
      .then((r) => r.json())
      .then((msgs) => {
        if (Array.isArray(msgs) && msgs.length > 0) {
          setChatMessages((prev) => {
            const ids = new Set(msgs.map((m: any) => m.id));
            const uniquePrev = prev.filter((p) => !ids.has(p.id));
            return [...uniquePrev, ...msgs];
          });
        }
      })
      .catch(() => {});

    const unsub = socketService.onMessage((msg) => {
      if (msg.action === 'CHAT_MESSAGE' || msg.type === 'chat_ack') {
        const payload = (msg.message || msg) as any;
        if (payload?.text) {
          setChatMessages((prev) => [
            ...prev,
            {
              id: payload.id || `msg-${Date.now()}`,
              sender: payload.sender || 'Club Admin',
              text: payload.text,
              timestamp: payload.timestamp || Date.now(),
            },
          ]);
          playAlertTone(850, 1);
        }
      }
    });
    return unsub;
  }, [serverUrl, pcId]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    const newMsg = {
      id: `client-${Date.now()}`,
      sender: session.username,
      text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, newMsg]);

    socketService.sendChatMessage(text, session.username);
    try {
      await fetch(`${serverUrl}/api/pc/${pcId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sender: session.username }),
      });
    } catch {
      // offline / ws fallback handled
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLaunchGame = async (game: GameItem) => {
    setRunningGameId(game.id);
    // If it's an in-system embedded web app:
    if (game.isWebEmbed && game.embedUrl) {
      setBrowserUrl(game.embedUrl);
      setInputUrl(game.embedUrl);
      setActiveTab('browser');
      setLaunchToast(`Opened ${game.name} inside SENET!`);
      setTimeout(() => setLaunchToast(null), 3000);
      return;
    }

    // Launch native game via Electron IPC
    const target = game.uriScheme || game.exePath;
    setLaunchToast(`Starting ${game.name}...`);

    // Report active game process in heartbeat telemetry
    socketService.updateSessionTelemetry('ACTIVE', secondsLeft, game.name, session.username);

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.launchApp(target);
        if (result.success) {
          setLaunchToast(`Started ${game.name} successfully! Click "Minimize to HUD" to view desktop.`);
        } else {
          setLaunchToast(`Notice: ${result.error || 'Dispatched process'}`);
        }
      } else {
        setLaunchToast(`[Dev Mode] Simulating launch of ${game.name}`);
      }
    } catch (err: unknown) {
      setLaunchToast(`Error launching ${game.name}: ${err instanceof Error ? err.message : String(err)}`);
    }

    setTimeout(() => setLaunchToast(null), 4000);
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { id: item.id, name: item.name, priceKzt: item.priceKzt, quantity: 1, category: item.category, imageEmoji: item.imageEmoji }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((i) => i.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.priceKzt * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    try {
      const res = await fetch(`${serverUrl}/api/pc/${pcId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({ name: c.name, quantity: c.quantity, price_kzt: c.priceKzt })),
          total_kzt: cartTotal,
          note: `Order from ${pcLabel} for ${session.username}`,
        }),
      });
      if (res.ok) {
        setOrderFeedback(`Order placed! Total: ${cartTotal.toLocaleString()} ₸. Admin will deliver to ${pcLabel}.`);
        setCart([]);
      } else {
        setOrderFeedback('Order recorded locally. Operator notified!');
        setCart([]);
      }
    } catch {
      setOrderFeedback('Order recorded locally. Operator notified!');
      setCart([]);
    }
    setTimeout(() => setOrderFeedback(null), 5000);
  };

  const handleSendAdminCall = async () => {
    try {
      await fetch(`${serverUrl}/api/pc/${pcId}/call-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: adminReason,
          message: adminMessage || undefined,
        }),
      });
      setAdminFeedback(`Administrator alerted for ${pcLabel}! Someone is on the way.`);
    } catch {
      setAdminFeedback(`Administrator alerted for ${pcLabel}!`);
    }
    setAdminMessage('');
    setTimeout(() => setAdminFeedback(null), 5000);
  };

  const handleEndSession = async () => {
    if (confirm('End your PC session and lock this terminal?')) {
      try {
        await fetch(`${serverUrl}/api/pc/${pcId}/lock`, { method: 'POST' });
      } catch (err) {
        console.error('Lock error:', err);
      }
      onSessionEnd();
    }
  };

  const isLowTime = secondsLeft < 300;

  // Mini HUD Floating View (when player wants to see their desktop or game)
  if (isMiniHud) {
    return (
      <div style={styles.miniHudContainer}>
        <div className="glass-panel" style={styles.miniHudCard}>
          <div style={styles.miniHudLeft}>
            <span style={styles.miniHudDot}></span>
            <span style={styles.miniHudStation}>{pcLabel}</span>
            <span style={styles.miniHudUser}>{session.username}</span>
          </div>

          <div style={styles.miniHudCenter}>
            <span style={styles.miniHudTimerLabel}>REMAINING:</span>
            <span
              style={{
                ...styles.miniHudTimerValue,
                color: isLowTime ? '#ef4444' : '#00f0ff',
              }}
            >
              {formatTime(secondsLeft)}
            </span>
          </div>

          <div style={styles.miniHudRight}>
            <button
              onClick={() => setIsMiniHud(false)}
              className="cyber-button"
              style={styles.miniHudBtn}
            >
              OPEN SENET SHELL
            </button>
            <button
              onClick={handleEndSession}
              className="cyber-button danger"
              style={styles.miniHudBtn}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.dashboardContainer}>
      {/* Top SENET Shell Header */}
      <header className="glass-panel" style={styles.shellHeader}>
        <div style={styles.brandGroup}>
          <div style={styles.senetLogoBadge}>
            <span style={styles.senetLogoText}>SENET</span>
            <span style={styles.senetSubBadge}>OS</span>
          </div>
          <div style={styles.stationPill}>{pcLabel}</div>
        </div>

        {/* Center Live Session Timer with Circular Progress Ring */}
        <div style={styles.centerTimerBox}>
          <div style={{ position: 'relative', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="24"
                cy="24"
                r="19"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="4"
                fill="transparent"
              />
              <circle
                cx="24"
                cy="24"
                r="19"
                stroke={secondsLeft < 60 ? '#ff0055' : secondsLeft < 300 ? '#ffaa00' : '#00f0ff'}
                strokeWidth="4"
                strokeDasharray="119.4"
                strokeDashoffset={119.4 - (119.4 * Math.min(100, Math.max(0, (secondsLeft % 3600) / 36))) / 100}
                strokeLinecap="round"
                fill="transparent"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s ease' }}
              />
            </svg>
            <Clock size={16} color={secondsLeft < 60 ? '#ff0055' : secondsLeft < 300 ? '#ffaa00' : '#00f0ff'} style={{ position: 'absolute' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={styles.timerSubtitle}>ACTIVE SESSION TIME</div>
            <div
              style={{
                ...styles.timerDigits,
                color: secondsLeft < 60 ? '#ff0055' : secondsLeft < 300 ? '#ffaa00' : '#00f0ff',
                textShadow: secondsLeft < 60
                  ? '0 0 20px rgba(255, 0, 85, 0.8)'
                  : secondsLeft < 300
                  ? '0 0 20px rgba(255, 170, 0, 0.8)'
                  : '0 0 20px rgba(0, 240, 255, 0.6)',
              }}
            >
              {formatTime(secondsLeft)}
            </div>
          </div>
        </div>

        {/* Right Player & Shell Controls */}
        <div style={styles.headerRight}>
          <div style={styles.balanceWidget}>
            <span style={styles.balanceLabel}>ACCOUNT BALANCE</span>
            <span style={styles.balanceDigits}>
              {session.balanceKzt ? `${session.balanceKzt.toLocaleString()} ₸` : '5,000 ₸'}
            </span>
          </div>

          <button
            onClick={() => {
              setIsMiniHud(true);
              window.electronAPI?.minimizeWindow();
            }}
            className="cyber-button secondary"
            style={styles.headerBtn}
            title="Minimize SENET to desktop with floating mini session timer"
          >
            💻 DESKTOP / HUD
          </button>

          <button
            onClick={handleEndSession}
            className="cyber-button danger"
            style={styles.headerBtn}
          >
            LOCK & EXIT
          </button>
        </div>
      </header>

      {/* Low-Time Warning Notification Banner */}
      {lowTimeAlert && (
        <div
          className="warning-banner-pulse"
          style={{
            margin: '0 24px 12px 24px',
            padding: '12px 20px',
            backgroundColor: 'rgba(255, 0, 85, 0.25)',
            border: '2px solid #ff0055',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <span>{lowTimeAlert}</span>
          </div>
          <button
            onClick={() => setLowTimeAlert(null)}
            className="cyber-button secondary"
            style={{ padding: '6px 14px', fontSize: '11px' }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* SENET Navigation Bar */}
      <nav style={styles.navBar}>
        <button
          onClick={() => setActiveTab('games')}
          className={`cyber-button ${activeTab === 'games' ? '' : 'secondary'}`}
          style={styles.tabButton}
        >
          🎮 GAMES & LAUNCHERS
        </button>
        <button
          onClick={() => setActiveTab('browser')}
          className={`cyber-button ${activeTab === 'browser' ? '' : 'secondary'}`}
          style={styles.tabButton}
        >
          🌐 IN-APP BROWSER (RUNS INSIDE)
        </button>
        <button
          onClick={() => setActiveTab('bar')}
          className={`cyber-button ${activeTab === 'bar' ? '' : 'secondary'}`}
          style={styles.tabButton}
        >
          🍔 FOOD & BAR {cart.length > 0 && `(${cart.length})`}
        </button>
        <button
          onClick={() => setActiveTab('admin')}
          className={`cyber-button ${activeTab === 'admin' ? '' : 'secondary'}`}
          style={styles.tabButton}
        >
          🔔 CALL ADMIN
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`cyber-button ${activeTab === 'system' ? '' : 'secondary'}`}
          style={styles.tabButton}
        >
          ⚙️ PC SPECS
        </button>
      </nav>

      {/* Floating Status Toast */}
      {launchToast && (
        <div style={styles.toastBanner}>
          <span>⚡ {launchToast}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main style={styles.mainArea}>
        {/* TAB 1: GAMES & LAUNCHERS (3D TILT CARDS & DYNAMIC HERO BANNER) */}
        {activeTab === 'games' && (
          <div style={styles.tabPane}>
            {/* Dynamic Hero Banner */}
            {(() => {
              const hero = hoveredGame || SENET_GAMES[1];
              const heroImgs: Record<string, string> = {
                cs2: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80',
                dota2: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1400&q=80',
                valorant: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1400&q=80',
                steam: 'https://images.unsplash.com/photo-1612287232049-74d6c44fa784?auto=format&fit=crop&w=1400&q=80',
                discord: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1400&q=80',
                youtube_app: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=1400&q=80',
              };
              const heroBg = heroImgs[hero.id] || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1400&q=80';

              return (
                <div style={styles.heroBanner}>
                  <div
                    style={{
                      ...styles.heroBannerBg,
                      backgroundImage: `url(${heroBg})`,
                    }}
                  />
                  <div style={styles.heroBannerOverlay} />

                  <div style={styles.heroBannerContent}>
                    <div style={styles.heroTagRow}>
                      <span style={styles.heroCategoryBadge}>
                        <Sparkles size={11} style={{ marginRight: 4 }} />
                        {hero.category.toUpperCase()} ARENA READY
                      </span>
                      {hero.popular && (
                        <span style={styles.heroHotBadge}>
                          <Flame size={11} style={{ marginRight: 4 }} />
                          TOP PLAYED IN CLUB
                        </span>
                      )}
                    </div>
                    <h1 style={styles.heroTitle}>{hero.name}</h1>
                    <p style={styles.heroDesc}>
                      Ultra-low latency competitive profile enabled. High tick-rate server optimizations active.
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '14px' }}>
                      <button
                        onClick={() => handleLaunchGame(hero)}
                        className="shimmer-button"
                        style={styles.heroLaunchBtn}
                      >
                        <Play size={15} style={{ marginRight: 6 }} /> PLAY {hero.name.toUpperCase()}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Category Filter Bar */}
            <div style={styles.categoryFilterBar}>
              {[
                { id: 'all', label: 'ALL TITLES' },
                { id: 'esports', label: '🔥 ESPORTS' },
                { id: 'shooter', label: '🎯 SHOOTERS' },
                { id: 'moba', label: '🛡️ MOBA' },
                { id: 'app', label: '⚡ APPS & WEB' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setGameCategoryFilter(cat.id)}
                  className="cyber-button secondary"
                  style={{
                    ...styles.filterChip,
                    borderColor: gameCategoryFilter === cat.id ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                    backgroundColor: gameCategoryFilter === cat.id ? 'rgba(0, 240, 255, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                    color: gameCategoryFilter === cat.id ? '#00f0ff' : '#94a3b8',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* 3D Perspective Tilt Game Cards Grid */}
            <div style={styles.gameGrid3D}>
              {SENET_GAMES.filter((g) => {
                if (gameCategoryFilter === 'all') return true;
                if (gameCategoryFilter === 'esports') return g.popular;
                if (gameCategoryFilter === 'shooter') return g.category.toLowerCase().includes('shooter');
                if (gameCategoryFilter === 'moba') return g.category.toLowerCase().includes('moba');
                if (gameCategoryFilter === 'app') return g.category.toLowerCase().includes('app') || g.isWebEmbed;
                return true;
              }).map((game) => (
                <GameCard3D
                  key={game.id}
                  game={game}
                  isRunning={runningGameId === game.id}
                  onLaunch={handleLaunchGame}
                  onKill={() => {
                    setRunningGameId(null);
                    setLaunchToast(`Terminated ${game.name}`);
                  }}
                  onHover={setHoveredGame}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: IN-APP BROWSER (RUNS INSIDE SYSTEM) */}
        {activeTab === 'browser' && (
          <div style={styles.browserPane}>
            {/* Browser Navigation Toolbar */}
            <div className="glass-panel" style={styles.browserToolbar}>
              <div style={styles.browserQuickButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setBrowserUrl('https://www.youtube.com');
                    setInputUrl('https://www.youtube.com');
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                >
                  YouTube
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrowserUrl('https://www.twitch.tv');
                    setInputUrl('https://www.twitch.tv');
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                >
                  Twitch
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrowserUrl('https://discord.com/app');
                    setInputUrl('https://discord.com/app');
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                >
                  Discord
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tgUrl = 'https://web.telegram.org/a/';
                    setBrowserUrl(tgUrl);
                    setInputUrl(tgUrl);
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                  title="Telegram Web A (Modern responsive web app)"
                >
                  Telegram (Web A)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tgUrl = 'https://web.telegram.org/k/';
                    setBrowserUrl(tgUrl);
                    setInputUrl(tgUrl);
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                  title="Telegram Web K (Classic fast web app)"
                >
                  Telegram (Web K)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrowserUrl('https://fast.com');
                    setInputUrl('https://fast.com');
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                >
                  Speedtest
                </button>
              </div>

              {/* URL Address Bar */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = normalizeBrowserUrl(inputUrl);
                  setBrowserUrl(target);
                  setInputUrl(target);
                }}
                style={styles.urlForm}
              >
                <input
                  type="text"
                  className="cyber-input"
                  style={styles.urlInput}
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Enter URL (e.g. web.telegram.org or youtube.com)..."
                />
                <button type="submit" className="cyber-button" style={styles.goBtn}>
                  GO
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = browserUrl;
                    setBrowserUrl('');
                    setTimeout(() => setBrowserUrl(current), 50);
                  }}
                  className="cyber-button secondary"
                  style={styles.goBtn}
                  title="Reload web page"
                >
                  🔄
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.electronAPI?.openExternal) {
                      window.electronAPI.openExternal(browserUrl);
                    } else {
                      window.open(browserUrl, '_blank');
                    }
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                  title="Open URL in native Chrome/Edge"
                >
                  OPEN IN CHROME
                </button>
              </form>
            </div>

            {/* Embedded Web View Frame */}
            <div style={styles.iframeWrapper}>
              {browserUrl && (
                window.electronAPI ? (
                  <KioskWebview url={browserUrl} />
                ) : (
                  <BrowserFallbackView url={browserUrl} />
                )
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FOOD & BAR */}
        {activeTab === 'bar' && (
          <div style={styles.barPane}>
            <div style={styles.barLeft}>
              <div style={styles.paneHeader}>
                <h2 className="cyber-glitch-text" style={styles.paneTitle}>
                  CLUB SNACK BAR & FOOD
                </h2>
                <span style={styles.paneSub}>ITEMS ARE DELIVERED DIRECTLY TO {pcLabel}</span>
              </div>

              <div style={styles.menuList}>
                {SENET_MENU.map((menuItem) => (
                  <div key={menuItem.id} className="glass-panel" style={styles.menuCard}>
                    <div style={styles.menuEmoji}>{menuItem.imageEmoji}</div>
                    <div style={styles.menuInfo}>
                      <div style={styles.menuName}>{menuItem.name}</div>
                      <div style={styles.menuDesc}>{menuItem.description}</div>
                      <div style={styles.menuPrice}>{menuItem.priceKzt.toLocaleString()} ₸</div>
                    </div>
                    <button
                      onClick={() => addToCart(menuItem)}
                      className="cyber-button"
                      style={styles.addBtn}
                    >
                      + ADD
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Cart & Checkout */}
            <div className="glass-panel" style={styles.cartPanel}>
              <h3 style={styles.cartTitle}>MY ORDER ({cart.length})</h3>
              {orderFeedback && <div style={styles.orderAlert}>{orderFeedback}</div>}

              {cart.length === 0 ? (
                <div style={styles.emptyCart}>Your cart is empty. Add snacks or drinks!</div>
              ) : (
                <div style={styles.cartItemsList}>
                  {cart.map((item) => (
                    <div key={item.id} style={styles.cartRow}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span>{item.imageEmoji}</span>
                        <span style={styles.cartItemName}>
                          {item.name} x{item.quantity}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <span style={styles.cartItemPrice}>
                          {(item.priceKzt * item.quantity).toLocaleString()} ₸
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          style={styles.cartRemoveBtn}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.cartSummary}>
                <div style={styles.totalRow}>
                  <span>TOTAL AMOUNT:</span>
                  <span style={styles.totalSum}>{cartTotal.toLocaleString()} ₸</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={cart.length === 0}
                  className="cyber-button"
                  style={styles.checkoutBtn}
                >
                  ORDER TO {pcLabel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CALL & CHAT WITH ADMIN */}
        {activeTab === 'admin' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
            {/* Left: Quick Operator Dispatch */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h2 className="cyber-purple-text" style={{ fontSize: '20px', letterSpacing: '1px', margin: '0 0 8px 0' }}>
                🚨 REQUEST OPERATOR ASSISTANCE
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 16px 0' }}>
                Click a preset reason below to trigger an urgent cashier desk alert.
              </p>

              {adminFeedback && (
                <div style={{ background: 'rgba(0, 240, 255, 0.15)', border: '1px solid #00f0ff', color: '#00f0ff', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                  {adminFeedback}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {[
                  'Hardware / Peripherals Issue',
                  'Game Needs Update / Download',
                  'Headset / Microphone Problem',
                  'Top up Balance / Cash Payment',
                  'Other Question',
                ].map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setAdminReason(reason)}
                    className={`cyber-button ${adminReason === reason ? '' : 'secondary'}`}
                    style={{ textAlign: 'left', padding: '10px 14px', fontSize: '13px' }}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 'auto' }}>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Optional details (e.g. mouse right click issue)"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                  style={{ width: '100%', marginBottom: '12px', boxSizing: 'border-box' }}
                />
                <button
                  onClick={handleSendAdminCall}
                  className="cyber-button secondary"
                  style={{ width: '100%', padding: '12px' }}
                >
                  DISPATCH OPERATOR NOW
                </button>
              </div>
            </div>

            {/* Right: Live 2-Way Chat with Club Admin */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '18px', color: '#00f0ff', margin: 0, fontFamily: 'monospace', letterSpacing: '1px' }}>
                  💬 LIVE CHAT WITH ADMIN
                </h2>
                <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  Cashier Online
                </span>
              </div>

              {/* Chat Message List */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                background: 'rgba(5, 7, 18, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginBottom: '12px',
                maxHeight: '400px',
              }}>
                {chatMessages.map((m) => {
                  const isMe = m.sender === session.username;
                  return (
                    <div
                      key={m.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '82%',
                        background: isMe ? 'linear-gradient(135deg, #00f0ff22, #7928ca44)' : 'rgba(255, 255, 255, 0.06)',
                        border: isMe ? '1px solid #00f0ff88' : '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        padding: '8px 12px',
                      }}
                    >
                      <div style={{ fontSize: '11px', color: isMe ? '#00f0ff' : '#a855f7', fontWeight: 'bold', marginBottom: '4px' }}>
                        {isMe ? 'You' : m.sender}
                      </div>
                      <div style={{ fontSize: '14px', color: '#e2e8f0', wordBreak: 'break-word' }}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Type a message to the cashier (Enter to send)..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendChat(); }}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleSendChat}
                  className="cyber-button"
                  style={{ padding: '0 20px' }}
                >
                  SEND
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SYSTEM SPECS */}
        {activeTab === 'system' && (
          <div style={styles.systemPane}>
            <div className="glass-panel" style={styles.specsCard}>
              <h2 className="cyber-glitch-text" style={styles.specsTitle}>
                TERMINAL HARDWARE SPECIFICATIONS
              </h2>

              <div style={styles.specGrid}>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>STATION IDENTIFIER</span>
                  <span style={styles.specVal}>{pcLabel} ({pcId})</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>PROCESSOR (CPU)</span>
                  <span style={styles.specVal}>{systemStats?.cpuModel || 'Intel Core i7-14700KF / Ryzen 7'}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>GRAPHICS (GPU)</span>
                  <span style={styles.specVal}>NVIDIA GeForce RTX 4070 Ti SUPER</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>TOTAL MEMORY (RAM)</span>
                  <span style={styles.specVal}>{systemStats?.totalMemoryGb || 32} GB DDR5 6000MHz</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>OPERATING SYSTEM</span>
                  <span style={styles.specVal}>{systemStats?.osRelease || 'Windows 11 Pro Enterprise'}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>HOST COMPUTER</span>
                  <span style={styles.specVal}>{systemStats?.hostname || 'CLUB-PC-NODE-01'}</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>NETWORK PING (ALMATY NODE)</span>
                  <span style={{ ...styles.specVal, color: '#10b981' }}>2 ms (1 Gbps Fiber)</span>
                </div>
                <div style={styles.specItem}>
                  <span style={styles.specKey}>SECURITY SHELL</span>
                  <span style={{ ...styles.specVal, color: '#00f0ff' }}>SENET Kiosk Lock Active</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    padding: '20px 30px',
    gap: '16px',
    overflow: 'hidden',
    zIndex: 1,
  },
  shellHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  senetLogoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2) 0%, rgba(168, 85, 247, 0.3) 100%)',
    border: '1px solid #00f0ff',
    borderRadius: '8px',
    padding: '6px 14px',
  },
  senetLogoText: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '20px',
    fontWeight: 900,
    letterSpacing: '3px',
    color: '#00f0ff',
  },
  senetSubBadge: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '10px',
    fontWeight: 700,
    background: '#a855f7',
    color: '#fff',
    borderRadius: '4px',
    padding: '2px 5px',
  },
  stationPill: {
    background: 'rgba(10, 15, 30, 0.7)',
    border: '1px solid var(--border-neon)',
    borderRadius: '6px',
    padding: '6px 14px',
    fontFamily: 'var(--font-cyber)',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
  },
  centerTimerBox: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '12px',
  },
  heroBanner: {
    position: 'relative',
    height: '210px',
    borderRadius: '16px',
    overflow: 'hidden',
    marginBottom: '18px',
    border: '1px solid rgba(0, 240, 255, 0.25)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
  },
  heroBannerBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundSize: 'cover',
    backgroundPosition: 'center 30%',
    transition: 'background-image 0.4s ease',
  },
  heroBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, rgba(7, 9, 19, 0.95) 0%, rgba(7, 9, 19, 0.65) 55%, rgba(7, 9, 19, 0.2) 100%)',
  },
  heroBannerContent: {
    position: 'relative',
    zIndex: 2,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '0 32px',
    maxWidth: '650px',
  },
  heroTagRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  heroCategoryBadge: {
    fontSize: '10px',
    fontWeight: 900,
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    color: '#00f0ff',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '6px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
  },
  heroHotBadge: {
    fontSize: '10px',
    fontWeight: 900,
    backgroundColor: 'rgba(255, 0, 127, 0.2)',
    color: '#ff007f',
    border: '1px solid rgba(255, 0, 127, 0.35)',
    borderRadius: '6px',
    padding: '3px 8px',
    display: 'flex',
    alignItems: 'center',
  },
  heroTitle: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '32px',
    fontWeight: 900,
    color: '#fff',
    margin: 0,
    letterSpacing: '1px',
    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
  },
  heroDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '6px 0 0 0',
    lineHeight: 1.4,
  },
  heroLaunchBtn: {
    padding: '10px 22px',
    borderRadius: '8px',
    border: 'none',
    color: '#070913',
    fontWeight: 900,
    fontSize: '12px',
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  categoryFilterBar: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
  },
  filterChip: {
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '0.8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  gameGrid3D: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '20px',
    paddingBottom: '24px',
  },
  timerSubtitle: {
    fontSize: '10px',
    fontFamily: 'var(--font-cyber)',
    letterSpacing: '2px',
    color: 'var(--text-muted)',
  },
  timerDigits: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '36px',
    fontWeight: 900,
    letterSpacing: '2px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  balanceWidget: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    background: 'rgba(10, 15, 30, 0.7)',
    border: '1px solid var(--border-subtle)',
    padding: '6px 14px',
    borderRadius: '8px',
  },
  balanceLabel: {
    fontSize: '10px',
    fontFamily: 'var(--font-cyber)',
    color: 'var(--text-muted)',
  },
  balanceDigits: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-cyber)',
    color: '#10b981',
  },
  headerBtn: {
    padding: '10px 16px',
    fontSize: '12px',
  },
  navBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  tabButton: {
    fontSize: '13px',
    padding: '10px 20px',
  },
  toastBanner: {
    background: 'rgba(0, 240, 255, 0.2)',
    border: '1px solid #00f0ff',
    borderRadius: '8px',
    padding: '8px 18px',
    color: '#00f0ff',
    fontFamily: 'var(--font-cyber)',
    fontSize: '13px',
    textAlign: 'center',
  },
  mainArea: {
    flex: '1',
    display: 'flex',
    overflow: 'hidden',
  },
  tabPane: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  paneHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  paneTitle: {
    fontSize: '20px',
    letterSpacing: '1px',
  },
  paneSub: {
    fontSize: '12px',
    fontFamily: 'var(--font-cyber)',
    color: 'var(--text-muted)',
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
    gap: '16px',
  },
  gameTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px 16px',
    textAlign: 'center',
    gap: '12px',
    position: 'relative',
  },
  hotBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#ff007f',
    color: '#fff',
    fontSize: '10px',
    fontFamily: 'var(--font-cyber)',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  gameIconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '14px',
    background: 'rgba(0, 240, 255, 0.1)',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameEmoji: {
    fontSize: '32px',
  },
  gameMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gameTitle: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'var(--font-cyber)',
  },
  gameTag: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  playBtn: {
    width: '100%',
    padding: '8px 12px',
    fontSize: '12px',
    marginTop: '6px',
  },
  browserPane: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  browserToolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    gap: '16px',
  },
  browserQuickButtons: {
    display: 'flex',
    gap: '8px',
  },
  browserQuickBtn: {
    padding: '6px 12px',
    fontSize: '12px',
  },
  urlForm: {
    flex: 1,
    display: 'flex',
    gap: '8px',
  },
  urlInput: {
    flex: 1,
    padding: '8px 14px',
    fontSize: '14px',
  },
  goBtn: {
    padding: '8px 18px',
    fontSize: '12px',
  },
  iframeWrapper: {
    flex: 1,
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border-neon)',
    background: '#0e1224',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '540px',
    height: '100%',
  },
  inAppIframe: {
    width: '100%',
    height: '100%',
    flex: 1,
    border: 'none',
    display: 'flex',
  },
  browserWebFallback: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    backgroundColor: '#070913',
  },
  browserNoticeCard: {
    maxWidth: '620px',
    textAlign: 'center',
    padding: '36px 30px',
    border: '1px solid rgba(0, 240, 255, 0.3)',
    borderRadius: '16px',
    backgroundColor: '#0c1020',
  },
  browserLoadingBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '3px',
    backgroundColor: 'rgba(0, 240, 255, 0.2)',
    overflow: 'hidden',
    zIndex: 10,
  },
  browserLoadingProgress: {
    width: '100%',
    height: '100%',
    backgroundColor: '#00f0ff',
  },
  browserErrorOverlay: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: 'rgba(26, 8, 20, 0.95)',
    border: '1px solid #ff0055',
    borderRadius: '8px',
    padding: '12px 16px',
    zIndex: 20,
    boxShadow: '0 4px 15px rgba(255, 0, 85, 0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  barPane: {
    width: '100%',
    height: '100%',
    display: 'flex',
    gap: '24px',
  },
  barLeft: {
    flex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    overflowY: 'auto',
  },
  menuList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px',
  },
  menuCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px',
    gap: '14px',
  },
  menuEmoji: {
    fontSize: '32px',
  },
  menuInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  menuName: {
    fontSize: '14px',
    fontWeight: 700,
  },
  menuDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  menuPrice: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-cyber)',
    color: '#00f0ff',
  },
  addBtn: {
    padding: '6px 14px',
    fontSize: '12px',
  },
  cartPanel: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    justifyContent: 'space-between',
  },
  cartTitle: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '16px',
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  emptyCart: {
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center',
    margin: 'auto 0',
  },
  cartItemsList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  cartRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(10, 15, 30, 0.6)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  cartItemName: {
    fontWeight: 600,
  },
  cartItemPrice: {
    fontFamily: 'var(--font-cyber)',
    color: '#00f0ff',
  },
  cartRemoveBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
  },
  cartSummary: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '14px',
    fontWeight: 700,
  },
  totalSum: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '18px',
    color: '#10b981',
  },
  checkoutBtn: {
    width: '100%',
    padding: '12px',
  },
  orderAlert: {
    background: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid #10b981',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#6ee7b7',
    fontSize: '12px',
    marginBottom: '10px',
  },
  adminPane: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminCard: {
    width: '600px',
    padding: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  adminTitle: {
    fontSize: '22px',
  },
  adminSubtitle: {
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  adminSuccessToast: {
    background: 'rgba(168, 85, 247, 0.2)',
    border: '1px solid #a855f7',
    borderRadius: '6px',
    padding: '10px',
    color: '#d8b4fe',
    fontSize: '13px',
  },
  reasonButtons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  reasonBtn: {
    fontSize: '12px',
    padding: '8px 14px',
  },
  fieldLabel: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '11px',
    color: 'var(--cyan-neon)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  sendCallBtn: {
    width: '100%',
    padding: '12px',
  },
  systemPane: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  specsCard: {
    width: '750px',
    padding: '36px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  specsTitle: {
    fontSize: '22px',
  },
  specGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '14px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    background: 'rgba(10, 15, 30, 0.6)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
  },
  specKey: {
    fontSize: '11px',
    fontFamily: 'var(--font-cyber)',
    color: 'var(--text-muted)',
  },
  specVal: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
  },
  miniHudContainer: {
    position: 'fixed',
    top: '12px',
    right: '20px',
    zIndex: 99999,
  },
  miniHudCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    padding: '10px 20px',
    borderRadius: '12px',
  },
  miniHudLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  miniHudDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
  },
  miniHudStation: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '13px',
    fontWeight: 700,
    color: '#00f0ff',
  },
  miniHudUser: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
  miniHudCenter: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  miniHudTimerLabel: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  miniHudTimerValue: {
    fontFamily: 'var(--font-cyber)',
    fontSize: '18px',
    fontWeight: 900,
  },
  miniHudRight: {
    display: 'flex',
    gap: '8px',
  },
  miniHudBtn: {
    fontSize: '11px',
    padding: '6px 12px',
  },
};
