import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { getAdminConfig } from '../services/config';

interface ShiftModalProps {
  onClose: () => void;
  onShiftUpdated: () => void;
}

export default function ShiftModal({ onClose, onShiftUpdated }: ShiftModalProps) {
  const config = getAdminConfig();
  const [shiftData, setShiftData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [zReport, setZReport] = useState<any | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const loadShift = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchShiftCurrent();
      setShiftData(data);
    } catch (err) {
      console.warn('Could not load shift:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadShift();
  }, []);

  const handleCloseShift = async () => {
    if (!confirm('Are you sure you want to CLOSE the current cashier shift and print the Z-Report?')) return;
    setIsClosing(true);
    try {
      const report = await api.closeShift(config.cashierName || 'Admin Cashier', notes);
      setZReport(report);
      onShiftUpdated();
    } catch {
      alert('Error closing cashier shift.');
    } finally {
      setIsClosing(false);
    }
  };

  const printZReport = () => {
    window.print();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>💵</span>
            <div>
              <h2 style={styles.title} className="font-orbitron">
                {zReport ? 'Z-REPORT — SHIFT CLOSURE' : 'CASHIER SHIFT & FINANCIALS'}
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {zReport ? 'Official fiscal closure report' : 'Real-time revenue, sessions & bar sales'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {zReport ? (
          /* Official Z-Report Slip */
          <div style={styles.content}>
            <div style={styles.receiptBox}>
              <div style={styles.receiptHeader}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>{config.clubName}</div>
                <div style={{ fontSize: '12px', color: '#444' }}>CYBER ARENA & PC CLUB</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>=== FISCAL Z-REPORT ===</div>
              </div>

              <div style={styles.receiptRow}>
                <span>SHIFT ID:</span>
                <span style={{ fontFamily: 'monospace' }}>{zReport.shift_id?.slice(0, 8)}...</span>
              </div>
              <div style={styles.receiptRow}>
                <span>CASHIER:</span>
                <span style={{ fontWeight: 'bold' }}>{zReport.cashier_name}</span>
              </div>
              <div style={styles.receiptRow}>
                <span>OPENED AT:</span>
                <span>{new Date(zReport.opened_at).toLocaleString()}</span>
              </div>
              <div style={styles.receiptRow}>
                <span>CLOSED AT:</span>
                <span>{new Date(zReport.closed_at).toLocaleString()}</span>
              </div>

              <div style={styles.receiptDivider} />

              <div style={styles.receiptRow}>
                <span>SESSIONS STARTED:</span>
                <span style={{ fontWeight: 'bold' }}>{zReport.total_sessions}</span>
              </div>
              <div style={styles.receiptRow}>
                <span>SESSION REVENUE:</span>
                <span style={{ fontWeight: 'bold' }}>{Number(zReport.session_revenue_kzt).toLocaleString()} ₸</span>
              </div>
              <div style={styles.receiptRow}>
                <span>BAR ORDERS:</span>
                <span style={{ fontWeight: 'bold' }}>{zReport.total_orders}</span>
              </div>
              <div style={styles.receiptRow}>
                <span>BAR REVENUE:</span>
                <span style={{ fontWeight: 'bold' }}>{Number(zReport.order_revenue_kzt).toLocaleString()} ₸</span>
              </div>

              <div style={styles.receiptDivider} />

              <div style={{ ...styles.receiptRow, fontSize: '16px', fontWeight: 'bold' }}>
                <span>TOTAL REVENUE:</span>
                <span style={{ color: '#059669' }}>{Number(zReport.total_revenue_kzt).toLocaleString()} ₸</span>
              </div>

              {zReport.notes && (
                <div style={{ fontSize: '12px', color: '#555', marginTop: '10px', fontStyle: 'italic' }}>
                  Note: {zReport.notes}
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#777', marginTop: '16px' }}>
                *** SHIFT CLOSED — NEW SHIFT OPENED ***
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={printZReport} className="cyber-button" style={{ flex: 1 }}>
                🖨️ PRINT Z-REPORT
              </button>
              <button onClick={onClose} className="cyber-button secondary" style={{ flex: 1 }}>
                CLOSE WINDOW
              </button>
            </div>
          </div>
        ) : (
          /* Active Shift Dashboard */
          <div style={styles.content}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>Loading shift data...</div>
            ) : (
              <>
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>ACTIVE CASHIER</div>
                    <div style={styles.statVal}>{config.cashierName || shiftData?.cashier_name || 'Admin Cashier'}</div>
                    <div style={{ fontSize: '11px', color: '#10b981', marginTop: '4px' }}>🟢 Shift in Progress</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>STARTED AT</div>
                    <div style={{ ...styles.statVal, fontSize: '14px', marginTop: '4px' }}>
                      {shiftData?.opened_at ? new Date(shiftData.opened_at).toLocaleTimeString() : 'Current Session'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                      {shiftData?.opened_at ? new Date(shiftData.opened_at).toLocaleDateString() : 'Today'}
                    </div>
                  </div>
                </div>

                <div style={{ ...styles.statsGrid, marginTop: '14px' }}>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>GAMING SESSIONS</div>
                    <div style={styles.statVal} className="font-orbitron">{shiftData?.total_sessions || 0}</div>
                    <div style={styles.revenueSub}>Revenue: {(shiftData?.session_revenue_kzt || 0).toLocaleString()} ₸</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statLabel}>BAR / SNACK ORDERS</div>
                    <div style={styles.statVal} className="font-orbitron">{shiftData?.total_orders || 0}</div>
                    <div style={styles.revenueSub}>Revenue: {(shiftData?.order_revenue_kzt || 0).toLocaleString()} ₸</div>
                  </div>
                </div>

                {/* Grand Total Revenue Box */}
                <div style={styles.totalRevenueCard}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' }}>TOTAL CASH DESK REVENUE</div>
                    <div style={{ fontSize: '32px', fontWeight: 900, color: '#00ff88' }} className="font-orbitron">
                      {(shiftData?.total_revenue_kzt || 0).toLocaleString()} ₸
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', textAlign: 'right' }}>
                    Includes: Hourly Gaming + Packs + Bar Snacks
                  </div>
                </div>

                {/* Closure Form */}
                <div style={{ marginTop: '20px' }}>
                  <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>
                    SHIFT HANDOVER NOTES (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    className="cyber-input"
                    placeholder="e.g. Cash in register: 45,000₸, Headset PC-04 returned"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}
                  />

                  <button
                    onClick={handleCloseShift}
                    disabled={isClosing}
                    className="cyber-button danger"
                    style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 'bold' }}
                  >
                    🔒 CLOSE SHIFT & PRINT Z-REPORT
                  </button>
                </div>
              </>
            )}
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
    width: '560px',
    maxWidth: '95vw',
    backgroundColor: '#0d1226',
    border: '1px solid var(--border-neon)',
    borderRadius: '16px',
    boxShadow: '0 0 35px rgba(0, 240, 255, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    backgroundColor: '#090d1e',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#00f0ff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  content: {
    padding: '24px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  statCard: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '14px',
  },
  statLabel: {
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 'bold',
    letterSpacing: '1px',
    marginBottom: '6px',
  },
  statVal: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
  },
  revenueSub: {
    fontSize: '12px',
    color: '#10b981',
    fontWeight: 'bold',
    marginTop: '4px',
  },
  totalRevenueCard: {
    marginTop: '14px',
    background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 240, 255, 0.1) 100%)',
    border: '1px solid #00ff88',
    borderRadius: '10px',
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptBox: {
    background: '#f8fafc',
    color: '#0f172a',
    borderRadius: '8px',
    padding: '24px',
    fontFamily: 'monospace',
    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
  },
  receiptHeader: {
    textAlign: 'center',
    marginBottom: '16px',
  },
  receiptRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    margin: '6px 0',
  },
  receiptDivider: {
    borderBottom: '1px dashed #94a3b8',
    margin: '12px 0',
  },
};
