import { spawn, exec, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

class SystemShellManager {
  private _explorerKilled = false;
  private _keyBlockerProc: ChildProcess | null = null;

  get isExplorerKilled(): boolean {
    return this._explorerKilled;
  }

  /**
   * Find or resolve the path to keyBlocker.exe
   */
  private resolveKeyBlockerPath(): string | null {
    const candidatePaths = [
      path.join(__dirname, 'keyBlocker.exe'),
      path.join(__dirname, '../electron/keyBlocker.exe'),
      path.join(process.resourcesPath || '', 'keyBlocker.exe'),
      path.join(path.dirname(process.execPath), 'keyBlocker.exe'),
      path.join(process.env.PORTABLE_EXECUTABLE_DIR || '', 'keyBlocker.exe'),
      path.join(process.cwd(), 'desktop/electron/keyBlocker.exe'),
      path.join(process.cwd(), 'desktop/dist-electron/keyBlocker.exe'),
    ];

    for (const p of candidatePaths) {
      if (p && fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  /**
   * Activate hardware-level Windows Key (Win, Alt+Tab, Ctrl+Esc, Alt+F4) blocker
   * via low-level WH_KEYBOARD_LL hook.
   */
  enableKeyBlocker(): void {
    if (process.platform !== 'win32') return;
    if (this._keyBlockerProc && !this._keyBlockerProc.killed) {
      return; // Already running
    }

    const exePath = this.resolveKeyBlockerPath();
    if (!exePath) {
      console.warn('[SystemShellManager] keyBlocker.exe not found on disk, attempting dynamic compilation...');
      this.compileKeyBlockerOnDemand();
      return;
    }

    try {
      console.log(`[SystemShellManager] Activating Low-Level Windows Key Blocker: ${exePath}`);
      this._keyBlockerProc = spawn(exePath, [String(process.pid)], {
        detached: false,
        stdio: ['pipe', 'ignore', 'ignore'],
        windowsHide: true,
      });

      this._keyBlockerProc.on('exit', (code) => {
        console.log(`[SystemShellManager] keyBlocker process exited with code ${code}`);
        this._keyBlockerProc = null;
      });
    } catch (err) {
      console.error('[SystemShellManager] Failed to launch keyBlocker:', err);
    }
  }

  /**
   * Deactivate Windows Key blocker (restores normal keyboard behavior for technician)
   */
  disableKeyBlocker(): void {
    if (this._keyBlockerProc) {
      try {
        this._keyBlockerProc.stdin?.write('exit\n');
        this._keyBlockerProc.kill();
      } catch {}
      this._keyBlockerProc = null;
    }

    if (process.platform === 'win32') {
      exec('taskkill /F /IM keyBlocker.exe', () => {});
    }
    console.log('[SystemShellManager] Low-level Windows Key blocker RELEASED');
  }

  /**
   * Compile keyBlocker.cs using built-in Windows csc.exe if missing
   */
  private compileKeyBlockerOnDemand(): void {
    const csPath = path.join(__dirname, 'keyBlocker.cs');
    const outPath = path.join(__dirname, 'keyBlocker.exe');
    const cscPath = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

    if (fs.existsSync(csPath) && fs.existsSync(cscPath)) {
      exec(`"${cscPath}" /target:winexe /out:"${outPath}" /platform:anycpu "${csPath}"`, (err) => {
        if (!err && fs.existsSync(outPath)) {
          console.log('[SystemShellManager] Dynamically compiled keyBlocker.exe successfully');
          this.enableKeyBlocker();
        }
      });
    }
  }

  /**
   * Terminate Windows Explorer shell (Desktop, Taskbar, Start Button)
   * and StartMenuExperienceHost, activating low-level key suppression.
   */
  killExplorer(): Promise<boolean> {
    return new Promise((resolve) => {
      if (process.platform !== 'win32') {
        this._explorerKilled = true;
        return resolve(true);
      }

      console.log('[SystemShellManager] Taking over Windows: Terminating explorer & Start menu...');
      
      // 1. Activate low-level Windows key blocker immediately
      this.enableKeyBlocker();

      // 2. Prevent Winlogon from immediately auto-restarting shell
      exec('reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v AutoRestartShell /t REG_DWORD /d 0 /f', () => {});

      // 3. Terminate Explorer, modern Start Menu, and Search hosts
      const killCmd = 'taskkill /F /IM explorer.exe /IM StartMenuExperienceHost.exe /IM SearchHost.exe';
      exec(killCmd, (err) => {
        this._explorerKilled = true;
        if (err) {
          console.log('[SystemShellManager] Shell processes terminated or already stopped');
        } else {
          console.log('[SystemShellManager] explorer & StartMenuExperienceHost successfully terminated');
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

      console.log('[SystemShellManager] Restoring Windows Explorer shell & releasing key blocker...');
      
      // 1. Release hardware key blocker
      this.disableKeyBlocker();

      // 2. Restore AutoRestartShell policy
      exec('reg add "HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" /v AutoRestartShell /t REG_DWORD /d 1 /f', () => {});

      // 3. Relaunch Windows Explorer
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
        `reg add "${explorerKey}" /v NoWinKeys /t REG_DWORD /d ${val} /f`,
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
