import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  launchApp: (exePath: string) => ipcRenderer.invoke('launch-app', exePath),
  getPcInfo: () => ipcRenderer.invoke('get-pc-info'),
  exitKiosk: () => ipcRenderer.send('exit-kiosk'),
});
