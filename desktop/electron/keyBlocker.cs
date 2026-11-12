using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using System.Threading;

namespace PCClubSecurity {
    static class KeyBlocker {
        private const int WH_KEYBOARD_LL = 13;
        private const int WM_KEYDOWN = 0x0100;
        private const int WM_KEYUP = 0x0101;
        private const int WM_SYSKEYDOWN = 0x0104;
        private const int WM_SYSKEYUP = 0x0105;

        private const int VK_TAB = 0x09;
        private const int VK_ESCAPE = 0x1B;
        private const int VK_F4 = 0x73;
        private const int VK_LWIN = 0x5B;
        private const int VK_RWIN = 0x5C;

        [StructLayout(LayoutKind.Sequential)]
        private struct KBDLLHOOKSTRUCT {
            public uint vkCode;
            public uint scanCode;
            public uint flags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        private static LowLevelKeyboardProc _proc = HookCallback;
        private static IntPtr _hookID = IntPtr.Zero;

        [STAThread]
        public static void Main() {
            // Listen on stdin for "exit" or "quit" in a background thread
            new Thread(() => {
                try {
                    string line;
                    while ((line = Console.ReadLine()) != null) {
                        if (line.Trim().Equals("exit", StringComparison.OrdinalIgnoreCase) ||
                            line.Trim().Equals("quit", StringComparison.OrdinalIgnoreCase)) {
                            Application.Exit();
                            break;
                        }
                    }
                } catch {}
            }) { IsBackground = true }.Start();

            _hookID = SetHook(_proc);
            Application.Run();
            UnhookWindowsHookEx(_hookID);
        }

        private static IntPtr SetHook(LowLevelKeyboardProc proc) {
            using (Process curProcess = Process.GetCurrentProcess())
            using (ProcessModule curModule = curProcess.MainModule) {
                return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
            }
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
            if (nCode >= 0) {
                KBDLLHOOKSTRUCT kbd = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));
                uint vk = kbd.vkCode;
                bool isAlt = (kbd.flags & 0x20) != 0;

                // 1. Block Left and Right Windows Keys unconditionally (Win key cannot be pressed)
                if (vk == VK_LWIN || vk == VK_RWIN) {
                    return (IntPtr)1;
                }

                // 2. Block Alt+Tab, Alt+Esc, Alt+F4
                if (isAlt && (vk == VK_TAB || vk == VK_ESCAPE || vk == VK_F4)) {
                    return (IntPtr)1;
                }

                // 3. Block Ctrl+Esc (opens Windows Start Menu)
                if (vk == VK_ESCAPE) {
                    short ctrlState = GetKeyState(0x11); // VK_CONTROL
                    if ((ctrlState & 0x8000) != 0) {
                        return (IntPtr)1;
                    }
                }
            }
            return CallNextHookEx(_hookID, nCode, wParam, lParam);
        }

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetKeyState(int nVirtKey);
    }
}
