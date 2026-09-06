using System;
using System.Runtime.InteropServices;

namespace Alhangeul.ThumbnailDiagnostics
{
    public sealed class TokenResult
    {
        public string status = "unreadable";
        public string errorCode;
        public int? nativeErrorCode;
        public bool? elevated;
        public int? elevationType;
        public uint? integrityRid;
    }

    public static class TokenProbe
    {
        [DllImport("kernel32.dll", ExactSpelling = true)]
        private static extern IntPtr GetCurrentProcess();
        [DllImport("kernel32.dll", ExactSpelling = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool CloseHandle(IntPtr handle);
        [DllImport("advapi32.dll", ExactSpelling = true, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool OpenProcessToken(IntPtr process, uint access, out IntPtr token);
        [DllImport("advapi32.dll", ExactSpelling = true, SetLastError = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        private static extern bool GetTokenInformation(IntPtr token, int kind,
            IntPtr output, int length, out int needed);
        [DllImport("advapi32.dll", ExactSpelling = true)]
        private static extern IntPtr GetSidSubAuthorityCount(IntPtr sid);
        [DllImport("advapi32.dll", ExactSpelling = true)]
        private static extern IntPtr GetSidSubAuthority(IntPtr sid, uint index);

        public static TokenResult Read()
        {
            var result = new TokenResult();
            IntPtr token = IntPtr.Zero;
            try
            {
                if (!OpenProcessToken(GetCurrentProcess(), 8, out token))
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                result.elevated = ReadInteger(token, 20) != 0; // TokenElevation
                result.elevationType = ReadInteger(token, 18); // TokenElevationType
                result.integrityRid = ReadIntegrity(token); // TokenIntegrityLevel
                result.status = "ok";
            }
            catch (Exception error)
            {
                result.errorCode = "0x" + unchecked((uint)error.HResult).ToString("X8");
                var win32 = error as System.ComponentModel.Win32Exception;
                if (win32 != null) result.nativeErrorCode = win32.NativeErrorCode;
            }
            finally { if (token != IntPtr.Zero) CloseHandle(token); }
            return result;
        }

        private static int ReadInteger(IntPtr token, int kind)
        {
            IntPtr output = Marshal.AllocHGlobal(4);
            try
            {
                int needed;
                if (!GetTokenInformation(token, kind, output, 4, out needed))
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                return Marshal.ReadInt32(output);
            }
            finally { Marshal.FreeHGlobal(output); }
        }

        private static uint ReadIntegrity(IntPtr token)
        {
            int needed;
            GetTokenInformation(token, 25, IntPtr.Zero, 0, out needed);
            if (needed <= 0 || needed > 65536) throw new InvalidOperationException();
            IntPtr output = Marshal.AllocHGlobal(needed);
            try
            {
                if (!GetTokenInformation(token, 25, output, needed, out needed))
                    throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error());
                IntPtr sid = Marshal.ReadIntPtr(output);
                byte count = Marshal.ReadByte(GetSidSubAuthorityCount(sid));
                if (count == 0) throw new InvalidOperationException();
                return unchecked((uint)Marshal.ReadInt32(GetSidSubAuthority(sid, (uint)count - 1)));
            }
            finally { Marshal.FreeHGlobal(output); }
        }
    }
}
