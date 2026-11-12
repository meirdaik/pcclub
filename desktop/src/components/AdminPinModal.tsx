import React, { useState, useEffect, useRef } from 'react';

interface AdminPinModalProps {
  onClose: () => void;
}

export default function AdminPinModal({ onClose }: AdminPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Aggressively focus input on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleUnlockWithPin = async (inputPin: string) => {
    const cleanPin = inputPin.trim();
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
          setError(res.error || 'Incorrect Admin PIN (Default: admin123 or 9999)');
        }
      } else {
        // Fallback for browser dev mode
        const valid = ['admin123', '9999', 'admin', 'фвьшт123', 'фвьшт', '1234'];
        if (valid.includes(cleanPin)) {
          alert('Maintenance Mode unlocked (Dev Browser Mode)');
          onClose();
        } else {
          setError('Incorrect Admin PIN (Default: admin123 or 9999)');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleUnlockWithPin(pin);
  };

  const handleKeypadClick = (val: string) => {
    if (val === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
    } else if (val === 'clear') {
      setPin('');
    } else {
      setPin((prev) => prev + val);
    }
    inputRef.current?.focus();
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
            Enter Club Admin PIN to exit Kiosk Mode and restore Windows Explorer (`explorer.exe`), Taskbar, and Start Menu.
          </p>

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}

          {/* Quick Unlock 1-Click Action */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleUnlockWithPin('admin123')}
            style={styles.quickUnlockBtn}
          >
            ⚡ 1-CLICK ADMIN UNLOCK (PIN: admin123)
          </button>

          <div style={styles.inputGroup}>
            <label style={styles.label}>ENTER PIN OR PASSWORD (Default: admin123 / 9999)</label>
            <input
              ref={inputRef}
              type="text"
              autoFocus
              className="cyber-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Type or click keypad below..."
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* On-Screen Touch / Click Keypad */}
          <div style={styles.keypadGrid}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'admin', '0', '⌫'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  if (key === '⌫') handleKeypadClick('backspace');
                  else if (key === 'admin') setPin('admin123');
                  else handleKeypadClick(key);
                }}
                style={key === 'admin' ? styles.keypadAdminBtn : styles.keypadBtn}
              >
                {key}
              </button>
            ))}
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
    backgroundColor: 'rgba(5, 7, 16, 0.92)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '20px',
  },
  modal: {
    width: '460px',
    maxWidth: '94vw',
    backgroundColor: '#0c1124',
    border: '1px solid #00f0ff',
    borderRadius: '16px',
    boxShadow: '0 0 40px rgba(0, 240, 255, 0.4)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 22px',
    borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
    backgroundColor: '#080d1d',
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
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
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
  quickUnlockBtn: {
    padding: '12px',
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    border: '1px solid #00ff88',
    borderRadius: '8px',
    color: '#00ff88',
    fontWeight: 900,
    fontSize: '13px',
    letterSpacing: '1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(0, 255, 136, 0.2)',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
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
    fontSize: '16px',
    fontFamily: 'monospace',
    outline: 'none',
  },
  keypadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  keypadBtn: {
    padding: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  keypadAdminBtn: {
    padding: '10px',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid rgba(0, 240, 255, 0.4)',
    borderRadius: '8px',
    color: '#00f0ff',
    fontSize: '12px',
    fontWeight: 900,
    letterSpacing: '0.5px',
    cursor: 'pointer',
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '4px',
  },
  submitBtn: {
    flex: 2,
    padding: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    backgroundColor: '#00f0ff',
    color: '#050710',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  cancelBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};
