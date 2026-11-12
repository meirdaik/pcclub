import React, { useState } from 'react';
import { ClubPc, Tariff } from '../types';

interface PcControlModalProps {
  pc: ClubPc;
  tariffs: Tariff[];
  onClose: () => void;
  onUnlock: (pc: ClubPc, username: string, seconds: number) => Promise<void>;
  onLock: (pc: ClubPc) => Promise<void>;
  onExtend: (pc: ClubPc, seconds: number) => Promise<void>;
  onReboot: (pc: ClubPc) => Promise<void>;
  onShutdown: (pc: ClubPc) => Promise<void>;
}

export default function PcControlModal({
  pc,
  tariffs,
  onClose,
  onUnlock,
  onLock,
  onExtend,
  onReboot,
  onShutdown,
}: PcControlModalProps) {
  const [activeTab, setActiveTab] = useState<'session' | 'telemetry'>('session');
  const [username, setUsername] = useState('player1');
  const [selectedDuration, setSelectedDuration] = useState(3600); // 1 hour default
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const isBusy = pc.status === 'BUSY';
  const pcZone = pc.zone || 'Standard';
  const isVip = pcZone.toLowerCase().includes('vip');

  // Filter tariffs by zone or fallback
  const filteredTariffs = (tariffs || []).filter((t) => {
    const tariffZone = (t.zone_name || t.zone || '').toLowerCase();
    return tariffZone.includes(isVip ? 'vip' : 'standard');
  });

  const defaultTariffs: Tariff[] = [
    { id: 'def-1', name: '1 Hour', duration_minutes: 60, price_kzt: isVip ? 1500 : 800, zone_name: pcZone, zone: pcZone, is_package: false },
    { id: 'def-2', name: '2 Hours', duration_minutes: 120, price_kzt: isVip ? 2800 : 1500, zone_name: pcZone, zone: pcZone, is_package: false },
    { id: 'def-3', name: '3 Hours', duration_minutes: 180, price_kzt: isVip ? 3900 : 2100, zone_name: pcZone, zone: pcZone, is_package: false },
    { id: 'def-4', name: '5 Hours Pack', duration_minutes: 300, price_kzt: isVip ? 6000 : 3200, zone_name: pcZone, zone: pcZone, is_package: true },
    { id: 'def-5', name: 'Night Pass (8h)', duration_minutes: 480, price_kzt: isVip ? 7500 : 4000, zone_name: pcZone, zone: pcZone, is_package: true },
  ];

  const availableTariffs = filteredTariffs.length > 0 ? filteredTariffs : defaultTariffs;

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const uname = username.trim() || 'Guest';
    setIsSubmitting(true);
    setFeedback('Sending remote UNLOCK command to kiosk...');
    try {
      await onUnlock(pc, uname, selectedDuration);
      setFeedback('Station successfully unlocked!');
      setTimeout(() => onClose(), 800);
    } catch {
      setFeedback('Failed to unlock station. Verify network connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForceLock = async () => {
    if (!confirm(`Are you sure you want to FORCE LOCK ${pc.label}? Running games will be terminated immediately.`)) return;
    setIsSubmitting(true);
    try {
      await onLock(pc);
      setFeedback('Station locked and processes terminated.');
      setTimeout(() => onClose(), 800);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReboot = async () => {
    if (!confirm(`Trigger remote REBOOT for ${pc.label}?`)) return;
    setIsSubmitting(true);
    try {
      await onReboot(pc);
      setFeedback('Remote reboot initiated.');
      setTimeout(() => onClose(), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShutdown = async () => {
    if (!confirm(`Trigger remote SHUTDOWN for ${pc.label}?`)) return;
    setIsSubmitting(true);
    try {
      await onShutdown(pc);
      setFeedback('Remote shutdown initiated.');
      setTimeout(() => onClose(), 1000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={styles.header}>
          <div style={styles.headerTitleGroup}>
            <span style={styles.modalPcLabel} className="font-orbitron">
              {pc.label}
            </span>
            <span
              style={{
                ...styles.zoneBadge,
                color: isVip ? '#e0aaff' : '#00f0ff',
                borderColor: isVip ? 'var(--accent-purple)' : 'var(--border-neon)',
              }}
            >
              {pc.zone} Zone
            </span>
            <span style={styles.stationSub}>ID: {pc.pc_id}</span>
          </div>

          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        {/* Modal Tabs */}
        <div style={styles.tabBar}>
          <button
            onClick={() => setActiveTab('session')}
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'session' ? 'var(--border-neon)' : 'transparent',
              color: activeTab === 'session' ? '#00f0ff' : 'var(--text-muted)',
            }}
            className="font-orbitron"
          >
            🎮 SESSION CONTROL
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'telemetry' ? 'var(--border-neon)' : 'transparent',
              color: activeTab === 'telemetry' ? '#00f0ff' : 'var(--text-muted)',
            }}
            className="font-orbitron"
          >
            📊 TELEMETRY & HARDWARE
          </button>
        </div>

        {feedback && (
          <div style={styles.feedbackBanner}>
            ℹ️ {feedback}
          </div>
        )}

        {/* Tab 1: Session Management */}
        {activeTab === 'session' && (
          <div style={styles.tabContent}>
            {isBusy ? (
              <div style={styles.busyControlPanel}>
                <div style={styles.activeSessionBanner}>
                  <div>
                    <div style={styles.sessionStatusLabel}>ACTIVE SESSION</div>
                    <div style={styles.activeGamerName}>👤 {pc.current_user}</div>
                    <div style={styles.activeGameSub}>Game: {pc.current_game || 'System Desktop'}</div>
                  </div>
                  <div style={styles.activeTimerBox}>
                    <div style={styles.sessionStatusLabel}>TIME REMAINING</div>
                    <div style={styles.activeTimerVal} className="font-orbitron">
                      {Math.floor((pc.remaining_seconds || 0) / 60)}m {(pc.remaining_seconds || 0) % 60}s
                    </div>
                  </div>
                </div>

                <div style={styles.sectionHeader}>EXTEND ACTIVE TIME</div>
                <div style={styles.extendButtonGroup}>
                  <button
                    onClick={() => onExtend(pc, 1800)}
                    disabled={isSubmitting}
                    className="cyber-button secondary"
                    style={styles.extendBtn}
                  >
                    +30 Minutes
                  </button>
                  <button
                    onClick={() => onExtend(pc, 3600)}
                    disabled={isSubmitting}
                    className="cyber-button secondary"
                    style={styles.extendBtn}
                  >
                    +1 Hour
                  </button>
                  <button
                    onClick={() => onExtend(pc, 7200)}
                    disabled={isSubmitting}
                    className="cyber-button secondary"
                    style={styles.extendBtn}
                  >
                    +2 Hours
                  </button>
                </div>

                <div style={styles.dangerZone}>
                  <div style={styles.dangerTitle}>EMERGENCY TERMINATION</div>
                  <p style={styles.dangerText}>
                    Force locking will immediately taskkill all game and launcher processes on this remote Windows station and restore the fullscreen lock shield.
                  </p>
                  <button
                    onClick={handleForceLock}
                    disabled={isSubmitting}
                    className="cyber-button danger"
                    style={styles.forceLockBtn}
                  >
                    🔒 FORCE LOCK STATION & KILL GAMES
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleStartSession} style={styles.startForm}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>GAMER USERNAME / PHONE</label>
                  <input
                    type="text"
                    className="cyber-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter registered username or phone..."
                    required
                    style={styles.formInput}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>SELECT TARIFF / DURATION</label>
                  <div style={styles.tariffGrid}>
                    {availableTariffs.map((t) => {
                      const sec = t.duration_minutes * 60;
                      const isSel = selectedDuration === sec;
                      return (
                        <div
                          key={t.id}
                          onClick={() => setSelectedDuration(sec)}
                          style={{
                            ...styles.tariffCard,
                            borderColor: isSel ? 'var(--border-neon)' : 'var(--border-subtle)',
                            backgroundColor: isSel ? 'rgba(0, 240, 255, 0.15)' : 'rgba(7, 9, 19, 0.5)',
                          }}
                        >
                          <div style={styles.tariffName}>{t.name}</div>
                          <div style={styles.tariffPrice} className="font-orbitron">
                            {t.price_kzt.toLocaleString()} ₸
                          </div>
                          <div style={styles.tariffMin}>{t.duration_minutes} minutes</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="cyber-button"
                  style={styles.submitUnlockBtn}
                >
                  🚀 UNLOCK & START SESSION ({Math.round(selectedDuration / 60)} MIN)
                </button>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Hardware Telemetry & Processes */}
        {activeTab === 'telemetry' && (
          <div style={styles.tabContent}>
            <div style={styles.telemetryGrid}>
              {/* CPU Metric */}
              <div style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span>CPU LOAD</span>
                  <span className="font-orbitron" style={{ color: (pc.cpu_usage || 18) > 80 ? '#ff0055' : '#00f0ff' }}>
                    {pc.cpu_usage || 18}%
                  </span>
                </div>
                <div style={styles.metricBarTrack}>
                  <div
                    style={{
                      ...styles.metricBarFill,
                      width: `${Math.min(100, pc.cpu_usage || 18)}%`,
                      backgroundColor: (pc.cpu_usage || 18) > 80 ? '#ff0055' : '#00f0ff',
                    }}
                  />
                </div>
                <div style={styles.specSub}>{pc.specs?.cpu || 'Intel Core i7-14700K 20-Core'}</div>
              </div>

              {/* Memory Metric */}
              <div style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span>RAM USAGE</span>
                  <span className="font-orbitron" style={{ color: '#9d4edd' }}>
                    {pc.memory_usage || 42}%
                  </span>
                </div>
                <div style={styles.metricBarTrack}>
                  <div
                    style={{
                      ...styles.metricBarFill,
                      width: `${Math.min(100, pc.memory_usage || 42)}%`,
                      backgroundColor: '#9d4edd',
                    }}
                  />
                </div>
                <div style={styles.specSub}>{pc.specs?.ram || '32 GB DDR5-6000MHz'}</div>
              </div>

              {/* GPU Metric */}
              <div style={styles.metricCard}>
                <div style={styles.metricHeader}>
                  <span>GPU UTILIZATION</span>
                  <span className="font-orbitron" style={{ color: '#00ff88' }}>
                    {pc.gpu_usage || (isBusy ? 65 : 4)}%
                  </span>
                </div>
                <div style={styles.metricBarTrack}>
                  <div
                    style={{
                      ...styles.metricBarFill,
                      width: `${Math.min(100, pc.gpu_usage || (isBusy ? 65 : 4))}%`,
                      backgroundColor: '#00ff88',
                    }}
                  />
                </div>
                <div style={styles.specSub}>{pc.specs?.gpu || 'NVIDIA GeForce RTX 4080 Super'}</div>
              </div>
            </div>

            {/* Running Process Inspector */}
            <div style={styles.processBox}>
              <div style={styles.sectionHeader}>TRACKED SYSTEM & GAME PROCESSES</div>
              <div style={styles.processList}>
                {pc.processes && pc.processes.length > 0 ? (
                  pc.processes.map((p, idx) => (
                    <div key={idx} style={styles.processItem}>
                      <span>⚡ {typeof p === 'string' ? p : (p?.name || 'Process')}</span>
                      <span style={styles.runningBadge}>RUNNING</span>
                    </div>
                  ))
                ) : (
                  <div style={styles.noProcessNotice}>
                    {isBusy ? '🎮 Active Process: ' + (pc.current_game || 'Game Session') : 'No active game processes running (Kiosk locked)'}
                  </div>
                )}
              </div>
            </div>

            {/* BIOS & Anti-Cheat Security Inspector */}
            <div style={styles.securityBox}>
              <div style={styles.sectionHeader}>BIOS / UEFI & ANTI-CHEAT SECURITY STATUS</div>
              <div style={styles.secGrid}>
                <div style={styles.secCard}>
                  <div style={styles.secLabel}>UEFI SECURE BOOT</div>
                  <div
                    style={{
                      ...styles.secVal,
                      color:
                        pc.security?.secureBoot === 'ENABLED'
                          ? '#00ff88'
                          : pc.security?.secureBoot === 'DISABLED'
                          ? '#ff0055'
                          : '#ffea00',
                    }}
                  >
                    {pc.security?.secureBoot === 'ENABLED'
                      ? '🛡️ ACTIVE (ENABLED)'
                      : pc.security?.secureBoot === 'DISABLED'
                      ? '⚠️ OFF (DISABLED)'
                      : '⚙️ LEGACY / UNSUPPORTED'}
                  </div>
                </div>

                <div style={styles.secCard}>
                  <div style={styles.secLabel}>TPM 2.0 SECURITY CHIP</div>
                  <div
                    style={{
                      ...styles.secVal,
                      color: pc.security?.tpmPresent ? '#00f0ff' : '#ff0055',
                    }}
                  >
                    {pc.security?.tpmPresent ? '🔒 PRESENT & READY' : '❌ NOT DETECTED'}
                  </div>
                </div>

                <div style={styles.secCard}>
                  <div style={styles.secLabel}>ANTI-CHEAT READINESS</div>
                  <div
                    style={{
                      ...styles.secVal,
                      color: pc.security?.antiCheatReady ? '#00ff88' : '#ffea00',
                    }}
                  >
                    {pc.security?.antiCheatReady ? '⚡ FACEIT & VANGUARD READY' : '⚠️ CHECK FIRMWARE'}
                  </div>
                </div>

                <div style={styles.secCard}>
                  <div style={styles.secLabel}>MOTHERBOARD BIOS S/N</div>
                  <div style={styles.secValCode}>{pc.security?.biosSerial || 'UNKNOWN'}</div>
                </div>

                <div style={styles.secCardFull}>
                  <div style={styles.secLabel}>HARDWARE UUID (HWID)</div>
                  <div style={styles.secValCode}>{pc.security?.hwUuid || 'UNKNOWN'}</div>
                </div>

                {pc.mac_address && (
                  <div style={styles.secCardFull}>
                    <div style={styles.secLabel}>PRIMARY NETWORK MAC ADDRESS (WoL)</div>
                    <div style={styles.secValCode}>{pc.mac_address}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Remote Power Management */}
            <div style={styles.remotePowerBox}>
              <div style={styles.sectionHeader}>REMOTE POWER MANAGEMENT</div>
              <div style={styles.powerActions}>
                <button
                  onClick={handleReboot}
                  disabled={isSubmitting}
                  className="cyber-button secondary"
                  style={styles.powerBtn}
                >
                  🔄 REBOOT REMOTE PC
                </button>
                <button
                  onClick={handleShutdown}
                  disabled={isSubmitting}
                  className="cyber-button danger"
                  style={styles.powerBtn}
                >
                  ⏻ SHUTDOWN REMOTE PC
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
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
    padding: '20px',
  },
  modal: {
    width: '680px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    backgroundColor: '#0d1226',
    border: '1px solid var(--border-neon)',
    borderRadius: '16px',
    boxShadow: '0 0 35px rgba(0, 240, 255, 0.25)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#090d1e',
  },
  headerTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  modalPcLabel: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#fff',
  },
  zoneBadge: {
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '4px',
    border: '1px solid',
  },
  stationSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: 'rgba(7, 9, 19, 0.5)',
  },
  tabBtn: {
    flex: 1,
    padding: '14px',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  feedbackBanner: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderBottom: '1px solid var(--border-neon)',
    padding: '10px 24px',
    fontSize: '12px',
    color: '#00f0ff',
    fontWeight: 'bold',
  },
  tabContent: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  busyControlPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  activeSessionBanner: {
    backgroundColor: 'rgba(7, 9, 19, 0.7)',
    border: '1px solid #ff0055',
    borderRadius: '10px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionStatusLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  activeGamerName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#fff',
  },
  activeGameSub: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  activeTimerBox: {
    textAlign: 'right',
  },
  activeTimerVal: {
    fontSize: '26px',
    fontWeight: 900,
    color: '#ff0055',
  },
  sectionHeader: {
    fontSize: '11px',
    color: 'var(--border-neon)',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  extendButtonGroup: {
    display: 'flex',
    gap: '10px',
  },
  extendBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '12px',
  },
  dangerZone: {
    backgroundColor: 'rgba(255, 0, 85, 0.08)',
    border: '1px solid rgba(255, 0, 85, 0.3)',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '10px',
  },
  dangerTitle: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#ff0055',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  dangerText: {
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  forceLockBtn: {
    width: '100%',
    padding: '12px',
    fontSize: '12px',
  },
  startForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  formInput: {
    padding: '12px 14px',
    fontSize: '14px',
  },
  tariffGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: '10px',
  },
  tariffCard: {
    border: '1px solid',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tariffName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '4px',
  },
  tariffPrice: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#00f0ff',
    marginBottom: '2px',
  },
  tariffMin: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  submitUnlockBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    marginTop: '10px',
  },
  telemetryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '14px',
  },
  metricCard: {
    backgroundColor: '#070913',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '14px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  metricBarTrack: {
    height: '6px',
    backgroundColor: '#1e2648',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  metricBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s',
  },
  specSub: {
    fontSize: '10px',
    color: 'var(--text-muted)',
  },
  processBox: {
    backgroundColor: '#070913',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '14px',
  },
  processList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '120px',
    overflowY: 'auto',
  },
  processItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 10px',
    backgroundColor: '#0d1226',
    borderRadius: '6px',
    fontSize: '12px',
  },
  runningBadge: {
    fontSize: '10px',
    color: 'var(--status-free)',
    fontWeight: 'bold',
  },
  noProcessNotice: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '6px 0',
  },
  securityBox: {
    backgroundColor: '#070913',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  secGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
  },
  secCard: {
    backgroundColor: '#0d1226',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '10px',
  },
  secCardFull: {
    gridColumn: '1 / -1',
    backgroundColor: '#0d1226',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '10px',
  },
  secLabel: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    letterSpacing: '0.6px',
    marginBottom: '4px',
  },
  secVal: {
    fontSize: '12px',
    fontWeight: 'bold',
  },
  secValCode: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#00f0ff',
    wordBreak: 'break-all',
  },
  remotePowerBox: {
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '14px',
  },
  powerActions: {
    display: 'flex',
    gap: '12px',
  },
  powerBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '11px',
  },
};
