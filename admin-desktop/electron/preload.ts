import { contextBridge, ipcRenderer } from 'electron';

export interface AdminElectronAPI {
  getConfig: () => Promise<any>;
  saveConfig: (config: any) => Promise<{ success: boolean; error?: string }>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  openExternal: (url: string) => Promise<{ success: boolean }>;
}

contextBridge.exposeInMainWorld('adminAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});
