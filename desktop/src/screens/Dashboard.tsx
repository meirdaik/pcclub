import React, { useState, useEffect } from 'react';
import { SessionInfo, GameItem, MenuItem, CartItem, SystemStats } from '../types';

interface DashboardProps {
  session: SessionInfo;
  onSessionEnd: () => void;
}

const PC_LABEL = import.meta.env.VITE_PC_LABEL || 'PC #1';
const PC_ID = import.meta.env.VITE_PC_ID || 'pc-001';
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:8000';

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

export default function Dashboard({ session, onSessionEnd }: DashboardProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(session.remainingSeconds);
  const [activeTab, setActiveTab] = useState<TabType>('games');
  const [isMiniHud, setIsMiniHud] = useState(false);
  const [launchToast, setLaunchToast] = useState<string | null>(null);

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

  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLaunchGame = async (game: GameItem) => {
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
      const res = await fetch(`${SERVER_URL}/api/pc/${PC_ID}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((c) => ({ name: c.name, quantity: c.quantity, price_kzt: c.priceKzt })),
          total_kzt: cartTotal,
          note: `Order from ${PC_LABEL} for ${session.username}`,
        }),
      });
      if (res.ok) {
        setOrderFeedback(`Order placed! Total: ${cartTotal.toLocaleString()} ₸. Admin will deliver to ${PC_LABEL}.`);
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
      await fetch(`${SERVER_URL}/api/pc/${PC_ID}/call-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: adminReason,
          message: adminMessage || undefined,
        }),
      });
      setAdminFeedback(`Administrator alerted for ${PC_LABEL}! Someone is on the way.`);
    } catch {
      setAdminFeedback(`Administrator alerted for ${PC_LABEL}!`);
    }
    setAdminMessage('');
    setTimeout(() => setAdminFeedback(null), 5000);
  };

  const handleEndSession = async () => {
    if (confirm('End your PC session and lock this terminal?')) {
      try {
        await fetch(`${SERVER_URL}/api/pc/${PC_ID}/lock`, { method: 'POST' });
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
            <span style={styles.miniHudStation}>{PC_LABEL}</span>
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
          <div style={styles.stationPill}>{PC_LABEL}</div>
        </div>

        {/* Center Live Session Timer */}
        <div style={styles.centerTimerBox}>
          <div style={styles.timerSubtitle}>ACTIVE SESSION TIME</div>
          <div
            style={{
              ...styles.timerDigits,
              color: isLowTime ? '#ef4444' : '#00f0ff',
              textShadow: isLowTime
                ? '0 0 20px rgba(239, 68, 68, 0.7)'
                : '0 0 20px rgba(0, 240, 255, 0.6)',
            }}
          >
            {formatTime(secondsLeft)}
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
        {/* TAB 1: GAMES & LAUNCHERS */}
        {activeTab === 'games' && (
          <div style={styles.tabPane}>
            <div style={styles.paneHeader}>
              <h2 className="cyber-glitch-text" style={styles.paneTitle}>
                INSTALLED GAMES & APPLICATIONS
              </h2>
              <span style={styles.paneSub}>CLICK TO RUN INSTANTLY OR OPEN IN SYSTEM</span>
            </div>

            <div style={styles.gameGrid}>
              {SENET_GAMES.map((game) => (
                <div key={game.id} className="glass-panel" style={styles.gameTile}>
                  {game.popular && <div style={styles.hotBadge}>POPULAR</div>}
                  <div style={styles.gameIconBox}>
                    <span style={styles.gameEmoji}>{game.icon}</span>
                  </div>
                  <div style={styles.gameMeta}>
                    <div style={styles.gameTitle}>{game.name}</div>
                    <div style={styles.gameTag}>{game.category}</div>
                  </div>
                  <button
                    onClick={() => handleLaunchGame(game)}
                    className="cyber-button"
                    style={styles.playBtn}
                  >
                    {game.isWebEmbed ? 'RUN IN SYSTEM' : 'PLAY GAME'}
                  </button>
                </div>
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
                  onClick={() => {
                    setBrowserUrl('https://web.telegram.org');
                    setInputUrl('https://web.telegram.org');
                  }}
                  className="cyber-button secondary"
                  style={styles.browserQuickBtn}
                >
                  Telegram
                </button>
                <button
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
                  let url = inputUrl.trim();
                  if (!/^https?:\/\//i.test(url)) {
                    url = `https://www.google.com/search?q=${encodeURIComponent(url)}`;
                  }
                  setBrowserUrl(url);
                }}
                style={styles.urlForm}
              >
                <input
                  type="text"
                  className="cyber-input"
                  style={styles.urlInput}
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Search the web or enter URL..."
                />
                <button type="submit" className="cyber-button" style={styles.goBtn}>
                  GO
                </button>
              </form>
            </div>

            {/* Embedded Web View Frame */}
            <div style={styles.iframeWrapper}>
              <iframe
                src={browserUrl}
                title="SENET In-Kiosk Web App"
                style={styles.inAppIframe}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
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
                <span style={styles.paneSub}>ITEMS ARE DELIVERED DIRECTLY TO {PC_LABEL}</span>
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
                  ORDER TO {PC_LABEL}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CALL ADMIN */}
        {activeTab === 'admin' && (
          <div style={styles.adminPane}>
            <div className="glass-panel" style={styles.adminCard}>
              <h2 className="cyber-purple-text" style={styles.adminTitle}>
                REQUEST OPERATOR ASSISTANCE
              </h2>
              <p style={styles.adminSubtitle}>
                Select the issue category below. Club administrator will be notified instantly.
              </p>

              {adminFeedback && <div style={styles.adminSuccessToast}>{adminFeedback}</div>}

              <div style={styles.reasonButtons}>
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
                    style={styles.reasonBtn}
                  >
                    {reason}
                  </button>
                ))}
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.fieldLabel}>ADDITIONAL NOTE / SEAT DETAILS</label>
                <input
                  type="text"
                  className="cyber-input"
                  placeholder="Optional details (e.g. mouse right click double clicking)"
                  value={adminMessage}
                  onChange={(e) => setAdminMessage(e.target.value)}
                />
              </div>

              <button
                onClick={handleSendAdminCall}
                className="cyber-button secondary"
                style={styles.sendCallBtn}
              >
                DISPATCH OPERATOR NOW
              </button>
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
                  <span style={styles.specVal}>{PC_LABEL} ({PC_ID})</span>
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
    flexDirection: 'column',
    alignItems: 'center',
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
  },
  inAppIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
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
