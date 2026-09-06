# Test-only native fallback for app-owned common file dialogs.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class PdfDialogNative {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr h, StringBuilder text, int count);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent, IntPtr child);
  [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageTimeoutW")]
  static extern IntPtr SetTextMessage(IntPtr h, uint msg, UIntPtr w, string text,
    uint flags, uint timeout, out UIntPtr result);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessageTimeoutW")]
  static extern IntPtr ReadTextMessage(IntPtr h, uint msg, UIntPtr w, StringBuilder text,
    uint flags, uint timeout, out UIntPtr result);
  [DllImport("user32.dll", SetLastError = true)]
  static extern bool PostMessage(IntPtr h, uint msg, IntPtr w, IntPtr l);

  static string ClassName(IntPtr h) {
    var value = new StringBuilder(128);
    if (GetClassName(h, value, value.Capacity) == 0) throw new Exception("Invalid HWND");
    return value.ToString();
  }
  static void Validate(IntPtr dialog, IntPtr control, uint expectedPid, int id, string cls) {
    uint dialogPid, controlPid;
    GetWindowThreadProcessId(dialog, out dialogPid);
    GetWindowThreadProcessId(control, out controlPid);
    if (expectedPid == 0 || dialogPid != expectedPid || controlPid != expectedPid
      || ClassName(dialog) != "#32770" || !IsChild(dialog, control)
      || GetDlgCtrlID(control) != id || ClassName(control) != cls || !IsWindowEnabled(control))
      throw new Exception("Native dialog control identity mismatch");
  }
  public static void SetFileName(IntPtr dialog, IntPtr edit, uint pid, string text) {
    Validate(dialog, edit, pid, 1148, "Edit");
    if (String.IsNullOrEmpty(text) || text.IndexOf('\0') >= 0) throw new Exception("Invalid filename");
    UIntPtr result;
    if (SetTextMessage(edit, 0x000C, UIntPtr.Zero, text, 2, 2000, out result) == IntPtr.Zero
      || result == UIntPtr.Zero) throw new Exception("WM_SETTEXT failed");
    var readback = new StringBuilder(text.Length + 1);
    if (ReadTextMessage(edit, 0x000D, (UIntPtr)readback.Capacity, readback, 2, 2000, out result) == IntPtr.Zero
      || readback.ToString() != text) throw new Exception("Filename readback mismatch");
  }
  public static void Click(IntPtr dialog, IntPtr button, uint pid, int id) {
    if (id != 1 && id != 6) throw new Exception("Unexpected button ID");
    Validate(dialog, button, pid, id, "Button");
    // Asynchronous BM_CLICK avoids blocking this helper on the overwrite modal.
    if (!PostMessage(button, 0x00F5, IntPtr.Zero, IntPtr.Zero)) throw new Exception("BM_CLICK failed");
  }
}
'@

function Set-NativeFileName($Dialog, $Field, $AppProcessId, $Text) {
  [PdfDialogNative]::SetFileName([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Field.Current.NativeWindowHandle, [uint32]$AppProcessId, $Text)
}

function Invoke-NativeDialogButton($Dialog, $Button, $AppProcessId, $Id) {
  [PdfDialogNative]::Click([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Button.Current.NativeWindowHandle, [uint32]$AppProcessId, [int]$Id)
}
