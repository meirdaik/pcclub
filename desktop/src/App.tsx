import { useState, useEffect, useCallback } from 'react';
import { socketService } from './services/socket';
import { getAppConfig, initAppConfig } from './services/config';
import { AppState, SessionInfo, ServerMessage } from './types';
import LockScreen from './screens/LockScreen';
import Dashboard from './screens/Dashboard';
import AdminPanel from './screens/AdminPanel';
import AdminPinModal from './components/AdminPinModal';
import ConnectionSetupModal from './components/ConnectionSetupModal';

function App() {
  const [appState, setAppState] = useState<AppState>('locked');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [broadcastPopup, setBroadcastPopup] = useState<{ title: string; message: string } | null>(null);
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const handleLock = useCallback(async () => {
    console.log('[SENET] Session ended or locked -> Activating Kiosk Shield...');

    // 1. Terminate launched games and browser processes on Windows
    if (window.electronAPI?.killGameProcesses) {
      try {
        await window.electronAPI.killGameProcesses();
      } catch (err) {
        console.warn('[SENET] Process killer warning:', err);
      }
    }

    // 2. Lock kiosk keyboard shortcuts & hide in-game HUD
    window.electronAPI?.setKioskLocked(true);
    window.electronAPI?.updateHudState?.({
      pcLabel: getAppConfig().pcLabel,
      remainingSeconds: 0,
      username: '',
    });

    // 3. Update telemetry state
    socketService.updateSessionTelemetry('LOCKED', 0, null, null);

    setAppState('locked');
    setSession(null);
  }, []);

  const handleUnlock = useCallback((sessionInfo: SessionInfo) => {
    setSession(sessionInfo);

    window.electronAPI?.updateHudState?.({
      pcLabel: getAppConfig().pcLabel,
      remainingSeconds: sessionInfo.remainingSeconds,
      username: sessionInfo.username,
    });

    if (sessionInfo.isAdmin || sessionInfo.username.toLowerCase() === 'admin') {
      console.log('[SENET] Admin session authenticated -> Loading Cashier Control Map...');
      window.electronAPI?.setKioskLocked(false);
      socketService.updateSessionTelemetry('ACTIVE', sessionInfo.remainingSeconds, 'Admin Console', sessionInfo.username);
      setAppState('admin');
    } else {
      console.log(`[SENET] Player session started for ${sessionInfo.username} (${sessionInfo.remainingSeconds}s)...`);
      window.electronAPI?.setKioskLocked(false);
      socketService.updateSessionTelemetry('ACTIVE', sessionInfo.remainingSeconds, null, sessionInfo.username);
      setAppState('unlocked');
    }
  }, []);

  useEffect(() => {
    // Initial kiosk protection
    window.electronAPI?.setKioskLocked(true);

    let unsubscribe = () => {};

    // Initialize config from config.json (or environment / URL parameters)
    initAppConfig().then(() => {
      // Connect WebSocket to configured server
      socketService.connect();

      unsubscribe = socketService.onMessage((message: ServerMessage) => {
        switch (message.action) {
          case 'UNLOCK':
            if (message.username && message.remaining_seconds !== undefined) {
              handleUnlock({
                username: message.username,
                remainingSeconds: message.remaining_seconds,
                isAdmin: Boolean(message.is_admin),
                balanceKzt: message.balance,
              });
            }
            break;

          case 'LOCK':
            handleLock();
            break;

          case 'REBOOT':
            console.log('[SENET Socket] REBOOT command received from Club Admin');
            window.electronAPI?.systemReboot?.();
            break;

          case 'SHUTDOWN':
            console.log('[SENET Socket] SHUTDOWN command received from Club Admin');
            window.electronAPI?.systemShutdown?.();
            break;

          case 'BROADCAST_POPUP':
            setBroadcastPopup({
              title: (message.title as string) || 'CLUB BROADCAST',
              message: (message.message as string) || 'Announcement from Club Operator',
            });
            break;

          case 'EXTEND':
            if (message.remaining_seconds !== undefined) {
              setSession((prev) =>
                prev
                  ? {
                      ...prev,
                      remainingSeconds: message.remaining_seconds!,
                    }
                  : null,
              );
              socketService.updateSessionTelemetry(
                'ACTIVE',
                message.remaining_seconds,
                undefined,
                undefined,
              );
            }
            break;
        }
      });
    });

    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      const isCtrlShift = (e.ctrlKey || e.metaKey) && e.shiftKey;
      const isKeyA = e.code === 'KeyA' || e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф';
      const isKeyQ = e.code === 'KeyQ' || e.key === 'q' || e.key === 'Q' || e.key === 'й' || e.key === 'Й';
      const isKeyS = e.code === 'KeyS' || e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы';

      if (isCtrlShift && (isKeyA || isKeyQ)) {
        e.preventDefault();
        setIsAdminPinModalOpen((prev) => !prev);
      } else if (isCtrlShift && isKeyS) {
        e.preventDefault();
        setIsSetupModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);

    const unregPin = window.electronAPI?.onOpenAdminPinModal?.(() => {
      setIsAdminPinModalOpen(true);
    });
    const unregSetup = window.electronAPI?.onOpenSetupModal?.(() => {
      setIsSetupModalOpen(true);
    });
    const unregHud = window.electronAPI?.onHudAction?.((action) => {
      if (action === 'call-admin') {
        socketService.sendCallAdmin('Player requested assistance via In-Game Floating HUD');
      } else if (action === 'end-session') {
        if (confirm('Finish your gaming session and lock the PC?')) {
          handleLock();
        }
      }
    });

    return () => {
      window.removeEventListener('keydown', handleGlobalShortcuts);
      unsubscribe();
      unregPin?.();
      unregSetup?.();
      unregHud?.();
      socketService.disconnect();
    };
  }, [handleLock, handleUnlock]);

  return (
    <div className="app-container">
      {appState === 'locked' && (
        <LockScreen
          onUnlock={handleUnlock}
          onOpenAdmin={() => setAppState('admin')}
          onOpenAdminPin={() => setIsAdminPinModalOpen(true)}
        />
      )}

      {appState === 'admin' && (
        <AdminPanel onExit={handleLock} />
      )}

      {appState === 'unlocked' && session && (
        <Dashboard session={session} onSessionEnd={handleLock} />
      )}

      {/* Instant Broadcast Popup Modal */}
      {broadcastPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 7, 18, 0.88)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #121829 0%, #0d1222 100%)',
            border: '2px solid #00f0ff',
            boxShadow: '0 0 50px rgba(0, 240, 255, 0.4), inset 0 0 20px rgba(0, 240, 255, 0.1)',
            borderRadius: '16px',
            padding: '36px',
            maxWidth: '560px',
            width: '90%',
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📢</div>
            <h2 style={{
              margin: '0 0 12px 0',
              fontFamily: 'monospace',
              fontSize: '24px',
              letterSpacing: '2px',
              color: '#00f0ff',
              textShadow: '0 0 10px rgba(0,240,255,0.6)',
            }}>
              {broadcastPopup.title}
            </h2>
            <p style={{
              fontSize: '17px',
              lineHeight: '1.6',
              color: '#e2e8f0',
              marginBottom: '28px',
              whiteSpace: 'pre-wrap',
            }}>
              {broadcastPopup.message}
            </p>
            <button
              onClick={() => setBroadcastPopup(null)}
              className="cyber-button"
              style={{
                background: 'linear-gradient(90deg, #00f0ff, #7928ca)',
                border: 'none',
                color: '#fff',
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '8px',
                cursor: 'pointer',
                letterSpacing: '1px',
                boxShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
              }}
            >
              ACKNOWLEDGE / OK
            </button>
          </div>
        </div>
      )}
      {/* Admin Maintenance PIN Modal (Ctrl+Shift+A / Ctrl+Shift+Q) */}
      {isAdminPinModalOpen && (
        <AdminPinModal onClose={() => setIsAdminPinModalOpen(false)} />
      )}

      {/* Connection & Station Setup Modal (Ctrl+Shift+S) */}
      {isSetupModalOpen && (
        <ConnectionSetupModal
          onClose={() => setIsSetupModalOpen(false)}
          onSaved={() => {
            initAppConfig().then(() => {
              socketService.reconnectWithConfig();
            });
          }}
        />
      )}
    </div>
  );
}

export default App;
