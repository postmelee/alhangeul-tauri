using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace Alhangeul.InstallerSmoke {
    public static class EditorWindow {
        private const string EditorClass = "Tauri Window";
        private const uint Owner = 4;
        private const uint Close = 0x0010;
        private const uint AbortIfHungAndBlock = 0x0003;
        private delegate bool Visitor(IntPtr window, IntPtr parameter);

        [DllImport("user32.dll")] private static extern bool EnumWindows(Visitor visitor, IntPtr parameter);
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
        [DllImport("user32.dll")] private static extern bool IsWindowEnabled(IntPtr window);
        [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr window, uint flag);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern int GetClassName(IntPtr window, StringBuilder text, int count);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern IntPtr SendMessageTimeout(IntPtr window, uint message, IntPtr word,
            IntPtr data, uint flags, uint timeout, out IntPtr result);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)]
        private static extern bool PostMessage(IntPtr window, uint message, IntPtr word, IntPtr data);

        private static bool Matches(IntPtr window, uint pid) {
            uint actualPid;
            if (GetWindowThreadProcessId(window, out actualPid) == 0 || actualPid != pid ||
                !IsWindowVisible(window) || GetWindow(window, Owner) != IntPtr.Zero) return false;
            var name = new StringBuilder(64);
            return GetClassName(window, name, name.Capacity) > 0 && name.ToString() == EditorClass;
        }

        public static IntPtr FindResponsive(uint pid) {
            var matches = new List<IntPtr>();
            EnumWindows((window, unused) => {
                if (Matches(window, pid)) matches.Add(window);
                return true;
            }, IntPtr.Zero);
            if (matches.Count != 1 || !IsWindowEnabled(matches[0])) return IntPtr.Zero;
            IntPtr result;
            return SendMessageTimeout(matches[0], 0, IntPtr.Zero, IntPtr.Zero,
                AbortIfHungAndBlock, 200, out result) == IntPtr.Zero ? IntPtr.Zero : matches[0];
        }

        public static bool RequestClose(IntPtr window, uint pid) {
            return Matches(window, pid) && IsWindowEnabled(window) &&
                PostMessage(window, Close, IntPtr.Zero, IntPtr.Zero);
        }
    }
}
