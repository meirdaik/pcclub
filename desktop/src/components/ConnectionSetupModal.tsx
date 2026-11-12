import React, { useState } from 'react';
import { getAppConfig, updateAndSaveAppConfig } from '../services/config';
import { socketService } from '../services/socket';

interface ConnectionSetupModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export default function ConnectionSetupModal({ onClose, onSaved }: ConnectionSetupModalProps) {
  const current = getAppConfig();
  const [serverIp, setServerIp] = useState<string>(current.serverIp);
  const [serverPort, setServerPort] = useState<string>(String(current.serverPort));
  const [pcNumber, setPcNumber] = useState<number>(current.pcNumber || 1);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isVip = pcNumber > 8;

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const ip = serverIp.trim();
    const port = serverPort.trim() || '8000';
    const testUrl = `http://${ip}:${port}/api/system/info`;

    try {
      const res = await fetch(testUrl, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          ok: true,
          message: `✓ Connected! Server: "${data.club_name || 'PC Club'}" at ${ip}:${port}`,
        });
      } else {
        setTestResult({
          ok: false,
          message: `Server returned HTTP ${res.status}. Check URL and port.`,
        });
      }
    } catch {
      // Fallback test /health
      try {
        const fallback = await fetch(`http://${ip}:${port}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        if (fallback.ok) {
          setTestResult({
            ok: true,
            message: `✓ Connected! Backend /health is OK at ${ip}:${port}`,
          });
        } else {
          setTestResult({
            ok: false,
            message: `✕ Cannot reach ${ip}:${port}. Check IP address and firewall.`,
          });
        }
      } catch (err: unknown) {
        setTestResult({
          ok: false,
          message: `✕ Network unreachable. Verify backend server is running on ${ip}:${port}`,
        });
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const padNum = String(pcNumber).padStart(3, '0');
    const newPcId = `pc-${padNum}`;
    const newPcLabel = `PC #${pcNumber}`;

    await updateAndSaveAppConfig({
      serverIp: serverIp.trim(),
      serverPort: Number(serverPort) || 8000,
      pcNumber,
      pcId: newPcId,
      pcLabel: newPcLabel,
    });

    // Reconnect live socket with the updated configuration
    socketService.reconnectWithConfig();

    setIsSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <span style={{ fontSize: '20px' }}>⚙️</span>
            <div>
              <div style={styles.title} className="font-orbitron">
                KIOSK STATION & NETWORK SETUP
              </div>
              <div style={styles.subTitle}>Configure Club Server Connection and Station Number</div>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} style={styles.body}>
          {/* Server Connection Group */}
          <div style={styles.sectionHeader}>1. CLUB SERVER CONNECTION</div>
          <div style={styles.row}>
            <div style={{ flex: 3 }}>
              <label style={styles.label}>SERVER LAN IP ADDRESS</label>
              <input
                type="text"
                className="cyber-input"
                value={serverIp}
                onChange={(e) => setServerIp(e.target.value)}
                placeholder="e.g. 10.72.161.182 or 192.168.1.50"
                style={styles.input}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>PORT</label>
              <input
                type="number"
                className="cyber-input"
                value={serverPort}
                onChange={(e) => setServerPort(e.target.value)}
                placeholder="8000"
                style={styles.input}
                required
              />
            </div>
          </div>

          <div style={styles.testRow}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !serverIp.trim()}
              className="cyber-button secondary"
              style={styles.testBtn}
            >
              {testing ? '🔄 Testing...' : '🔍 TEST CONNECTION'}
            </button>
            {testResult && (
              <div
                style={{
                  ...styles.testResultBox,
                  backgroundColor: testResult.ok ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 0, 85, 0.15)',
                  borderColor: testResult.ok ? '#00ff88' : '#ff0055',
                  color: testResult.ok ? '#00ff88' : '#ff0055',
                }}
              >
                {testResult.message}
              </div>
            )}
          </div>

          {/* Station Assignment Group */}
          <div style={styles.sectionHeader}>2. THIS STATION'S ASSIGNMENT</div>
          <div style={styles.stationConfigBox}>
            <div style={styles.stationCurrentBadge}>
              <div style={styles.stationLabelLarge} className="font-orbitron">
                PC #{pcNumber}
              </div>
              <div
                style={{
                  ...styles.zoneBadge,
                  backgroundColor: isVip ? 'rgba(157, 78, 221, 0.25)' : 'rgba(0, 240, 255, 0.15)',
                  borderColor: isVip ? '#9d4edd' : '#00f0ff',
                  color: isVip ? '#e0aaff' : '#00f0ff',
                }}
              >
                {isVip ? '💎 VIP ZONE' : '🎮 STANDARD ZONE'}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={styles.label}>SELECT PC NUMBER (1 - 50)</label>
              <div style={styles.pcQuickGrid}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPcNumber(num)}
                    className="cyber-button"
                    style={{
                      ...styles.pcNumBtn,
                      backgroundColor: pcNumber === num ? '#00f0ff' : 'rgba(255, 255, 255, 0.05)',
                      color: pcNumber === num ? '#070913' : '#fff',
                      borderColor: pcNumber === num ? '#00f0ff' : 'rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    #{num}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={styles.label}>Custom PC Number:</span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={pcNumber}
                  onChange={(e) => setPcNumber(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                  className="cyber-input"
                  style={{ width: '80px', padding: '6px 10px', textAlign: 'center' }}
                />
              </div>
            </div>
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} className="cyber-button secondary" style={styles.cancelBtn}>
              CANCEL
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="cyber-button"
              style={styles.saveBtn}
            >
              {isSaving ? '💾 Saving...' : '💾 SAVE & CONNECT STATION'}
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
    backgroundColor: 'rgba(3, 5, 12, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  modal: {
    width: '90%',
    maxWidth: '620px',
    backgroundColor: '#070913',
    border: '1px solid var(--border-neon, #00f0ff)',
    boxShadow: '0 0 35px rgba(0, 240, 255, 0.25)',
    borderRadius: '14px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(10, 14, 28, 0.7)',
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 900,
    letterSpacing: '1px',
    color: '#00f0ff',
  },
  subTitle: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: '2px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
    opacity: 0.7,
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    fontSize: '11px',
    fontWeight: 800,
    letterSpacing: '1px',
    color: '#00f0ff',
    borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
    paddingBottom: '4px',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.6px',
    color: 'rgba(255, 255, 255, 0.65)',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    backgroundColor: 'rgba(13, 18, 38, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '13px',
  },
  testRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  testBtn: {
    alignSelf: 'flex-start',
    padding: '8px 16px',
    fontSize: '11px',
    letterSpacing: '0.8px',
  },
  testResultBox: {
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '12px',
    lineHeight: 1.4,
  },
  stationConfigBox: {
    display: 'flex',
    gap: '20px',
    padding: '14px',
    backgroundColor: 'rgba(13, 18, 38, 0.6)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  stationCurrentBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    minWidth: '110px',
    padding: '12px',
    backgroundColor: 'rgba(7, 9, 19, 0.7)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  stationLabelLarge: {
    fontSize: '22px',
    fontWeight: 900,
    color: '#fff',
  },
  zoneBadge: {
    fontSize: '9px',
    fontWeight: 800,
    padding: '3px 6px',
    borderRadius: '4px',
    border: '1px solid',
    letterSpacing: '0.5px',
  },
  pcQuickGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '6px',
  },
  pcNumBtn: {
    padding: '6px 0',
    fontSize: '11px',
    fontWeight: 700,
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '10px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
  },
  cancelBtn: {
    padding: '10px 18px',
    fontSize: '12px',
  },
  saveBtn: {
    padding: '10px 22px',
    fontSize: '12px',
  },
};
