import React, { useEffect, useState } from 'react';
import { ClubPc } from '../types';

interface PcCardProps {
  pc: ClubPc;
  onOpenControl: (pc: ClubPc) => void;
  onQuickUnlock: (pc: ClubPc) => void;
  onQuickExtend: (pc: ClubPc, seconds: number) => void;
  onQuickLock: (pc: ClubPc) => void;
  onClearAlert: (pc: ClubPc) => void;
}

export default function PcCard({
  pc,
  onOpenControl,
  onQuickUnlock,
  onQuickExtend,
  onQuickLock,
  onClearAlert,
}: PcCardProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(pc.remaining_seconds || 0);

  // Sync with prop updates
  useEffect(() => {
    setSecondsRemaining(pc.remaining_seconds || 0);
  }, [pc.remaining_seconds]);

  // Local 1-second countdown tick for silky smooth timer display
  useEffect(() => {
    if (pc.status !== 'BUSY' || secondsRemaining <= 0) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [pc.status, secondsRemaining]);

  const formatTimer = (sec: number): string => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isAlert = pc.status === 'ALERT';
  const isBusy = pc.status === 'BUSY';
  const isFree = pc.status === 'FREE';
  const isOffline = pc.status === 'OFFLINE';

  const statusColor = isAlert
    ? 'var(--status-alert)'
    : isBusy
    ? 'var(--status-busy)'
    : isFree
    ? 'var(--status-free)'
    : 'var(--status-offline)';

  const statusLabel = isAlert
    ? '⚠️ ATTENTION'
    : isBusy
    ? 'BUSY'
    : isFree
    ? 'READY'
    : 'OFFLINE';

  const isVip = (pc.zone || '').toLowerCase().includes('vip');

  return (
    <div
      className={`glass-panel ${isAlert ? 'alert-pulse' : ''}`}
      style={{
        ...styles.card,
        borderColor: isAlert ? '#ffea00' : isBusy ? 'rgba(255, 0, 85, 0.4)' : isFree ? 'rgba(0, 255, 136, 0.3)' : 'var(--border-subtle)',
        boxShadow: isBusy ? '0 0 15px rgba(255, 0, 85, 0.15)' : isFree ? '0 0 15px rgba(0, 255, 136, 0.1)' : 'none',
      }}
    >
      {/* Top Header Row */}
      <div style={styles.cardHeader}>
        <div style={styles.stationTitleGroup}>
          <span style={styles.stationLabel} className="font-orbitron">
            {pc.label}
          </span>
          <span
            style={{
              ...styles.zoneBadge,
              backgroundColor: isVip ? 'rgba(157, 78, 221, 0.25)' : 'rgba(0, 240, 255, 0.15)',
              borderColor: isVip ? 'var(--accent-purple)' : 'var(--border-neon)',
              color: isVip ? '#e0aaff' : '#00f0ff',
            }}
          >
            {isVip ? '💎 VIP' : 'STANDARD'}
          </span>
        </div>

        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: `${statusColor}22`,
            borderColor: statusColor,
            color: statusColor,
          }}
          className="font-orbitron"
        >
          <span style={{ ...styles.statusDot, backgroundColor: statusColor }} />
          {statusLabel}
        </div>
      </div>

      {/* Alert Ribbon if present */}
      {isAlert && pc.alert && (
        <div style={styles.alertRibbon}>
          <div style={styles.alertContent}>
            <span style={{ fontSize: '16px' }}>🚨</span>
            <span style={styles.alertText}>{pc.alert}</span>
          </div>
          <button
            onClick={() => onClearAlert(pc)}
            className="cyber-button"
            style={styles.ackBtn}
            title="Acknowledge and dismiss alert"
          >
            ✓ DISMISS
          </button>
        </div>
      )}

      {/* BIOS & Anti-Cheat Security Badges */}
      <div style={styles.securityBadgeRow}>
        <span
          style={{
            ...styles.secBadge,
            backgroundColor:
              pc.security?.secureBoot === 'ENABLED'
                ? 'rgba(0, 255, 136, 0.15)'
                : pc.security?.secureBoot === 'DISABLED'
                ? 'rgba(255, 0, 85, 0.2)'
                : 'rgba(255, 234, 0, 0.15)',
            borderColor:
              pc.security?.secureBoot === 'ENABLED'
                ? '#00ff88'
                : pc.security?.secureBoot === 'DISABLED'
                ? '#ff0055'
                : '#ffea00',
            color:
              pc.security?.secureBoot === 'ENABLED'
                ? '#00ff88'
                : pc.security?.secureBoot === 'DISABLED'
                ? '#ff0055'
                : '#ffea00',
          }}
          title={
            pc.security?.secureBoot === 'ENABLED'
              ? 'UEFI Secure Boot is Active'
              : pc.security?.secureBoot === 'DISABLED'
              ? 'UEFI Secure Boot is OFF'
              : 'Legacy BIOS / Unsupported'
          }
        >
          {pc.security?.secureBoot === 'ENABLED'
            ? '🛡️ SB: ON'
            : pc.security?.secureBoot === 'DISABLED'
            ? '⚠️ SB: OFF'
            : '⚙️ BIOS'}
        </span>

        <span
          style={{
            ...styles.secBadge,
            backgroundColor: pc.security?.tpmPresent ? 'rgba(0, 240, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            borderColor: pc.security?.tpmPresent ? '#00f0ff' : 'var(--border-subtle)',
            color: pc.security?.tpmPresent ? '#00f0ff' : 'var(--text-muted)',
          }}
          title={pc.security?.tpmPresent ? 'TPM 2.0 Security Chip Present' : 'No TPM Chip Detected'}
        >
          {pc.security?.tpmPresent ? '🔒 TPM 2.0' : '🔓 NO TPM'}
        </span>

        {(pc.security?.faceitInstalled || pc.security?.vanguardInstalled) && (
          <span
            style={{
              ...styles.secBadge,
              backgroundColor: 'rgba(157, 78, 221, 0.2)',
              borderColor: '#9d4edd',
              color: '#e0aaff',
            }}
            title={`Anti-Cheat Services: ${[
              pc.security?.faceitInstalled ? 'FACEIT AC' : null,
              pc.security?.vanguardInstalled ? 'Riot Vanguard' : null,
            ]
              .filter(Boolean)
              .join(' + ')}`}
          >
            ⚡ {pc.security?.faceitInstalled && pc.security?.vanguardInstalled ? 'AC: VG+FC' : pc.security?.faceitInstalled ? 'FACEIT' : 'VANGUARD'}
          </span>
        )}

        {pc.maintenance_mode && (
          <span
            style={{
              ...styles.secBadge,
              backgroundColor: 'rgba(255, 170, 0, 0.25)',
              borderColor: '#ffaa00',
              color: '#ffaa00',
            }}
            title="Technician Maintenance Mode Active"
          >
            🛠️ MAINT
          </span>
        )}
      </div>

      {/* Main Card Body */}
      <div style={styles.cardBody} onClick={() => onOpenControl(pc)}>
        {isBusy && (
          <div style={styles.busyStateBox}>
            <div style={styles.gamerRow}>
              <div style={styles.gamerAvatar}>👤</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={styles.gamerName}>{pc.current_user || 'Guest Player'}</div>
                <div style={styles.activeGame}>
                  🎮 {pc.current_game || 'Playing Games'}
                </div>
              </div>
            </div>

            <div style={styles.timerContainer}>
              <div style={styles.timerLabel}>SESSION REMAINING</div>
              <div style={styles.timerValue} className="font-orbitron">
                {formatTimer(secondsRemaining)}
              </div>
            </div>

            {/* Hardware Telemetry Strip */}
            <div style={styles.telemetryMiniStrip}>
              <div style={styles.telemetryMeter}>
                <span style={styles.telemetryLabel}>CPU: {pc.cpu_usage || 18}%</span>
                <div style={styles.meterTrack}>
                  <div
                    style={{
                      ...styles.meterFill,
                      width: `${Math.min(100, pc.cpu_usage || 18)}%`,
                      backgroundColor: (pc.cpu_usage || 18) > 85 ? '#ff0055' : '#00f0ff',
                    }}
                  />
                </div>
              </div>
              <div style={styles.telemetryMeter}>
                <span style={styles.telemetryLabel}>RAM: {pc.memory_usage || 42}%</span>
                <div style={styles.meterTrack}>
                  <div
                    style={{
                      ...styles.meterFill,
                      width: `${Math.min(100, pc.memory_usage || 42)}%`,
                      backgroundColor: '#9d4edd',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {isFree && (
          <div style={styles.freeStateBox}>
            <div style={styles.freeCircle}>✓</div>
            <div style={styles.freeHeading} className="font-orbitron">
              READY FOR PLAYER
            </div>
            <div style={styles.freeSub}>Client Kiosk Online & Guarded</div>
          </div>
        )}

        {isOffline && (
          <div style={styles.offlineStateBox}>
            <div style={styles.offlineCircle}>✕</div>
            <div style={styles.offlineHeading} className="font-orbitron">
              STATION OFFLINE
            </div>
            <div style={styles.offlineSub}>Check PC Power / Network Cable</div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div style={styles.cardFooter}>
        {isBusy ? (
          <div style={styles.actionButtonGroup}>
            <button
              onClick={() => onQuickExtend(pc, 1800)}
              className="cyber-button secondary"
              style={styles.quickActionBtn}
              title="Add 30 minutes to session"
            >
              +30m
            </button>
            <button
              onClick={() => onQuickExtend(pc, 3600)}
              className="cyber-button secondary"
              style={styles.quickActionBtn}
              title="Add 1 hour to session"
            >
              +1h
            </button>
            <button
              onClick={() => onQuickLock(pc)}
              className="cyber-button danger"
              style={styles.quickActionBtn}
              title="Terminate session and kill game processes"
            >
              🔒 Lock
            </button>
            <button
              onClick={() => onOpenControl(pc)}
              className="cyber-button"
              style={styles.quickActionBtn}
              title="Open full station details and telemetry"
            >
              ⚙️
            </button>
          </div>
        ) : (
          <div style={styles.actionButtonGroup}>
            <button
              onClick={() => onQuickUnlock(pc)}
              className="cyber-button"
              style={{ ...styles.quickActionBtn, flex: 2 }}
              disabled={isOffline}
            >
              🚀 UNLOCK (1H)
            </button>
            <button
              onClick={() => onOpenControl(pc)}
              className="cyber-button secondary"
              style={{ ...styles.quickActionBtn, flex: 1 }}
            >
              ⚙️ MANAGE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(7, 9, 19, 0.4)',
  },
  stationTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  stationLabel: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#fff',
  },
  zoneBadge: {
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
    letterSpacing: '0.5px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '12px',
    border: '1px solid',
    letterSpacing: '0.8px',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
  },
  securityBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: 'rgba(5, 7, 15, 0.4)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
    flexWrap: 'wrap',
  },
  secBadge: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.4px',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
  },
  alertRibbon: {
    backgroundColor: 'rgba(255, 234, 0, 0.15)',
    borderBottom: '1px solid #ffea00',
    padding: '8px 12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  alertContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    minWidth: 0,
  },
  alertText: {
    fontSize: '12px',
    color: '#ffea00',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  ackBtn: {
    padding: '3px 8px',
    fontSize: '10px',
    background: '#ffea00',
    color: '#070913',
    borderColor: '#ffea00',
    flexShrink: 0,
  },
  cardBody: {
    padding: '14px',
    flex: 1,
    cursor: 'pointer',
    minHeight: '135px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  busyStateBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  gamerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  gamerAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    border: '1px solid #ff0055',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  gamerName: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  activeGame: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  timerContainer: {
    backgroundColor: 'rgba(7, 9, 19, 0.7)',
    borderRadius: '8px',
    padding: '8px 12px',
    border: '1px solid rgba(255, 0, 85, 0.25)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  timerValue: {
    fontSize: '20px',
    fontWeight: 900,
    color: '#ff0055',
  },
  telemetryMiniStrip: {
    display: 'flex',
    gap: '12px',
  },
  telemetryMeter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
  },
  telemetryLabel: {
    fontSize: '10px',
    color: '#94a3b8',
  },
  meterTrack: {
    height: '4px',
    backgroundColor: '#070913',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  freeStateBox: {
    textAlign: 'center',
    padding: '8px 0',
  },
  freeCircle: {
    width: '36px',
    height: '36px',
    margin: '0 auto 6px auto',
    borderRadius: '50%',
    border: '2px solid var(--status-free)',
    color: 'var(--status-free)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  freeHeading: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: 'var(--status-free)',
    letterSpacing: '1px',
    marginBottom: '2px',
  },
  freeSub: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  offlineStateBox: {
    textAlign: 'center',
    padding: '8px 0',
  },
  offlineCircle: {
    width: '36px',
    height: '36px',
    margin: '0 auto 6px auto',
    borderRadius: '50%',
    border: '2px solid var(--status-offline)',
    color: 'var(--status-offline)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  offlineHeading: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: 'var(--status-offline)',
    letterSpacing: '1px',
    marginBottom: '2px',
  },
  offlineSub: {
    fontSize: '11px',
    color: '#475569',
  },
  cardFooter: {
    padding: '10px 14px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(7, 9, 19, 0.4)',
  },
  actionButtonGroup: {
    display: 'flex',
    gap: '6px',
  },
  quickActionBtn: {
    flex: 1,
    padding: '7px 4px',
    fontSize: '11px',
  },
};
