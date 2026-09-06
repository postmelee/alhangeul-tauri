// Test-only context observation and same-user linked-token launch. No privilege adjustment.
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Security.Principal;
using System.Text;

namespace Alhangeul.ContextExperiment
{
    public sealed class Context
    {
        public string status = "unreadable";
        public int error;
        public bool sameUser;
        public int session;
        public int elevationType;
        public bool elevated;
        public int integrityRid;
    }
    public sealed class LaunchResult
    {
        public bool started;
        public int error;
        public uint exitCode;
    }
    public static class Native
    {
        [DllImport("kernel32.dll", SetLastError = true)] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
        [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
        [DllImport("advapi32.dll", SetLastError = true)] static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
        [DllImport("advapi32.dll", SetLastError = true)] static extern bool GetTokenInformation(IntPtr token, int kind, IntPtr data, int size, out int needed);
        [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
        [DllImport("advapi32.dll")] static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);
        [DllImport("advapi32.dll", CharSet = CharSet.Unicode, ExactSpelling = true, SetLastError = true)]
        static extern bool CreateProcessWithTokenW(IntPtr token, uint logon, string app, StringBuilder command,
            uint flags, IntPtr environment, string cwd, ref Startup startup, out ProcessInfo process);
        [DllImport("kernel32.dll", SetLastError = true)] static extern uint WaitForSingleObject(IntPtr handle, uint timeout);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetExitCodeProcess(IntPtr handle, out uint code);
        [DllImport("kernel32.dll", SetLastError = true)] static extern bool TerminateProcess(IntPtr handle, uint code);
        [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
        struct Startup
        {
            public int size; public string reserved, desktop, title;
            public uint x, y, width, height, charsX, charsY, fill, flags;
            public short show, reservedSize; public IntPtr reservedPointer, input, output, error;
        }
        [StructLayout(LayoutKind.Sequential)]
        struct ProcessInfo { public IntPtr process, thread; public uint pid, tid; }

        static IntPtr Information(IntPtr token, int kind)
        {
            int needed;
            GetTokenInformation(token, kind, IntPtr.Zero, 0, out needed);
            if (needed <= 0 || needed > 65536) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
            IntPtr memory = Marshal.AllocHGlobal(needed);
            if (!GetTokenInformation(token, kind, memory, needed, out needed))
            {
                int error = Marshal.GetLastWin32Error(); Marshal.FreeHGlobal(memory);
                throw new System.ComponentModel.Win32Exception(error);
            }
            return memory;
        }
        static int Number(IntPtr token, int kind)
        {
            IntPtr memory = Information(token, kind);
            try { return Marshal.ReadInt32(memory); } finally { Marshal.FreeHGlobal(memory); }
        }
        static string User(IntPtr token)
        {
            using (var identity = new WindowsIdentity(token)) { return identity.User.Value; }
        }
        static Context ReadToken(IntPtr token)
        {
            var result = new Context();
            using (var self = WindowsIdentity.GetCurrent()) { result.sameUser = User(token) == self.User.Value; }
            result.session = Number(token, 12); result.elevationType = Number(token, 18);
            result.elevated = Number(token, 20) != 0;
            IntPtr memory = Information(token, 25);
            try
            {
                IntPtr sid = Marshal.ReadIntPtr(memory);
                byte count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
                if (count == 0) throw new InvalidOperationException();
                result.integrityRid = Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)count - 1));
            }
            finally { Marshal.FreeHGlobal(memory); }
            result.status = "ok"; return result;
        }
        public static Context Inspect(int pid)
        {
            IntPtr process = OpenProcess(0x1000, false, pid), token = IntPtr.Zero;
            try
            {
                if (process == IntPtr.Zero || !OpenProcessToken(process, 8, out token)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                return ReadToken(token);
            }
            catch (System.ComponentModel.Win32Exception error) { return new Context { error = error.NativeErrorCode }; }
            catch { return new Context { error = -1 }; }
            finally { if (token != IntPtr.Zero) CloseHandle(token); if (process != IntPtr.Zero) CloseHandle(process); }
        }
        static IntPtr LimitedToken()
        {
            IntPtr token = IntPtr.Zero, linked = IntPtr.Zero;
            using (var self = Process.GetCurrentProcess())
            {
                if (!OpenProcessToken(self.Handle, 8, out token)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                try
                {
                    if (Number(token, 18) != 2) throw new InvalidOperationException("no-split-token");
                    IntPtr memory = Information(token, 19);
                    try { linked = Marshal.ReadIntPtr(memory); } finally { Marshal.FreeHGlobal(memory); }
                    var context = ReadToken(linked);
                    if (!context.sameUser || context.session != self.SessionId || context.elevated || context.elevationType != 3 || context.integrityRid != 8192)
                        throw new InvalidOperationException("linked-context-mismatch");
                    IntPtr answer = linked; linked = IntPtr.Zero; return answer;
                }
                finally { CloseHandle(token); if (linked != IntPtr.Zero) CloseHandle(linked); }
            }
        }
        public static Context LimitedContext()
        {
            IntPtr token = IntPtr.Zero;
            try { token = LimitedToken(); return ReadToken(token); }
            catch (System.ComponentModel.Win32Exception error) { return new Context { error = error.NativeErrorCode }; }
            catch { return new Context { error = -1 }; }
            finally { if (token != IntPtr.Zero) CloseHandle(token); }
        }
        public static LaunchResult RunLimited(string app, string arguments, string cwd)
        {
            IntPtr token = LimitedToken(); ProcessInfo process = new ProcessInfo();
            try
            {
                var startup = new Startup(); startup.size = Marshal.SizeOf(typeof(Startup));
                startup.flags = 1; startup.show = 0;
                var command = new StringBuilder("\"" + app + "\" " + arguments);
                if (command.Length >= 1024) throw new InvalidOperationException("command-too-long");
                // LOGON_WITH_PROFILE, no alternate credentials and no forced integrity changes.
                if (!CreateProcessWithTokenW(token, 1, app, command, 0x08000000, IntPtr.Zero, cwd, ref startup, out process))
                    return new LaunchResult { started = false, error = Marshal.GetLastWin32Error() };
                if (WaitForSingleObject(process.process, 600000) != 0)
                {
                    TerminateProcess(process.process, 2); WaitForSingleObject(process.process, 3000);
                    throw new InvalidOperationException("context-phase-timeout");
                }
                uint code;
                if (!GetExitCodeProcess(process.process, out code)) throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                return new LaunchResult { started = true, exitCode = code };
            }
            finally
            {
                if (process.thread != IntPtr.Zero) CloseHandle(process.thread);
                if (process.process != IntPtr.Zero) CloseHandle(process.process);
                CloseHandle(token);
            }
        }
    }
}
