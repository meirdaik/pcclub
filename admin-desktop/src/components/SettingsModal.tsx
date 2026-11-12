import React, { useState } from 'react';
import { getAdminConfig, updateAdminConfig } from '../services/config';
import { api } from '../services/api';

interface SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const current = getAdminConfig();
  const [serverIp, setServerIp] = useState(current.serverIp);
  const [serverPort, setServerPort] = useState(String(current.serverPort));
  const [clubName, setClubName] = useState(current.clubName);
  const [cashierName, setCashierName] = useState(current.cashierName);
  const [pollMs, setPollMs] = useState(String(current.pollIntervalMs));

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleAutoDetect = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`http://127.0.0.1:${serverPort || 8000}/api/system/info`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        if (data.server_ip) {
          setServerIp(data.server_ip);
          setTestResult({ ok: true, message: `✓ Auto-detected local server IP: ${data.server_ip}` });
          setTesting(false);
          return;
        }
      }
    } catch {}
    setTestResult({ ok: false, message: 'Could not auto-detect server on 127.0.0.1:8000. Ensure run-server.bat is running.' });
    setTesting(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const testUrl = `http://${serverIp.trim()}:${serverPort.trim()}`;
    const ok = await api.testConnection(testUrl);
    setTesting(false);
    if (ok) {
      setTestResult({ ok: true, message: `Connected successfully to club server at ${testUrl}!` });
    } else {
      setTestResult({ ok: false, message: `Failed to connect to ${testUrl}. Check IP and firewall port 8000.` });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateAdminConfig({
      serverIp: serverIp.trim(),
      serverPort: Number(serverPort) || 8000,
      clubName: clubName.trim(),
      cashierName: cashierName.trim(),
      pollIntervalMs: Number(pollMs) || 2000,
    });
    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.title} className="font-orbitron">
            ⚙️ CASHIER CONSOLE CONFIGURATION
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={styles.body}>
          <div style={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>SERVER LAN IP ADDRESS</label>
              <button
                type="button"
                onClick={handleAutoDetect}
                disabled={testing}
                className="cyber-button secondary"
                style={{ fontSize: '10px', padding: '3px 8px' }}
                title="Detect IP from local backend instance"
              >
                📡 AUTO-DETECT
              </button>
            </div>
            <input
              type="text"
              className="cyber-input"
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder="e.g. 10.72.49.124 or 127.0.0.1"
              required
            />
            <span style={styles.hint}>The Local IP of the main PC running the FastAPI backend.</span>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>SERVER PORT</label>
            <input
              type="number"
              className="cyber-input"
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              placeholder="8000"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CLUB ARENA NAME</label>
            <input
              type="text"
              className="cyber-input"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              placeholder="CYBER ARENA CLUB"
              required
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>CASHIER / OPERATOR NAME</label>
            <input
              type="text"
              className="cyber-input"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Operator"
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>STATION REFRESH INTERVAL (MS)</label>
            <select
              className="cyber-input"
              value={pollMs}
              onChange={(e) => setPollMs(e.target.value)}
            >
              <option value="1000">1000ms (High speed 1s)</option>
              <option value="2000">2000ms (Standard 2s)</option>
              <option value="5000">5000ms (Low network traffic 5s)</option>
            </select>
          </div>

          {testResult && (
            <div
              style={{
                ...styles.testResultBox,
                borderColor: testResult.ok ? 'var(--status-free)' : 'var(--status-busy)',
                backgroundColor: testResult.ok ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 0, 85, 0.1)',
                color: testResult.ok ? 'var(--status-free)' : '#ff4d88',
              }}
            >
              {testResult.ok ? '✅' : '❌'} {testResult.message}
            </div>
          )}

          <div style={styles.btnRow}>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="cyber-button secondary"
              style={styles.actionBtn}
            >
              {testing ? 'Testing...' : '🔌 Test Connection'}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="cyber-button"
              style={styles.actionBtn}
            >
              {isSaving ? 'Saving...' : '💾 Save & Connect'}
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
    backgroundColor: 'rgba(5, 7, 16, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '20px',
  },
  modal: {
    width: '520px',
    maxWidth: '95vw',
    backgroundColor: '#0d1226',
    border: '1px solid var(--border-neon)',
    borderRadius: '16px',
    boxShadow: '0 0 30px rgba(0, 240, 255, 0.2)',
    overflow: 'hidden',
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#070913',
  },
  title: {
    fontSize: '15px',
    color: '#00f0ff',
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
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
    letterSpacing: '1px',
  },
  hint: {
    fontSize: '10px',
    color: '#64748b',
  },
  testResultBox: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  btnRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '10px',
  },
  actionBtn: {
    flex: 1,
    padding: '12px',
    fontSize: '12px',
  },
};
