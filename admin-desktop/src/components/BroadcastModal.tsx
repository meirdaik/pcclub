import React, { useState } from 'react';
import { api } from '../services/api';
import { ClubPc } from '../types';

interface BroadcastModalProps {
  pcs: ClubPc[];
  onClose: () => void;
}

export default function BroadcastModal({ pcs, onClose }: BroadcastModalProps) {
  const [target, setTarget] = useState<string>('ALL');
  const [title, setTitle] = useState<string>('🚨 CLUB ANNOUNCEMENT');
  const [message, setMessage] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const presets = [
    { title: '🏆 TOURNAMENT STARTING', text: 'CS2 5v5 Tournament starting in 15 minutes! Players please prepare.' },
    { title: '⏰ NIGHT SHIFT CLOSING', text: 'Attention club members: Night packages conclude at 08:00 AM. Top up if continuing.' },
    { title: '🍕 BAR SPECIAL OFFER', text: 'Energy Drink + Pizza Slice combo now available at the bar with 20% discount!' },
    { title: '⚠️ TECHNICAL MAINTENANCE', text: 'Short 5-minute network optimization in progress. Gameplay will not be interrupted.' },
  ];

  const handleSend = async () => {
    if (!message.trim()) return;
    setIsSending(true);
    setFeedback('Dispatching on-screen broadcast popup...');
    try {
      let ok = false;
      if (target === 'ALL') {
        ok = await api.broadcastToAll(message.trim(), title.trim());
      } else {
        ok = await api.broadcastToPc(target, message.trim(), title.trim());
      }

      if (ok) {
        setFeedback('Broadcast successfully displayed on player screens!');
        setTimeout(() => onClose(), 1200);
      } else {
        setFeedback('Failed to dispatch broadcast. Check server connection.');
      }
    } catch {
      setFeedback('Error sending broadcast.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>📢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#00f0ff' }} className="font-orbitron">
                BROADCAST ON-SCREEN POPUP
              </h2>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                Instant visual announcement across gaming stations
              </span>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.body}>
          {feedback && (
            <div style={styles.feedback}>
              {feedback}
            </div>
          )}

          {/* Quick Presets */}
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>QUICK ANNOUNCEMENT PRESETS</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '6px' }}>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => { setTitle(p.title); setMessage(p.text); }}
                  style={styles.presetBtn}
                >
                  <div style={{ fontWeight: 'bold', color: '#00f0ff', marginBottom: '2px' }}>{p.title}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {p.text}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Station */}
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>RECIPIENT TARGET</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="cyber-input"
              style={{ width: '100%', padding: '10px', marginTop: '6px' }}
            >
              <option value="ALL">🌐 ALL STATIONS IN CLUB (BROADCAST)</option>
              {pcs.map((p) => (
                <option key={p.pc_id} value={p.pc_id}>
                  {p.label} ({p.status} - {p.current_user || 'Empty'})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={styles.label}>POPUP HEADER TITLE</label>
            <input
              type="text"
              className="cyber-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 📢 IMPORTANT CLUB NOTICE"
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px' }}
            />
          </div>

          {/* Message Content */}
          <div style={{ marginBottom: '20px' }}>
            <label style={styles.label}>MESSAGE BODY</label>
            <textarea
              className="cyber-input"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your announcement text here..."
              style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={isSending || !message.trim()}
            className="cyber-button"
            style={{ width: '100%', padding: '14px', fontSize: '14px', fontWeight: 'bold' }}
          >
            🚀 SEND POPUP TO {target === 'ALL' ? 'ALL STATIONS' : target.toUpperCase()}
          </button>
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
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892b0',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  body: {
    padding: '24px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: '1px',
  },
  presetBtn: {
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '8px 12px',
    textAlign: 'left',
    cursor: 'pointer',
  },
  feedback: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    border: '1px solid var(--border-neon)',
    padding: '10px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    color: '#00f0ff',
    fontSize: '13px',
    fontWeight: 'bold',
  },
};
