import React, { useState, useEffect, useCallback } from 'react';
import { AdminPcItem, AdminTariffItem } from '../types';

interface AdminPanelProps {
  onExit: () => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://127.0.0.1:8000';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [pcs, setPcs] = useState<AdminPcItem[]>([]);
  const [tariffs, setTariffs] = useState<AdminTariffItem[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'FREE' | 'BUSY' | 'ALERT' | 'VIP'>('ALL');
  const [selectedPc, setSelectedPc] = useState<AdminPcItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Modal Unlock Form
  const [unlockUsername, setUnlockUsername] = useState<string>('player1');
  const [unlockDurationMin, setUnlockDurationMin] = useState<number>(60);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchClubState = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/pcs`);
      if (res.ok) {
        const data = await res.json();
        setPcs(data);
      }
    } catch (err) {
      console.warn('[AdminPanel] Error fetching PCs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTariffs = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/admin/tariffs`);
      if (res.ok) {
        const data = await res.json();
        setTariffs(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchClubState();
    fetchTariffs();
    const interval = setInterval(fetchClubState, 3000);
    return () => clearInterval(interval);
  }, [fetchClubState, fetchTariffs]);

  // Remote Unlock
  const handleRemoteUnlock = async (pcId: string, username: string, minutes: number) => {
    setActionLoading(`unlock-${pcId}`);
    try {
      const res = await fetch(`${SERVER_URL}/api/pc/${pcId}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          remaining_seconds: minutes * 60,
        }),
      });
      if (res.ok) {
        showToast(`Station ${pcId} unlocked for ${username} (${minutes}m)`);
        setSelectedPc(null);
        fetchClubState();
      } else {
        const err = await res.json();
        showToast(`Unlock failed: ${err.detail || 'Error'}`);
      }
    } catch (err) {
      showToast('Network error while unlocking');
    } finally {
      setActionLoading(null);
    }
  };

  // Remote Force Lock
  const handleRemoteLock = async (pcId: string) => {
    if (!confirm(`Force lock station ${pcId}? Active game processes will be terminated.`)) return;
    setActionLoading(`lock-${pcId}`);
    try {
      const res = await fetch(`${SERVER_URL}/api/pc/${pcId}/lock`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast(`Station ${pcId} force locked`);
        setSelectedPc(null);
        fetchClubState();
      } else {
        showToast('Failed to lock station');
      }
    } catch {
      showToast('Network error while locking');
    } finally {
      setActionLoading(null);
    }
  };

  // Remote Add Time (+30m, +1h)
  const handleRemoteExtend = async (pcId: string, additionalMinutes: number) => {
    setActionLoading(`extend-${pcId}`);
    try {
      const res = await fetch(`${SERVER_URL}/api/pc/${pcId}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          additional_seconds: additionalMinutes * 60,
        }),
      });
      if (res.ok) {
        showToast(`Added +${additionalMinutes}m to ${pcId}`);
        fetchClubState();
      } else {
        showToast('Failed to add time');
      }
    } catch {
      showToast('Network error while extending time');
    } finally {
      setActionLoading(null);
    }
  };

  // Clear Alert
  const handleClearAlert = async (pcId: string) => {
    try {
      await fetch(`${SERVER_URL}/api/pc/${pcId}/clear-alert`, { method: 'POST' });
      showToast(`Alert cleared on ${pcId}`);
      fetchClubState();
    } catch {
      // ignore
    }
  };

  // Metrics
  const onlineCount = pcs.filter((p) => p.online).length;
  const busyCount = pcs.filter((p) => p.status === 'BUSY').length;
  const alertCount = pcs.filter((p) => p.status === 'ALERT').length;

  const filteredPcs = pcs.filter((p) => {
    if (filter === 'ALL') return true;
    if (filter === 'FREE') return p.status === 'FREE';
    if (filter === 'BUSY') return p.status === 'BUSY';
    if (filter === 'ALERT') return p.status === 'ALERT';
    if (filter === 'VIP') return p.zone === 'VIP';
    return true;
  });

  const formatTimer = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      {/* Toast Notification */}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Top Cashier Bar */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logoBadge}>SENET</div>
          <div>
            <h1 style={styles.headerTitle}>CASHIER & CLUB ADMIN MAP</h1>
            <span style={styles.headerSubtitle}>
              REAL-TIME MONITORING • REMOTE KIOSK CONTROL • SESSION EXTENSION
            </span>
          </div>
        </div>

        {/* Stats Metrics */}
        <div style={styles.metricsRow}>
          <div style={styles.metricItem}>
            <span style={styles.metricVal}>{pcs.length}</span>
            <span style={styles.metricLabel}>TOTAL STATIONS</span>
          </div>
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricVal, color: '#00f0ff' }}>{onlineCount}</span>
            <span style={styles.metricLabel}>CONNECTED</span>
          </div>
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricVal, color: '#ff0055' }}>{busyCount}</span>
            <span style={styles.metricLabel}>IN SESSION</span>
          </div>
          <div style={styles.metricItem}>
            <span style={{ ...styles.metricVal, color: alertCount > 0 ? '#ffea00' : '#8892b0' }}>
              {alertCount}
            </span>
            <span style={styles.metricLabel}>ALERTS</span>
          </div>
        </div>

        {/* Header Actions */}
        <div style={styles.headerRight}>
          <button
            onClick={() => fetchClubState()}
            className="cyber-button secondary"
            style={styles.refreshBtn}
            title="Refresh map"
          >
            🔄 REFRESH
          </button>
          <button onClick={onExit} className="cyber-button" style={styles.exitBtn}>
            🔒 EXIT TO LOCK SCREEN
          </button>
        </div>
      </div>

      {/* Navigation Filter Tabs */}
      <div style={styles.filtersBar}>
        <div style={styles.filterTabs}>
          {(['ALL', 'FREE', 'BUSY', 'ALERT', 'VIP'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`cyber-button ${filter === tab ? '' : 'secondary'}`}
              style={{
                ...styles.filterBtn,
                ...(filter === tab ? styles.filterBtnActive : {}),
              }}
            >
              {tab === 'ALERT' && alertCount > 0 ? `⚠️ ALERTS (${alertCount})` : tab}
            </button>
          ))}
        </div>
        <div style={styles.legend}>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#00ff88' }} /> FREE
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#ff0055' }} /> BUSY
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#ffea00' }} /> ALERT
          </span>
          <span style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#4a5568' }} /> OFFLINE
          </span>
        </div>
      </div>

      {/* Station Grid Map */}
      <div style={styles.mapGrid}>
        {loading && pcs.length === 0 ? (
          <div style={styles.loadingBox}>CONNECTING TO CLUB MESH NETWORK...</div>
        ) : (
          filteredPcs.map((pc) => {
            const isAlert = pc.status === 'ALERT';
            const isBusy = pc.status === 'BUSY';
            const isFree = pc.status === 'FREE';

            const statusColor = isAlert
              ? '#ffea00'
              : isBusy
              ? '#ff0055'
              : isFree
              ? '#00ff88'
              : '#64748b';

            return (
              <div
                key={pc.pc_id}
                style={{
                  ...styles.pcCard,
                  borderColor: isAlert ? '#ffea00' : isBusy ? 'rgba(255, 0, 85, 0.4)' : isFree ? 'rgba(0, 255, 136, 0.3)' : '#1e243b',
                  boxShadow: isAlert ? '0 0 15px rgba(255, 234, 0, 0.4)' : isBusy ? '0 0 10px rgba(255, 0, 85, 0.2)' : 'none',
                }}
              >
                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div>
                    <div style={styles.cardTitle}>{pc.label}</div>
                    <span style={styles.cardZoneBadge}>{pc.zone} ZONE</span>
                  </div>
                  <div
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: `${statusColor}22`,
                      color: statusColor,
                      border: `1px solid ${statusColor}`,
                    }}
                  >
                    {pc.status}
                  </div>
                </div>

                {/* Card Body */}
                <div style={styles.cardBody}>
                  {isAlert ? (
                    <div style={styles.alertBox}>
                      <div style={styles.alertHeader}>⚠️ CALL FOR HELP / ORDER</div>
                      <div style={styles.alertMessage}>{pc.alert || 'Player requested administrator'}</div>
                      <button
                        onClick={() => handleClearAlert(pc.pc_id)}
                        className="cyber-button"
                        style={styles.dismissAlertBtn}
                      >
                        ✓ ACKNOWLEDGE / CLEAR
                      </button>
                    </div>
                  ) : isBusy ? (
                    <div style={styles.busyBox}>
                      <div style={styles.gamerRow}>
                        <span style={styles.gamerIcon}>👤</span>
                        <span style={styles.gamerName}>{pc.current_user || 'Player'}</span>
                      </div>
                      <div style={styles.timerDisplay}>
                        ⏱️ {formatTimer(pc.remaining_seconds)}
                      </div>
                      {pc.current_game && (
                        <div style={styles.gamePlaying}>
                          🎮 {pc.current_game}
                        </div>
                      )}
                    </div>
                  ) : isFree ? (
                    <div style={styles.freeBox}>
                      <div style={styles.freeIcon}>🟢</div>
                      <div style={styles.freeText}>STATION AVAILABLE</div>
                      <div style={styles.freeSub}>Ready for gamer check-in</div>
                    </div>
                  ) : (
                    <div style={styles.offlineBox}>
                      <div style={styles.offlineIcon}>⚪</div>
                      <div style={styles.offlineText}>OFFLINE / POWER OFF</div>
                      <div style={styles.freeSub}>Kiosk client not active</div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div style={styles.cardFooter}>
                  {isFree ? (
                    <button
                      onClick={() => setSelectedPc(pc)}
                      className="cyber-button"
                      style={styles.cardActionBtn}
                    >
                      ⚡ UNLOCK / START
                    </button>
                  ) : isBusy ? (
                    <div style={styles.busyActionRow}>
                      <button
                        onClick={() => handleRemoteExtend(pc.pc_id, 30)}
                        className="cyber-button secondary"
                        style={styles.quickAddBtn}
                        title="Add 30 minutes"
                      >
                        +30M
                      </button>
                      <button
                        onClick={() => handleRemoteExtend(pc.pc_id, 60)}
                        className="cyber-button secondary"
                        style={styles.quickAddBtn}
                        title="Add 1 hour"
                      >
                        +1H
                      </button>
                      <button
                        onClick={() => handleRemoteLock(pc.pc_id)}
                        className="cyber-button"
                        style={styles.forceLockBtn}
                        title="Force lock PC and kill processes"
                      >
                        🔒 LOCK
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedPc(pc)}
                      className="cyber-button secondary"
                      style={styles.cardActionBtn}
                    >
                      MANAGE
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: Remote Station Management & Unlock */}
      {selectedPc && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                STATION CONTROL — {selectedPc.label} ({selectedPc.zone} ZONE)
              </h2>
              <button onClick={() => setSelectedPc(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* PC Specifications Card */}
              <div style={styles.specsCard}>
                <div style={styles.specTitle}>HARDWARE CONFIGURATION</div>
                <div style={styles.specGrid}>
                  <div><strong>CPU:</strong> {selectedPc.specs?.cpu || 'Core i5/i7'}</div>
                  <div><strong>GPU:</strong> {selectedPc.specs?.gpu || 'RTX 4060 / 4080'}</div>
                  <div><strong>RAM:</strong> {selectedPc.specs?.ram || '32GB DDR5'}</div>
                  <div><strong>Monitor:</strong> {selectedPc.specs?.monitor || '240Hz Fast IPS'}</div>
                </div>
              </div>

              {/* Unlock / New Session Form */}
              <div style={styles.formGroup}>
                <label style={styles.label}>PLAYER USERNAME / PHONE</label>
                <input
                  type="text"
                  className="cyber-input"
                  style={styles.input}
                  value={unlockUsername}
                  onChange={(e) => setUnlockUsername(e.target.value)}
                  placeholder="e.g. player1, Vaqlur, or guest"
                />
              </div>

              {/* Preset Tariff Packages */}
              <div style={styles.formGroup}>
                <label style={styles.label}>SELECT SESSION TIME / TARIFF</label>
                <div style={styles.tariffPills}>
                  {tariffs.length > 0
                    ? tariffs.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setUnlockDurationMin(t.duration_minutes)}
                          className={`cyber-button ${unlockDurationMin === t.duration_minutes ? '' : 'secondary'}`}
                          style={{
                            ...styles.tariffPill,
                            ...(unlockDurationMin === t.duration_minutes ? styles.tariffPillActive : {}),
                          }}
                        >
                          {t.name} ({t.price_kzt}₸)
                        </button>
                      ))
                    : [
                        { label: '30 Minutes', min: 30 },
                        { label: '1 Hour (Standard)', min: 60 },
                        { label: '2 Hours', min: 120 },
                        { label: '3 Hours (Pack)', min: 180 },
                        { label: 'Night Pack (8h)', min: 480 },
                      ].map((pkg) => (
                        <button
                          key={pkg.min}
                          type="button"
                          onClick={() => setUnlockDurationMin(pkg.min)}
                          className={`cyber-button ${unlockDurationMin === pkg.min ? '' : 'secondary'}`}
                          style={{
                            ...styles.tariffPill,
                            ...(unlockDurationMin === pkg.min ? styles.tariffPillActive : {}),
                          }}
                        >
                          {pkg.label}
                        </button>
                      ))}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div style={styles.modalActions}>
                <button
                  onClick={() =>
                    handleRemoteUnlock(selectedPc.pc_id, unlockUsername, unlockDurationMin)
                  }
                  className="cyber-button"
                  style={styles.confirmUnlockBtn}
                  disabled={actionLoading !== null}
                >
                  ⚡ START SESSION ({unlockDurationMin} MIN)
                </button>

                {selectedPc.status === 'BUSY' && (
                  <button
                    onClick={() => handleRemoteLock(selectedPc.pc_id)}
                    className="cyber-button secondary"
                    style={styles.modalLockBtn}
                  >
                    🔒 FORCE LOCK STATION
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100vw',
    height: '100vh',
    backgroundColor: '#070913',
    color: '#e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    fontFamily: '"Rajdhani", "Segoe UI", sans-serif',
  },
  toast: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    backgroundColor: '#00f0ff',
    color: '#070913',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    zIndex: 9999,
    boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)',
  },
  header: {
    height: '76px',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'linear-gradient(180deg, #0d1226 0%, #070913 100%)',
    borderBottom: '1px solid #1e243b',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoBadge: {
    padding: '6px 14px',
    backgroundColor: '#00f0ff',
    color: '#070913',
    fontWeight: 900,
    fontSize: '18px',
    letterSpacing: '3px',
    borderRadius: '4px',
    fontFamily: '"Orbitron", sans-serif',
  },
  headerTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    letterSpacing: '2px',
    color: '#f8fafc',
    fontFamily: '"Orbitron", sans-serif',
  },
  headerSubtitle: {
    fontSize: '11px',
    color: '#64748b',
    letterSpacing: '1px',
  },
  metricsRow: {
    display: 'flex',
    gap: '32px',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  metricVal: {
    fontSize: '22px',
    fontWeight: 900,
    fontFamily: '"Orbitron", sans-serif',
  },
  metricLabel: {
    fontSize: '10px',
    color: '#8892b0',
    letterSpacing: '1px',
  },
  headerRight: {
    display: 'flex',
    gap: '12px',
  },
  refreshBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  exitBtn: {
    padding: '8px 20px',
    fontSize: '13px',
    background: 'linear-gradient(135deg, #ff0055 0%, #a00030 100%)',
    borderColor: '#ff0055',
  },
  filtersBar: {
    padding: '12px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0d1d',
    borderBottom: '1px solid #1a2035',
  },
  filterTabs: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '6px 16px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  filterBtnActive: {
    borderColor: '#00f0ff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)',
  },
  legend: {
    display: 'flex',
    gap: '18px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  mapGrid: {
    flex: 1,
    padding: '24px 28px',
    overflowY: 'auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '20px',
  },
  loadingBox: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    marginTop: '60px',
    fontSize: '16px',
    color: '#00f0ff',
    letterSpacing: '2px',
  },
  pcCard: {
    backgroundColor: '#0c1024',
    border: '1px solid #1e243b',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'all 0.25s ease',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#f8fafc',
    fontFamily: '"Orbitron", sans-serif',
  },
  cardZoneBadge: {
    fontSize: '11px',
    color: '#00f0ff',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  statusBadge: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1px',
  },
  cardBody: {
    flex: 1,
    minHeight: '85px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    marginBottom: '14px',
  },
  alertBox: {
    backgroundColor: 'rgba(255, 234, 0, 0.1)',
    border: '1px solid #ffea00',
    borderRadius: '8px',
    padding: '10px',
  },
  alertHeader: {
    fontSize: '11px',
    color: '#ffea00',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  alertMessage: {
    fontSize: '13px',
    color: '#fff',
    marginBottom: '8px',
  },
  dismissAlertBtn: {
    width: '100%',
    padding: '5px 8px',
    fontSize: '11px',
    background: '#ffea00',
    color: '#070913',
    fontWeight: 'bold',
  },
  busyBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  gamerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  gamerIcon: {
    fontSize: '14px',
  },
  gamerName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  timerDisplay: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#ff0055',
    fontFamily: '"Orbitron", monospace',
  },
  gamePlaying: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  freeBox: {
    textAlign: 'center',
    padding: '10px 0',
  },
  freeIcon: {
    fontSize: '24px',
    marginBottom: '4px',
  },
  freeText: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  freeSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  offlineBox: {
    textAlign: 'center',
    padding: '10px 0',
  },
  offlineIcon: {
    fontSize: '20px',
    marginBottom: '4px',
  },
  offlineText: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 'bold',
  },
  cardFooter: {
    borderTop: '1px solid #1a2035',
    paddingTop: '12px',
  },
  cardActionBtn: {
    width: '100%',
    padding: '8px',
    fontSize: '12px',
  },
  busyActionRow: {
    display: 'flex',
    gap: '6px',
  },
  quickAddBtn: {
    flex: 1,
    padding: '7px 4px',
    fontSize: '11px',
  },
  forceLockBtn: {
    padding: '7px 12px',
    fontSize: '11px',
    background: 'rgba(255, 0, 85, 0.3)',
    borderColor: '#ff0055',
    color: '#ff4d88',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 16, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalBox: {
    width: '560px',
    backgroundColor: '#0e1224',
    border: '1px solid var(--border-neon, #00f0ff)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 0 35px rgba(0, 240, 255, 0.3)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #1e243b',
    paddingBottom: '12px',
  },
  modalTitle: {
    fontSize: '18px',
    color: '#00f0ff',
    margin: 0,
    fontFamily: '"Orbitron", sans-serif',
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '18px',
    cursor: 'pointer',
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  specsCard: {
    backgroundColor: '#070913',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #1a2035',
  },
  specTitle: {
    fontSize: '11px',
    color: '#00f0ff',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  specGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '6px',
    fontSize: '12px',
    color: '#cbd5e1',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
  },
  tariffPills: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '8px',
  },
  tariffPill: {
    padding: '8px 10px',
    fontSize: '11px',
    textAlign: 'center',
  },
  tariffPillActive: {
    borderColor: '#00f0ff',
    boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)',
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '10px',
  },
  confirmUnlockBtn: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  modalLockBtn: {
    padding: '10px',
    fontSize: '12px',
    borderColor: '#ff0055',
    color: '#ff4d88',
  },
};

export default AdminPanel;
