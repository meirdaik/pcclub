import { useEffect, useState, useCallback, useRef } from 'react';
import { ClubPc, Tariff } from './types';
import { initAdminConfig, getAdminConfig } from './services/config';
import { api } from './services/api';
import HeaderBar from './components/HeaderBar';
import PcCard from './components/PcCard';
import PcControlModal from './components/PcControlModal';
import AlertsDrawer from './components/AlertsDrawer';
import SettingsModal from './components/SettingsModal';
import ShiftModal from './components/ShiftModal';
import OrdersDrawer from './components/OrdersDrawer';
import BroadcastModal from './components/BroadcastModal';

export default function App() {
  const [pcs, setPcs] = useState<ClubPc[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [pendingOrdersCount, setPendingOrdersCount] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [selectedPc, setSelectedPc] = useState<ClubPc | null>(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState<boolean>(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState<boolean>(false);

  // Audio tone for alerts
  const lastAlertCount = useRef<number>(0);
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio might be muted
    }
  };

  const loadData = useCallback(async () => {
    try {
      const [pcList, tariffList, ordersList] = await Promise.all([
        api.fetchPcs(),
        api.fetchTariffs().catch(() => []),
        api.fetchOrders().catch(() => []),
      ]);
      setPcs(pcList);
      if (tariffList.length > 0) setTariffs(tariffList);
      if (Array.isArray(ordersList)) {
        const pending = ordersList.filter((o: any) => o.status === 'PENDING').length;
        setPendingOrdersCount(pending);
      }
      setIsConnected(true);

      // Check if new alert arrived to ring chime
      const currentAlerts = pcList.filter((p) => p.status === 'ALERT').length;
      if (currentAlerts > lastAlertCount.current) {
        playAlertChime();
      }
      lastAlertCount.current = currentAlerts;

      // Also update selected PC if modal is open
      setSelectedPc((prev) => {
        if (!prev) return null;
        return pcList.find((p) => p.pc_id === prev.pc_id || p.id === prev.id) || prev;
      });
    } catch (err) {
      console.warn('[Admin Dashboard] Sync failed:', err);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize and start polling
  useEffect(() => {
    initAdminConfig().then(() => {
      loadData();
    });

    const cfg = getAdminConfig();
    const interval = setInterval(loadData, cfg.pollIntervalMs || 2000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Quick Card Handlers
  const handleQuickUnlock = async (pc: ClubPc) => {
    const isVip = (pc.zone || '').toLowerCase().includes('vip');
    const ok = await api.unlockPc(pc.pc_id, 'player1', 3600, isVip);
    if (ok) {
      loadData();
    } else {
      alert(`Could not unlock ${pc.label}. Check server connectivity.`);
    }
  };

  const handleQuickExtend = async (pc: ClubPc, seconds: number) => {
    const ok = await api.extendPc(pc.pc_id, seconds);
    if (ok) {
      loadData();
    } else {
      alert(`Could not extend time on ${pc.label}.`);
    }
  };

  const handleQuickLock = async (pc: ClubPc) => {
    if (!confirm(`Force LOCK ${pc.label}? Active games will close.`)) return;
    const ok = await api.lockPc(pc.pc_id);
    if (ok) {
      loadData();
    } else {
      alert(`Could not lock ${pc.label}.`);
    }
  };

  const handleClearAlert = async (pc: ClubPc) => {
    const ok = await api.clearAlert(pc.pc_id);
    if (ok) {
      loadData();
    }
  };

  // Modal Handlers
  const handleModalUnlock = async (pc: ClubPc, username: string, seconds: number) => {
    const isVip = (pc.zone || '').toLowerCase().includes('vip');
    const ok = await api.unlockPc(pc.pc_id, username, seconds, isVip);
    if (!ok) throw new Error('Unlock command failed');
    loadData();
  };

  const handleModalLock = async (pc: ClubPc) => {
    const ok = await api.lockPc(pc.pc_id);
    if (!ok) throw new Error('Lock command failed');
    loadData();
  };

  const handleModalExtend = async (pc: ClubPc, seconds: number) => {
    const ok = await api.extendPc(pc.pc_id, seconds);
    if (!ok) throw new Error('Extend command failed');
    loadData();
  };

  const handleModalReboot = async (pc: ClubPc) => {
    const ok = await api.rebootPc(pc.pc_id);
    if (!ok) throw new Error('Reboot command failed');
    loadData();
  };

  const handleModalShutdown = async (pc: ClubPc) => {
    const ok = await api.shutdownPc(pc.pc_id);
    if (!ok) throw new Error('Shutdown command failed');
    loadData();
  };

  const handleModalTransfer = async (fromPc: ClubPc, toPcId: string) => {
    const res = await api.transferPcSession(fromPc.pc_id, toPcId);
    if (!res.ok) throw new Error(res.detail || 'Session transfer failed');
    loadData();
  };

  // Filter logic
  const filteredPcs = pcs.filter((pc) => {
    // Zone filter
    if (filterZone !== 'ALL') {
      if (!(pc.zone || '').toUpperCase().includes(filterZone)) return false;
    }
    // Status filter
    if (filterStatus !== 'ALL') {
      if (pc.status !== filterStatus) return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchLabel = pc.label.toLowerCase().includes(q);
      const matchUser = pc.current_user?.toLowerCase().includes(q) ?? false;
      const matchGame = pc.current_game?.toLowerCase().includes(q) ?? false;
      if (!matchLabel && !matchUser && !matchGame) return false;
    }
    return true;
  });

  const alertPcs = pcs.filter((p) => p.status === 'ALERT');

  return (
    <div style={styles.appContainer}>
      {/* Top Header */}
      <HeaderBar
        pcs={pcs}
        isConnected={isConnected}
        onRefresh={loadData}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        onOpenBroadcast={() => setIsBroadcastOpen(true)}
        onOpenOrders={() => setIsOrdersOpen(true)}
        onOpenShift={() => setIsShiftOpen(true)}
        alertCount={alertPcs.length}
        pendingOrdersCount={pendingOrdersCount}
        filterZone={filterZone}
        setFilterZone={setFilterZone}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Grid View */}
      <main style={styles.mainGridArea}>
        {isLoading && pcs.length === 0 ? (
          <div style={styles.loadingState}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
            <div className="font-orbitron" style={{ color: '#00f0ff', fontSize: '18px' }}>
              CONNECTING TO CLUB ARENA STATIONS...
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
              Polling station telemetry from club server
            </div>
          </div>
        ) : filteredPcs.length === 0 ? (
          <div style={styles.emptyFilterNotice}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔍</div>
            <div className="font-orbitron" style={{ color: '#fff', fontSize: '16px' }}>
              NO STATIONS MATCH FILTER
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
              Try selecting "ALL ZONES" or clearing the search query.
            </div>
          </div>
        ) : (
          <div style={styles.grid}>
            {filteredPcs.map((pc) => (
              <PcCard
                key={pc.id || pc.pc_id}
                pc={pc}
                onOpenControl={(p) => setSelectedPc(p)}
                onQuickUnlock={handleQuickUnlock}
                onQuickExtend={handleQuickExtend}
                onQuickLock={handleQuickLock}
                onClearAlert={handleClearAlert}
              />
            ))}
          </div>
        )}
      </main>

      {/* Station Control Modal */}
      {selectedPc && (
        <PcControlModal
          pc={selectedPc}
          tariffs={tariffs}
          allPcs={pcs}
          onClose={() => setSelectedPc(null)}
          onUnlock={handleModalUnlock}
          onLock={handleModalLock}
          onExtend={handleModalExtend}
          onReboot={handleModalReboot}
          onShutdown={handleModalShutdown}
          onTransfer={handleModalTransfer}
        />
      )}

      {/* Alerts Drawer */}
      {isAlertsOpen && (
        <AlertsDrawer
          pcsWithAlerts={alertPcs}
          onClose={() => setIsAlertsOpen(false)}
          onClearAlert={handleClearAlert}
          onSelectPc={(pc) => {
            setIsAlertsOpen(false);
            setSelectedPc(pc);
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => setIsSettingsOpen(false)}
          onSaved={() => {
            loadData();
          }}
        />
      )}

      {/* Cashier Shift (Z-Report) Modal */}
      {isShiftOpen && (
        <ShiftModal
          onClose={() => setIsShiftOpen(false)}
          onShiftUpdated={loadData}
        />
      )}

      {/* Snack Bar Orders Drawer */}
      {isOrdersOpen && (
        <OrdersDrawer
          onClose={() => setIsOrdersOpen(false)}
          onOrderUpdated={loadData}
        />
      )}

      {/* Broadcast Notification Modal */}
      {isBroadcastOpen && (
        <BroadcastModal
          pcs={pcs}
          onClose={() => setIsBroadcastOpen(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: 'var(--bg-dark)',
  },
  mainGridArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '20px',
  },
  loadingState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '60vh',
  },
  emptyFilterNotice: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40vh',
    backgroundColor: 'rgba(13, 18, 38, 0.4)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    padding: '40px',
  },
};
