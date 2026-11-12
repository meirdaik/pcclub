import React, { useEffect, useState } from 'react';
import { ClubPc } from '../types';
import { getAdminConfig } from '../services/config';

interface HeaderBarProps {
  pcs: ClubPc[];
  isConnected: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenAlerts: () => void;
  onOpenBroadcast: () => void;
  onOpenOrders: () => void;
  onOpenShift: () => void;
  alertCount: number;
  pendingOrdersCount?: number;
  filterZone: string;
  setFilterZone: (z: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function HeaderBar({
  pcs,
  isConnected,
  onRefresh,
  onOpenSettings,
  onOpenAlerts,
  onOpenBroadcast,
  onOpenOrders,
  onOpenShift,
  alertCount,
  pendingOrdersCount = 0,
  filterZone,
  setFilterZone,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
}: HeaderBarProps) {
  const config = getAdminConfig();
  const [clock, setClock] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [detectedLanIp, setDetectedLanIp] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isConnected) return;
    const fetchInfo = async () => {
      try {
        const res = await fetch(`${config.serverUrl}/api/system/info`);
        if (res.ok) {
          const data = await res.json();
          if (data.server_ip) {
            setDetectedLanIp(data.server_ip);
          }
        }
      } catch {}
    };
    fetchInfo();
  }, [isConnected, config.serverUrl]);

  const total = pcs.length;
  const busyCount = pcs.filter((p) => p.status === 'BUSY').length;
  const freeCount = pcs.filter((p) => p.status === 'FREE').length;
  const offlineCount = pcs.filter((p) => p.status === 'OFFLINE').length;
  const occupancyRate = total > 0 ? Math.round((busyCount / total) * 100) : 0;

  return (
    <header style={styles.header}>
      {/* Top Brand Bar */}
      <div style={styles.topRow}>
        <div style={styles.brandGroup}>
          <div style={styles.logoBadge}>
            <span style={styles.logoIcon}>🛡️</span>
            <div>
              <h1 style={styles.title} className="font-orbitron">
                {config.clubName}
              </h1>
              <span style={styles.subTitle}>ADMIN & CASHIER DISPATCH CONSOLE</span>
            </div>
          </div>

          <div
            style={{ ...styles.serverBadge, cursor: 'pointer' }}
            onClick={onOpenSettings}
            title="Click to configure Server LAN IP and port"
          >
            <span
              style={{
                ...styles.dot,
                backgroundColor: isConnected ? 'var(--status-free)' : 'var(--status-busy)',
                boxShadow: isConnected ? '0 0 8px #00ff88' : '0 0 8px #ff0055',
              }}
            />
            <span style={styles.serverText}>
              {isConnected
                ? `📡 Club Server LAN: ${detectedLanIp || config.serverIp}:${config.serverPort} (Enter on PCs & Mobile)`
                : '● Server Disconnected (Click to configure IP)'}
            </span>
          </div>
        </div>

        {/* Right Utility Group */}
        <div style={styles.rightGroup}>
          {alertCount > 0 && (
            <button
              onClick={onOpenAlerts}
              className="cyber-button alert-pulse"
              style={styles.alertNotificationBtn}
            >
              🔔 {alertCount} STATION ALERT{alertCount > 1 ? 'S' : ''}
            </button>
          )}

          <div style={styles.clockBox}>
            <div style={styles.clockTime} className="font-orbitron">
              {clock}
            </div>
            <div style={styles.clockDate}>{dateStr}</div>
          </div>

          <button
            onClick={onOpenBroadcast}
            className="cyber-button secondary"
            style={styles.toolBtn}
            title="Send on-screen broadcast popup to stations"
          >
            📢 Broadcast
          </button>

          <button
            onClick={onOpenOrders}
            className={`cyber-button ${pendingOrdersCount > 0 ? 'alert-pulse' : 'secondary'}`}
            style={{
              ...styles.toolBtn,
              background: pendingOrdersCount > 0 ? 'rgba(245, 158, 11, 0.2)' : undefined,
              borderColor: pendingOrdersCount > 0 ? '#f59e0b' : undefined,
              color: pendingOrdersCount > 0 ? '#f59e0b' : undefined,
            }}
            title="Snack Bar Orders"
          >
            🍔 Bar Orders {pendingOrdersCount > 0 ? `(${pendingOrdersCount})` : ''}
          </button>

          <button
            onClick={onOpenShift}
            className="cyber-button secondary"
            style={styles.toolBtn}
            title="Cashier Shift & Fiscal Z-Report"
          >
            💵 Shift / Z-Report
          </button>

          <button
            onClick={onRefresh}
            className="cyber-button secondary"
            style={styles.toolBtn}
            title="Force refresh stations"
          >
            🔄 Sync
          </button>

          <button
            onClick={onOpenSettings}
            className="cyber-button secondary"
            style={styles.toolBtn}
            title="Configure Server IP & Club Settings"
          >
            ⚙️ Server
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div style={styles.kpiStrip}>
        <div style={styles.kpiCard}>
          <span style={styles.kpiLabel}>TOTAL STATIONS</span>
          <span style={styles.kpiValue} className="font-orbitron">{total}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={{ ...styles.kpiLabel, color: 'var(--status-free)' }}>FREE (READY)</span>
          <span style={{ ...styles.kpiValue, color: 'var(--status-free)' }} className="font-orbitron">{freeCount}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={{ ...styles.kpiLabel, color: 'var(--status-busy)' }}>OCCUPIED (BUSY)</span>
          <span style={{ ...styles.kpiValue, color: 'var(--status-busy)' }} className="font-orbitron">{busyCount}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={{ ...styles.kpiLabel, color: 'var(--status-alert)' }}>CALL ADMIN / ORDERS</span>
          <span style={{ ...styles.kpiValue, color: 'var(--status-alert)' }} className="font-orbitron">{alertCount}</span>
        </div>
        <div style={styles.kpiCard}>
          <span style={{ ...styles.kpiLabel, color: 'var(--status-offline)' }}>OFFLINE</span>
          <span style={{ ...styles.kpiValue, color: 'var(--status-offline)' }} className="font-orbitron">{offlineCount}</span>
        </div>
        <div style={{ ...styles.kpiCard, flex: 1.2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={styles.kpiLabel}>CLUB OCCUPANCY</span>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--border-neon)' }}>{occupancyRate}%</span>
          </div>
          <div style={styles.occupancyTrack}>
            <div
              style={{
                ...styles.occupancyBar,
                width: `${occupancyRate}%`,
                background: occupancyRate > 75 ? 'var(--status-busy)' : 'linear-gradient(90deg, #00f0ff, #9d4edd)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={styles.filterRow}>
        <div style={styles.zoneTabs}>
          {['ALL', 'STANDARD', 'VIP'].map((z) => (
            <button
              key={z}
              onClick={() => setFilterZone(z)}
              className="cyber-button"
              style={{
                ...styles.filterPill,
                backgroundColor: filterZone === z ? 'var(--border-neon)' : 'rgba(30, 38, 72, 0.4)',
                color: filterZone === z ? '#070913' : 'var(--text-muted)',
                borderColor: filterZone === z ? 'var(--border-neon)' : '#2a3560',
              }}
            >
              {z === 'ALL' ? 'ALL ZONES' : `${z} ZONE`}
            </button>
          ))}
        </div>

        <div style={styles.statusTabs}>
          {[
            { id: 'ALL', label: 'All Status' },
            { id: 'FREE', label: '🟢 Free' },
            { id: 'BUSY', label: '🔴 Busy' },
            { id: 'ALERT', label: '⚠️ Alerts' },
            { id: 'OFFLINE', label: '⚪ Offline' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className="cyber-button"
              style={{
                ...styles.statusPill,
                backgroundColor: filterStatus === st.id ? 'rgba(0, 240, 255, 0.2)' : 'transparent',
                borderColor: filterStatus === st.id ? 'var(--border-neon)' : 'transparent',
                color: filterStatus === st.id ? '#fff' : 'var(--text-muted)',
              }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={styles.searchBox}>
          <input
            type="text"
            className="cyber-input"
            placeholder="🔍 Search PC or Gamer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              ✕
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '16px 24px',
    backgroundColor: '#0a0e22',
    borderBottom: '1px solid var(--border-subtle)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
  },
  topRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  logoBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '28px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#00f0ff',
    letterSpacing: '1px',
    margin: 0,
  },
  subTitle: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '1.5px',
    fontWeight: 'bold',
  },
  serverBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'rgba(7, 9, 19, 0.8)',
    borderRadius: '20px',
    border: '1px solid var(--border-subtle)',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  serverText: {
    fontSize: '12px',
    color: '#cbd5e1',
    fontWeight: 600,
  },
  rightGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  alertNotificationBtn: {
    padding: '8px 16px',
    background: 'rgba(255, 234, 0, 0.2)',
    borderColor: '#ffea00',
    color: '#ffea00',
    fontWeight: 'bold',
  },
  clockBox: {
    textAlign: 'right',
    padding: '4px 12px',
    borderRight: '1px solid var(--border-subtle)',
  },
  clockTime: {
    fontSize: '18px',
    fontWeight: 900,
    color: '#fff',
  },
  clockDate: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  toolBtn: {
    padding: '8px 14px',
  },
  kpiStrip: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '12px',
  },
  kpiCard: {
    backgroundColor: 'rgba(13, 18, 38, 0.6)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: '10px',
    letterSpacing: '1px',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    marginBottom: '2px',
  },
  kpiValue: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#fff',
  },
  occupancyTrack: {
    width: '100%',
    height: '8px',
    backgroundColor: '#070913',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  occupancyBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.4s ease-in-out',
  },
  filterRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  zoneTabs: {
    display: 'flex',
    gap: '6px',
  },
  filterPill: {
    padding: '6px 14px',
    fontSize: '11px',
  },
  statusTabs: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#070913',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
  },
  statusPill: {
    padding: '5px 12px',
    fontSize: '11px',
    border: '1px solid transparent',
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '240px',
    paddingRight: '28px',
  },
  clearSearchBtn: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    color: '#8892b0',
    cursor: 'pointer',
    fontSize: '12px',
  },
};
