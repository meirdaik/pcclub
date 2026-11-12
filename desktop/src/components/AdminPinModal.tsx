import React, { useState } from 'react';

interface AdminPinModalProps {
  onClose: () => void;
}

export default function AdminPinModal({ onClose }: AdminPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = pin.trim();
    if (!cleanPin) {
      setError('Please enter Admin PIN');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (window.electronAPI?.adminUnlockToWindows) {
        const res = await window.electronAPI.adminUnlockToWindows(cleanPin);
        if (res.success) {
          onClose();
        } else {
          setError(res.error || 'Incorrect Admin PIN');
        }
      } else {
        // Fallback for browser dev mode
        if (cleanPin === 'admin123' || cleanPin === '9999' || cleanPin === 'admin') {
          alert('Maintenance Mode unlocked (Dev Browser Mode)');
          onClose();
        } else {
          setError('Incorrect Admin PIN (Default: admin123 or 9999)');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={{ fontSize: '24px' }}>🛡️</span>
            <div>
              <h2 className="font-orbitron" style={styles.title}>
                TECHNICIAN MAINTENANCE
              </h2>
              <div style={styles.subtitle}>Windows Shell & Explorer Unlock</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.description}>
            Enter the authorized Club Admin PIN to exit Kiosk Shell and restore Windows Explorer (`explorer.exe`), Task Manager, and the desktop.
          </p>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          <div style={styles.inputGroup}>
            <label style={styles.label}>ADMIN PIN / PASSWORD</label>
            <input
              type="password"
              autoFocus
              className="cyber-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN (Default: admin123)..."
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.btnRow}>
            <button
              type="submit"
              disabled={loading}
              className="cyber-button"
              style={styles.submitBtn}
            >
              {loading ? 'AUTHENTICATING...' : '🔓 UNLOCK WINDOWS DESKTOP'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cyber-button secondary"
              style={styles.cancelBtn}
            >
              CANCEL
            </button>
          </div>
        </form>
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
    backgroundColor: 'rgba(5, 7, 16, 0.88)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
  },
  modal: {
    width: '460px',
    maxWidth: '92vw',
    backgroundColor: '#0d1226',
    border: '1px solid #00f0ff',
    borderRadius: '16px',
    boxShadow: '0 0 35px rgba(0, 240, 255, 0.3)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
    backgroundColor: '#090d1e',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 900,
    color: '#00f0ff',
    margin: 0,
    letterSpacing: '1px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '18px',
    cursor: 'pointer',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  description: {
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: '1.5',
    margin: 0,
  },
  errorBox: {
    backgroundColor: 'rgba(255, 0, 85, 0.15)',
    border: '1px solid #ff0055',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#ff4d88',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  inputGroup: {
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
    width: '100%',
    padding: '12px 16px',
    backgroundColor: '#070913',
    border: '1px solid #2a3560',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '15px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '6px',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '12px',
  },
};
