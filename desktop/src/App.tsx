import { useState, useEffect, useCallback } from 'react';
import { socketService } from './services/socket';
import { initAppConfig } from './services/config';
import { AppState, SessionInfo, ServerMessage } from './types';
import LockScreen from './screens/LockScreen';
import Dashboard from './screens/Dashboard';
import AdminPanel from './screens/AdminPanel';

function App() {
  const [appState, setAppState] = useState<AppState>('locked');
  const [session, setSession] = useState<SessionInfo | null>(null);

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

    // 2. Lock kiosk keyboard shortcuts
    window.electronAPI?.setKioskLocked(true);

    // 3. Update telemetry state
    socketService.updateSessionTelemetry('LOCKED', 0, null, null);

    setAppState('locked');
    setSession(null);
  }, []);

  const handleUnlock = useCallback((sessionInfo: SessionInfo) => {
    setSession(sessionInfo);

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

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [handleLock, handleUnlock]);

  return (
    <div className="app-container">
      {appState === 'locked' && (
        <LockScreen
          onUnlock={handleUnlock}
          onOpenAdmin={() => setAppState('admin')}
        />
      )}

      {appState === 'admin' && (
        <AdminPanel onExit={handleLock} />
      )}

      {appState === 'unlocked' && session && (
        <Dashboard session={session} onSessionEnd={handleLock} />
      )}
    </div>
  );
}

export default App;
