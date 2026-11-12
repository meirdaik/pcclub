import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  launchApp: (exePathOrUri: string) => ipcRenderer.invoke('launch-app', exePathOrUri),
  getPcInfo: () => ipcRenderer.invoke('get-pc-info'),
  getSystemStats: () => ipcRenderer.invoke('get-system-stats'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  restoreWindow: () => ipcRenderer.send('restore-window'),
  setKioskMode: (enabled: boolean) => ipcRenderer.send('set-kiosk-mode', enabled),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  exitKiosk: () => ipcRenderer.send('exit-kiosk'),
});
