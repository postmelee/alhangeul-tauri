using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;

namespace Alhangeul.ThumbnailDiagnostics
{
    // Per-call SDK debugging flags only; never replaces the normal flags=4 acceptance result.
    public static class GuestCacheComparison
    {
        public static ProbeResult Run(string path, uint flags) {
            var result = new ProbeResult { mode = "cache-comparison", requestFlags = flags };
            if (!Environment.Is64BitProcess || Thread.CurrentThread.GetApartmentState() != ApartmentState.STA ||
                (flags != 4 && flags != 0x104 && flags != 0xC04)) {
                result.detailCode = "invalid-comparison-context"; return result;
            }
            var timer = Stopwatch.StartNew();
            try { Invoke(path, flags, result); }
            catch (Exception error) { result.Check(error.HResult); result.detailCode = "comparison-exception"; }
            finally { result.elapsedMs = timer.ElapsedMilliseconds; }
            return result;
        }
        static void Invoke(string path, uint flags, ProbeResult result) {
            IntPtr item = IntPtr.Zero, instance = IntPtr.Zero;
            IThumbnailCache cache = null;
            ISharedBitmap shared = null;
            Guid shellIid = Native.ShellItem, cacheClsid = Native.Cache, cacheIid = typeof(IThumbnailCache).GUID;
            try {
                result.phase = "SHCreateItemFromParsingName.shellItem";
                if (!result.Check(Native.SHCreateItemFromParsingName(path, IntPtr.Zero, ref shellIid, out item))) return;
                result.phase = "CoCreateInstance.thumbnailCache";
                if (!result.Check(Native.CoCreateInstance(ref cacheClsid, IntPtr.Zero, Native.CLSCTX_INPROC_SERVER, ref cacheIid, out instance))) return;
                cache = Native.Wrap<IThumbnailCache>(instance);
                result.phase = "IThumbnailCache.GetThumbnail";
                uint cacheFlags; ThumbnailId id;
                if (!result.Check(cache.GetThumbnail(item, 256, flags, out shared, out cacheFlags, out id))) return;
                result.cacheFlags = cacheFlags;
                if (shared == null) { result.bitmapPresent = false; return; }
                result.phase = "ISharedBitmap.GetSharedBitmap";
                IntPtr borrowed;
                if (result.Check(shared.GetSharedBitmap(out borrowed))) result.InspectBitmap(borrowed);
            } finally {
                Native.Release(shared); Native.Release(cache);
                if (instance != IntPtr.Zero) Marshal.Release(instance);
                if (item != IntPtr.Zero) Marshal.Release(item);
            }
        }
    }
}
