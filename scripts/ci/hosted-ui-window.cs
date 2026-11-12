// Read-only enumeration for disposable hosted Explorer probes. Never enumerate window text into logs.
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
namespace Alhangeul.HostedExplorer {
  public sealed class WindowInfo {
    public long handle;
    public uint processId;
    public string className;
    public bool visible;
  }
  public static class Native {
    delegate bool Visitor(IntPtr window, IntPtr parameter);
    [DllImport("user32.dll")] static extern bool EnumWindows(Visitor visitor, IntPtr parameter);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint process);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll", SetLastError=true)] public static extern bool PostMessage(IntPtr window, uint message, IntPtr word, IntPtr data);
    [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
    public static WindowInfo[] Read(string marker) {
      if (String.IsNullOrEmpty(marker) || !marker.StartsWith("alh-ui-")) throw new ArgumentException("owned-marker-required");
      var windows = new List<WindowInfo>();
      EnumWindows(delegate(IntPtr window, IntPtr unused) {
        var title = new StringBuilder(1024);
        GetWindowText(window, title, title.Capacity);
        if (title.ToString().IndexOf(marker, StringComparison.OrdinalIgnoreCase) < 0) return true;
        var type = new StringBuilder(256);
        GetClassName(window, type, type.Capacity);
        uint pid; GetWindowThreadProcessId(window, out pid);
        windows.Add(new WindowInfo { handle=window.ToInt64(), processId=pid, className=type.ToString(), visible=IsWindowVisible(window) });
        return true;
      }, IntPtr.Zero);
      return windows.ToArray();
    }
  }
}
