import { useState, useEffect, useCallback } from 'react';
import { socketService } from './services/socket';
import { AppState, SessionInfo, ServerMessage } from './types';
import LockScreen from './screens/LockScreen';
import Dashboard from './screens/Dashboard';

function App() {
  const [appState, setAppState] = useState<AppState>('locked');
  const [session, setSession] = useState<SessionInfo | null>(null);

  const handleUnlock = useCallback((sessionInfo: SessionInfo) => {
    setSession(sessionInfo);
    setAppState('unlocked');
  }, []);

  const handleLock = useCallback(() => {
    setAppState('locked');
    setSession(null);
  }, []);

  useEffect(() => {
    socketService.connect();

    const unsubscribe = socketService.onMessage((message: ServerMessage) => {
      switch (message.action) {
        case 'UNLOCK':
          if (message.username && message.remaining_seconds) {
            setSession({
              username: message.username,
              remainingSeconds: message.remaining_seconds,
            });
            setAppState('unlocked');
          }
          break;
        case 'LOCK':
          handleLock();
          break;
      }
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, [handleLock]);

  return (
    <div className="app-container">
      {appState === 'locked' ? (
        <LockScreen onUnlock={handleUnlock} />
      ) : session ? (
        <Dashboard session={session} onSessionEnd={handleLock} />
      ) : (
        <LockScreen onUnlock={handleUnlock} />
      )}
    </div>
  );
}

export default App;
