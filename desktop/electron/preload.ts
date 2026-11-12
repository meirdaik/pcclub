import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  launchApp: (exePathOrUri: string) => ipcRenderer.invoke('launch-app', exePathOrUri),
  getPcInfo: () => ipcRenderer.invoke('get-pc-info'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  restoreWindow: () => ipcRenderer.send('restore-window'),
  setKioskMode: (enabled: boolean) => ipcRenderer.send('set-kiosk-mode', enabled),
  setKioskLocked: (locked: boolean) => ipcRenderer.send('set-kiosk-locked', locked),
  killGameProcesses: () => ipcRenderer.invoke('kill-game-processes'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  systemReboot: () => ipcRenderer.invoke('system-reboot'),
  systemShutdown: () => ipcRenderer.invoke('system-shutdown'),
  exitKiosk: () => ipcRenderer.send('exit-kiosk'),
});
