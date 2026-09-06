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
  [DllImport("user32.dll", EntryPoint = "SendMessageTimeoutW")]
  static extern IntPtr ControlMessage(IntPtr h, uint msg, UIntPtr w, IntPtr l,
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
  public static void SetFileName(IntPtr dialog, IntPtr edit, uint pid, string text, string mode) {
    if (mode != "Open" && mode != "Save") throw new Exception("Unexpected dialog mode");
    int id = mode == "Open" ? 1148 : 1001;
    Validate(dialog, edit, pid, id, "Edit");
    if (String.IsNullOrEmpty(text) || text.IndexOf('\0') >= 0) throw new Exception("Invalid filename");
    UIntPtr result;
    if (mode == "Save") {
      // Use the edit operation so the common dialog observes a filename change.
      // EM_SETSEL selects all; EM_REPLACESEL has no meaningful message return value.
      if (ControlMessage(edit, 0x00B1, UIntPtr.Zero, new IntPtr(-1), 2, 2000, out result) == IntPtr.Zero)
        throw new Exception("EM_SETSEL timed out or failed");
      if (SetTextMessage(edit, 0x00C2, UIntPtr.Zero, text, 2, 2000, out result) == IntPtr.Zero)
        throw new Exception("EM_REPLACESEL timed out or failed");
    } else {
      if (SetTextMessage(edit, 0x000C, UIntPtr.Zero, text, 2, 2000, out result) == IntPtr.Zero
        || result == UIntPtr.Zero) throw new Exception("WM_SETTEXT failed");
    }
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

function Set-NativeFileName($Dialog, $Field, $AppProcessId, $Text, $Mode) {
  [PdfDialogNative]::SetFileName([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Field.Current.NativeWindowHandle, [uint32]$AppProcessId, $Text, $Mode)
}

function Invoke-NativeDialogButton($Dialog, $Button, $AppProcessId, $Id) {
  [PdfDialogNative]::Click([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Button.Current.NativeWindowHandle, [uint32]$AppProcessId, [int]$Id)
}
