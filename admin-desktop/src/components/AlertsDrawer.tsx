import React from 'react';
import { ClubPc } from '../types';

interface AlertsDrawerProps {
  pcsWithAlerts: ClubPc[];
  onClose: () => void;
  onClearAlert: (pc: ClubPc) => void;
  onSelectPc: (pc: ClubPc) => void;
}

export default function AlertsDrawer({
  pcsWithAlerts,
  onClose,
  onClearAlert,
  onSelectPc,
}: AlertsDrawerProps) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title} className="font-orbitron">
            🔔 STATION DISPATCH ALERTS ({pcsWithAlerts.length})
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <div style={styles.body}>
          {pcsWithAlerts.length === 0 ? (
            <div style={styles.emptyNotice}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontWeight: 'bold', color: 'var(--status-free)' }}>ALL CLEAR</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                No active help requests or snack orders from players.
              </div>
            </div>
          ) : (
            <div style={styles.alertList}>
              {pcsWithAlerts.map((pc) => (
                <div key={pc.id} className="glass-panel alert-pulse" style={styles.alertCard}>
                  <div style={styles.alertCardHeader}>
                    <span style={styles.pcLabel} className="font-orbitron">
                      {pc.label} ({pc.zone})
                    </span>
                    <span style={styles.gamerName}>Player: {pc.current_user || 'Guest'}</span>
                  </div>

                  <div style={styles.messageBox}>
                    <span style={{ fontSize: '18px' }}>⚠️</span>
                    <span style={styles.alertMessage}>{pc.alert}</span>
                  </div>

                  <div style={styles.cardActions}>
                    <button
                      onClick={() => onSelectPc(pc)}
                      className="cyber-button secondary"
                      style={styles.actionBtn}
                    >
                      ⚙️ Open Station
                    </button>
                    <button
                      onClick={() => onClearAlert(pc)}
                      className="cyber-button"
                      style={{ ...styles.actionBtn, backgroundColor: '#ffea00', color: '#070913', borderColor: '#ffea00' }}
                    >
                      ✓ Mark Handled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
    backgroundColor: 'rgba(5, 7, 16, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 1100,
  },
  drawer: {
    width: '440px',
    maxWidth: '100vw',
    height: '100%',
    backgroundColor: '#0c1024',
    borderLeft: '1px solid var(--border-neon)',
    boxShadow: '-10px 0 30px rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '18px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070913',
  },
  title: {
    fontSize: '15px',
    color: '#ffea00',
    fontWeight: 'bold',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '18px',
    cursor: 'pointer',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
  },
  emptyNotice: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  alertList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertCard: {
    padding: '14px',
    border: '1px solid #ffea00',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  alertCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pcLabel: {
    fontSize: '15px',
    color: '#fff',
    fontWeight: 'bold',
  },
  gamerName: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  messageBox: {
    backgroundColor: 'rgba(255, 234, 0, 0.1)',
    borderRadius: '6px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  alertMessage: {
    fontSize: '13px',
    color: '#ffea00',
    fontWeight: 'bold',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    flex: 1,
    padding: '8px',
    fontSize: '11px',
  },
};
