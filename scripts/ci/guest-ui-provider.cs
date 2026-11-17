using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace Alhangeul.GuestProviderDiagnostic
{
    [ComImport, Guid("B824B49D-22AC-4161-AC8A-9916E8FA3F7F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IInitializeWithStream {
        [PreserveSig] int Initialize(IntPtr stream, uint mode);
    }
    [ComImport, Guid("E357FCCD-A995-4576-B01F-234630154E96"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IThumbnailProvider {
        [PreserveSig] int GetThumbnail(uint edge, out IntPtr bitmap, out uint alpha);
    }
    [StructLayout(LayoutKind.Sequential)]
    internal struct BitmapInfo {
        public int type, width, height, widthBytes;
        public ushort planes, bitsPixel;
        public IntPtr bits;
    }
    public sealed class Result {
        public string status = "failed", phase = "open-stream", hresult, modulePath;
        public long activateMs, initializeMs, thumbnailMs, elapsedMs;
        public bool bitmapPresent;
        public int width, height;
        public uint alphaType;
        internal bool Check(int code) {
            hresult = "0x" + unchecked((uint)code).ToString("X8");
            return code == 0;
        }
    }
    public static class Probe {
        [DllImport("shlwapi.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        static extern int SHCreateStreamOnFileEx(string path, uint mode, uint attributes,
            [MarshalAs(UnmanagedType.Bool)] bool create, IntPtr template, out IntPtr stream);
        [DllImport("ole32.dll", ExactSpelling = true)]
        static extern int CoCreateInstance(ref Guid clsid, IntPtr outer, uint context, ref Guid iid, out IntPtr instance);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        static extern IntPtr GetModuleHandleW(string name);
        [DllImport("kernel32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        static extern uint GetModuleFileNameW(IntPtr module, StringBuilder path, int size);
        [DllImport("gdi32.dll", EntryPoint = "GetObjectW", ExactSpelling = true)]
        static extern int GetBitmapObject(IntPtr bitmap, int length, out BitmapInfo info);
        [DllImport("gdi32.dll", ExactSpelling = true)]
        static extern bool DeleteObject(IntPtr bitmap);

        public static Result Run(string path) {
            var result = new Result();
            var timer = Stopwatch.StartNew();
            IntPtr stream = IntPtr.Zero, instance = IntPtr.Zero, bitmap = IntPtr.Zero;
            object provider = null;
            try {
                if (!result.Check(SHCreateStreamOnFileEx(path, 0x20, 0, false, IntPtr.Zero, out stream))) return result;
                Guid clsid = new Guid("C1DCF316-0771-49DD-BFEA-C85F69B1674B"), iid = typeof(IInitializeWithStream).GUID;
                result.phase = "CoCreateInstance.inproc";
                var phase = Stopwatch.StartNew();
                int code = CoCreateInstance(ref clsid, IntPtr.Zero, 1, ref iid, out instance);
                result.activateMs = phase.ElapsedMilliseconds;
                if (!result.Check(code)) return result;
                provider = Marshal.GetObjectForIUnknown(instance);
                result.modulePath = LoadedModule();
                result.phase = "IInitializeWithStream.Initialize"; phase.Restart();
                code = ((IInitializeWithStream)provider).Initialize(stream, 0);
                result.initializeMs = phase.ElapsedMilliseconds;
                if (!result.Check(code)) return result;
                result.phase = "IThumbnailProvider.GetThumbnail"; phase.Restart();
                code = ((IThumbnailProvider)provider).GetThumbnail(256, out bitmap, out result.alphaType);
                result.thumbnailMs = phase.ElapsedMilliseconds; result.bitmapPresent = bitmap != IntPtr.Zero;
                if (result.Check(code)) Inspect(bitmap, result);
            } catch (Exception error) { result.Check(error.HResult); }
            finally {
                if (bitmap != IntPtr.Zero) DeleteObject(bitmap);
                if (provider != null) Marshal.ReleaseComObject(provider);
                if (instance != IntPtr.Zero) Marshal.Release(instance);
                if (stream != IntPtr.Zero) Marshal.Release(stream);
                result.elapsedMs = timer.ElapsedMilliseconds;
            }
            return result;
        }
        static string LoadedModule() {
            IntPtr module = GetModuleHandleW("AlhangeulThumbnailHandler.dll");
            if (module == IntPtr.Zero) return null;
            var path = new StringBuilder(1024);
            uint count = GetModuleFileNameW(module, path, path.Capacity);
            return count > 0 && count < path.Capacity ? path.ToString() : null;
        }
        static void Inspect(IntPtr bitmap, Result result) {
            if (bitmap == IntPtr.Zero) return;
            BitmapInfo value;
            if (GetBitmapObject(bitmap, Marshal.SizeOf(typeof(BitmapInfo)), out value) == 0) return;
            result.width = value.width; result.height = value.height;
            if (value.width > 0 && value.width <= 1024 && value.height > 0 && value.height <= 1024)
                result.status = "ok";
        }
    }
}
