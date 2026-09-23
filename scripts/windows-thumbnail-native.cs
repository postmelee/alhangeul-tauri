using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Alhangeul.ThumbnailDiagnostics
{
    [StructLayout(LayoutKind.Sequential)]
    internal struct NativeSize { public int Width; public int Height; }

    [StructLayout(LayoutKind.Sequential)]
    internal struct NativeBitmap
    {
        public int Type, Width, Height, WidthBytes;
        public ushort Planes, BitsPixel;
        public IntPtr Bits;
    }

    // GUID-sized storage matches the SDK's 16-byte WTS_THUMBNAILID.
    [StructLayout(LayoutKind.Sequential)]
    internal struct ThumbnailId { public Guid Value; }

    [ComImport, Guid("BCC18B79-BA16-442F-80C4-8A59C30C463B")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IShellItemImageFactory
    {
        [PreserveSig] int GetImage(NativeSize size, uint flags, out IntPtr bitmap);
    }

    [ComImport, Guid("091162A4-BC96-411F-AAE8-C5122CD03363")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface ISharedBitmap
    {
        [PreserveSig] int GetSharedBitmap(out IntPtr bitmap);
        [PreserveSig] int GetSize(out NativeSize size);
        [PreserveSig] int GetFormat(out uint alphaType);
        [PreserveSig] int InitializeBitmap(IntPtr bitmap, uint alphaType);
        [PreserveSig] int Detach(out IntPtr bitmap);
    }

    [ComImport, Guid("F676C15D-596A-4CE2-8234-33996F445DB1")]
    [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    internal interface IThumbnailCache
    {
        // shellItem is an IShellItem pointer acquired with that exact IID.
        [PreserveSig] int GetThumbnail(IntPtr shellItem, uint size, uint flags,
            out ISharedBitmap bitmap, out uint cacheFlags, out ThumbnailId id);
        [PreserveSig] int GetThumbnailByID(ThumbnailId id, uint size,
            out ISharedBitmap bitmap, out uint cacheFlags);
    }

    internal static class Native
    {
        internal const uint CLSCTX_INPROC_SERVER = 1;
        internal const uint SIIGBF_THUMBNAILONLY = 8;
        internal const uint WTS_INCACHEONLY = 1;
        internal const uint WTS_FORCEEXTRACTION = 4;
        internal static readonly Guid Handler = new Guid("C1DCF316-0771-49DD-BFEA-C85F69B1674B");
        internal static readonly Guid Cache = new Guid("50EF4544-AC9F-4A8E-B21B-8A26180DB13F");
        internal static readonly Guid ShellItem = new Guid("43826D1E-E718-42EE-BC55-A1E261C37BFE");
        internal const string Category = "{E357FCCD-A995-4576-B01F-234630154E96}";

        [DllImport("ole32.dll", ExactSpelling = true)]
        internal static extern int CoCreateInstance(ref Guid clsid, IntPtr outer,
            uint context, ref Guid iid, out IntPtr instance);
        [DllImport("shell32.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        internal static extern int SHCreateItemFromParsingName(string path,
            IntPtr bindContext, ref Guid iid, out IntPtr item);
        [DllImport("shlwapi.dll", CharSet = CharSet.Unicode, ExactSpelling = true)]
        internal static extern int AssocQueryStringW(uint flags, uint kind, string association,
            string extra, StringBuilder output, ref uint length);
        [DllImport("gdi32.dll", EntryPoint = "GetObjectW", ExactSpelling = true, SetLastError = true)]
        internal static extern int GetBitmapObject(IntPtr bitmap, int length, out NativeBitmap value);
        [DllImport("gdi32.dll", ExactSpelling = true)]
        [return: MarshalAs(UnmanagedType.Bool)]
        internal static extern bool DeleteObject(IntPtr handle);

        internal static T Wrap<T>(IntPtr pointer)
        {
            return (T)Marshal.GetObjectForIUnknown(pointer);
        }

        internal static void Release(object value)
        {
            if (value != null && Marshal.IsComObject(value)) Marshal.ReleaseComObject(value);
        }
    }
}
