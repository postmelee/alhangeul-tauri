using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace Alhangeul.ThumbnailDiagnostics
{
    public sealed class ProbeResult
    {
        public int schemaVersion = 1;
        public string mode, phase = "input", status = "failed", hresult, detailCode;
        public bool? bitmapPresent;
        public int? width, height;
        public uint? cacheFlags;
        public long elapsedMs;
        public string apartment = Thread.CurrentThread.GetApartmentState().ToString();
        public string resolvedHandler;
        public uint? requestFlags;

        internal bool Check(int hr)
        {
            hresult = "0x" + unchecked((uint)hr).ToString("X8");
            return hr == 0;
        }

        internal void InspectBitmap(IntPtr bitmap)
        {
            bitmapPresent = bitmap != IntPtr.Zero;
            if (bitmap == IntPtr.Zero) { detailCode = "null-bitmap"; return; }
            NativeBitmap value;
            if (Native.GetBitmapObject(bitmap, Marshal.SizeOf(typeof(NativeBitmap)), out value) == 0)
            {
                detailCode = "bitmap-metadata-unreadable";
                return;
            }
            width = value.Width;
            height = value.Height;
            if (value.Width <= 0 || value.Height <= 0 || value.Width > 1024 || value.Height > 1024)
            {
                detailCode = "invalid-bitmap-dimensions";
                return;
            }
            status = "ok";
        }
    }

    public static class Probe
    {
        public static ProbeResult Run(string mode, string input, int size)
        {
            var result = new ProbeResult { mode = mode };
            var timer = Stopwatch.StartNew();
            try
            {
                if (!Environment.Is64BitProcess || size < 1 || size > 1024 ||
                    Thread.CurrentThread.GetApartmentState() != ApartmentState.STA)
                { result.detailCode = "requires-x64-sta-valid-size"; return result; }
                switch (mode)
                {
                    case "association": Association(input, result); break;
                    case "activate": Activate(result); break;
                    case "shell": Shell(input, size, result); break;
                    case "cache-only": Cache(input, size, Native.WTS_INCACHEONLY, result); break;
                    case "force-extract": Cache(input, size, Native.WTS_FORCEEXTRACTION, result); break;
                    default: result.detailCode = "unsupported-mode"; break;
                }
            }
            catch (Exception error)
            {
                result.status = "failed";
                result.Check(error.HResult);
                result.detailCode = "interop-exception"; // No exception text or private paths.
            }
            finally { result.elapsedMs = timer.ElapsedMilliseconds; }
            return result;
        }

        private static void Association(string extension, ProbeResult result)
        {
            result.phase = "AssocQueryStringW";
            if (extension != ".hwp" && extension != ".hwpx" && extension != ".jpg" && extension != ".jpeg")
            { result.detailCode = "unsupported-extension"; return; }
            var output = new StringBuilder(1024);
            uint length = (uint)output.Capacity;
            if (!result.Check(Native.AssocQueryStringW(0, 16, extension, Native.Category, output, ref length))) return;
            Guid handler;
            if (!Guid.TryParse(output.ToString(), out handler))
            { result.detailCode = "invalid-handler-clsid"; return; }
            result.resolvedHandler = handler.ToString("B").ToUpperInvariant();
            result.status = "ok";
        }

        private static void Activate(ProbeResult result)
        {
            result.phase = "CoCreateInstance.handler";
            Guid clsid = Native.Handler, iid = new Guid("00000000-0000-0000-C000-000000000046");
            IntPtr instance = IntPtr.Zero;
            try
            {
                if (!result.Check(Native.CoCreateInstance(ref clsid, IntPtr.Zero,
                    Native.CLSCTX_INPROC_SERVER, ref iid, out instance))) return;
                if (instance == IntPtr.Zero) { result.detailCode = "null-com-object"; return; }
                result.status = "ok";
            }
            finally { if (instance != IntPtr.Zero) Marshal.Release(instance); }
        }

        private static void Shell(string path, int size, ProbeResult result)
        {
            IntPtr item = IntPtr.Zero, bitmap = IntPtr.Zero;
            IShellItemImageFactory factory = null;
            Guid iid = typeof(IShellItemImageFactory).GUID;
            try
            {
                result.phase = "SHCreateItemFromParsingName.imageFactory";
                if (!result.Check(Native.SHCreateItemFromParsingName(path, IntPtr.Zero, ref iid, out item))) return;
                if (item == IntPtr.Zero) { result.detailCode = "null-shell-item"; return; }
                factory = Native.Wrap<IShellItemImageFactory>(item);
                result.phase = "IShellItemImageFactory.GetImage";
                result.requestFlags = Native.SIIGBF_THUMBNAILONLY;
                int hr = factory.GetImage(new NativeSize { Width = size, Height = size },
                    Native.SIIGBF_THUMBNAILONLY, out bitmap);
                result.bitmapPresent = bitmap != IntPtr.Zero;
                if (result.Check(hr)) result.InspectBitmap(bitmap);
            }
            finally
            {
                if (bitmap != IntPtr.Zero) Native.DeleteObject(bitmap);
                Native.Release(factory);
                if (item != IntPtr.Zero) Marshal.Release(item);
            }
        }

        private static void Cache(string path, int size, uint flags, ProbeResult result)
        {
            IntPtr item = IntPtr.Zero, instance = IntPtr.Zero;
            IThumbnailCache cache = null;
            ISharedBitmap shared = null;
            Guid shellIid = Native.ShellItem, cacheClsid = Native.Cache, cacheIid = typeof(IThumbnailCache).GUID;
            try
            {
                result.phase = "SHCreateItemFromParsingName.shellItem";
                if (!result.Check(Native.SHCreateItemFromParsingName(path, IntPtr.Zero, ref shellIid, out item))) return;
                if (item == IntPtr.Zero) { result.detailCode = "null-shell-item"; return; }
                result.phase = "CoCreateInstance.thumbnailCache";
                if (!result.Check(Native.CoCreateInstance(ref cacheClsid, IntPtr.Zero,
                    Native.CLSCTX_INPROC_SERVER, ref cacheIid, out instance))) return;
                if (instance == IntPtr.Zero) { result.detailCode = "null-com-object"; return; }
                cache = Native.Wrap<IThumbnailCache>(instance);
                result.phase = "IThumbnailCache.GetThumbnail";
                uint cacheFlags;
                ThumbnailId id;
                result.requestFlags = flags;
                if (!result.Check(cache.GetThumbnail(item, (uint)size, flags, out shared, out cacheFlags, out id))) return;
                result.cacheFlags = cacheFlags;
                if (shared == null) { result.bitmapPresent = false; result.detailCode = "null-shared-bitmap"; return; }
                result.phase = "ISharedBitmap.GetSharedBitmap";
                IntPtr borrowed;
                if (result.Check(shared.GetSharedBitmap(out borrowed))) result.InspectBitmap(borrowed);
                // Borrowed HBITMAP belongs to shared: never DeleteObject or Detach it.
            }
            finally
            {
                Native.Release(shared);
                Native.Release(cache);
                if (instance != IntPtr.Zero) Marshal.Release(instance);
                if (item != IntPtr.Zero) Marshal.Release(item);
            }
        }
    }
}
