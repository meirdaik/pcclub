import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg: any) => ipcRenderer.invoke('save-config', cfg),
  launchApp: (exePathOrUri: string) => ipcRenderer.invoke('launch-app', exePathOrUri),
  getPcInfo: () => ipcRenderer.invoke('get-pc-info'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  restoreWindow: () => ipcRenderer.send('restore-window'),
  setKioskMode: (enabled: boolean) => ipcRenderer.send('set-kiosk-mode', enabled),
  setKioskLocked: (locked: boolean) => ipcRenderer.send('set-kiosk-locked', locked),
  killGameProcesses: () => ipcRenderer.invoke('kill-game-processes'),
  getRealTelemetry: () => ipcRenderer.invoke('get-real-telemetry'),
  setPowerPlan: (plan: string) => ipcRenderer.invoke('set-power-plan', plan),
  killProcess: (payload: { pid?: number; name?: string }) => ipcRenderer.invoke('kill-process', payload),
  setMaintenanceMode: (enabled: boolean) => ipcRenderer.invoke('set-maintenance-mode', enabled),
  cleanSessionData: () => ipcRenderer.invoke('clean-session-data'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  systemReboot: () => ipcRenderer.invoke('system-reboot'),
  systemShutdown: () => ipcRenderer.invoke('system-shutdown'),
  exitKiosk: () => ipcRenderer.send('exit-kiosk'),
  adminUnlockToWindows: (pin: string) => ipcRenderer.invoke('admin-unlock-to-windows', pin),
  updateHudState: (state: any) => ipcRenderer.send('update-hud-state', state),
  returnToLauncher: () => ipcRenderer.send('return-to-launcher'),
  onOpenAdminPinModal: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-admin-pin-modal', handler);
    return () => ipcRenderer.removeListener('open-admin-pin-modal', handler);
  },
  onOpenSetupModal: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('open-setup-modal', handler);
    return () => ipcRenderer.removeListener('open-setup-modal', handler);
  },
  onHudAction: (callback: (action: string) => void) => {
    const handler = (_event: any, action: string) => callback(action);
    ipcRenderer.on('hud-action-received', handler);
    return () => ipcRenderer.removeListener('hud-action-received', handler);
  },
});
