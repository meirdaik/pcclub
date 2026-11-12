import { spawn, exec } from 'child_process';
import * as os from 'os';

class SystemShellManager {
  private _explorerKilled = false;

  get isExplorerKilled(): boolean {
    return this._explorerKilled;
  }

  /**
   * Terminate Windows Explorer shell (Desktop, Taskbar, Start Button)
   * so PCClub Kiosk becomes the sole desktop shell.
   */
  killExplorer(): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        this._explorerKilled = true;
        return resolve(true);
      }

      console.log('[SystemShellManager] Taking over Windows: Terminating explorer.exe...');
      exec('taskkill /F /IM explorer.exe', (err) => {
        // Even if explorer was not running, we consider it killed
        this._explorerKilled = true;
        if (err) {
          console.log('[SystemShellManager] explorer.exe terminated or already stopped');
        } else {
          console.log('[SystemShellManager] explorer.exe successfully terminated');
        }
        resolve(true);
      });
    });
  }

  /**
   * Restore Windows Explorer shell so technician/admin has normal desktop access.
   */
  restoreExplorer(): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        this._explorerKilled = false;
        return resolve(true);
      }

      console.log('[SystemShellManager] Restoring Windows Explorer shell...');
      try {
        const child = spawn('explorer.exe', [], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        this._explorerKilled = false;
        console.log('[SystemShellManager] explorer.exe relaunched successfully');
        resolve(true);
      } catch (err) {
        console.warn('[SystemShellManager] Failed to relaunch explorer.exe:', err);
        // Fallback via exec
        exec('start explorer.exe', () => {
          this._explorerKilled = false;
          resolve(true);
        });
      }
    });
  }

  /**
   * Enable or disable Task Manager (Ctrl+Alt+Del, Ctrl+Shift+Esc) via Windows Registry.
   */
  setTaskMgrDisabled(disabled: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') return resolve(true);

      const val = disabled ? '1' : '0';
      const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';
      const cmd = `reg add "${key}" /v DisableTaskMgr /t REG_DWORD /d ${val} /f`;

      exec(cmd, (err) => {
        if (err) {
          console.warn(`[SystemShellManager] Could not set DisableTaskMgr=${val}:`, err.message);
          return resolve(false);
        }
        console.log(`[SystemShellManager] Registry policy set: DisableTaskMgr = ${val}`);
        resolve(true);
      });
    });
  }

  /**
   * Enable or disable Command Prompt & Registry Tools for guest accounts.
   */
  setSystemLockdown(locked: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') return resolve(true);

      const val = locked ? '1' : '0';
      const sysKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System';
      const explorerKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer';

      const commands = [
        `reg add "${sysKey}" /v DisableTaskMgr /t REG_DWORD /d ${val} /f`,
        `reg add "${sysKey}" /v DisableRegistryTools /t REG_DWORD /d ${val} /f`,
        `reg add "${explorerKey}" /v NoRun /t REG_DWORD /d ${val} /f`,
      ];

      exec(commands.join(' && '), (err) => {
        if (err) {
          console.warn('[SystemShellManager] System policy lockdown partial warning:', err.message);
        } else {
          console.log(`[SystemShellManager] Windows security policies updated (Lockdown=${locked})`);
        }
        resolve(!err);
      });
    });
  }
}

export const shellManager = new SystemShellManager();
