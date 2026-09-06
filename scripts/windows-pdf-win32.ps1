# Test-only native fallback for app-owned common file dialogs.
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
using System.Diagnostics;
using System.Threading;
using System.Collections.Generic;
public static class PdfDialogNative {
  [StructLayout(LayoutKind.Sequential)]
  struct NativeRect { public int left, top, right, bottom; }
  [StructLayout(LayoutKind.Sequential)]
  struct GuiThreadInfo {
    public uint cbSize, flags;
    public IntPtr hwndActive, hwndFocus, hwndCapture, hwndMenuOwner, hwndMoveSize, hwndCaret;
    public NativeRect rcCaret;
  }
  [DllImport("user32.dll", SetLastError = true)]
  static extern bool GetGUIThreadInfo(uint threadId, ref GuiThreadInfo info);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr h, StringBuilder text, int count);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsChild(IntPtr parent, IntPtr child);
  [DllImport("user32.dll")] static extern bool IsWindowEnabled(IntPtr h);
  [DllImport("user32.dll")] static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint command);
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
    var value = ReadClassName(h);
    if (value.Length == 0) throw new Exception("Invalid HWND");
    return value;
  }
  static string ReadClassName(IntPtr h) {
    var value = new StringBuilder(128);
    return GetClassName(h, value, value.Capacity) == 0 ? "" : value.ToString();
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
  public static void FocusFileName(IntPtr dialog, IntPtr edit, uint pid, string mode) {
    if (mode != "Open" && mode != "Save") throw new Exception("Unexpected dialog mode");
    Validate(dialog, edit, pid, mode == "Open" ? 1148 : 1001, "Edit");
    uint observedPid;
    uint threadId = GetWindowThreadProcessId(edit, out observedPid);
    if (threadId == 0 || observedPid != pid) throw new Exception("Invalid edit thread");
    // The dialog's owning thread performs the focus change; no cross-thread SetFocus.
    if (!PostMessage(dialog, 0x0028, edit, new IntPtr(1)))
      throw new Exception("WM_NEXTDLGCTL failed");
    var deadline = Stopwatch.StartNew();
    while (deadline.ElapsedMilliseconds < 2000) {
      var info = new GuiThreadInfo();
      info.cbSize = (uint)Marshal.SizeOf(typeof(GuiThreadInfo));
      if (!GetGUIThreadInfo(threadId, ref info)) throw new Exception("GetGUIThreadInfo failed");
      if (info.hwndFocus == edit) return;
      Thread.Sleep(25);
    }
    throw new Exception("Native filename focus mismatch");
  }
  public static void SetFileName(IntPtr dialog, IntPtr edit, uint pid, string text, string mode) {
    if (mode != "Open" && mode != "Save") throw new Exception("Unexpected dialog mode");
    int id = mode == "Open" ? 1148 : 1001;
    Validate(dialog, edit, pid, id, "Edit");
    if (String.IsNullOrEmpty(text) || text.IndexOf('\0') >= 0) throw new Exception("Invalid filename");
    UIntPtr result;
    // Open and Save must both notify the dialog through an edit operation.
    // EM_SETSEL selects all; EM_REPLACESEL has no meaningful message return value.
    if (ControlMessage(edit, 0x00B1, UIntPtr.Zero, new IntPtr(-1), 2, 2000, out result) == IntPtr.Zero)
      throw new Exception("EM_SETSEL timed out or failed");
    if (SetTextMessage(edit, 0x00C2, UIntPtr.Zero, text, 2, 2000, out result) == IntPtr.Zero)
      throw new Exception("EM_REPLACESEL timed out or failed");
    var readback = new StringBuilder(text.Length + 1);
    if (ReadTextMessage(edit, 0x000D, (UIntPtr)readback.Capacity, readback, 2, 2000, out result) == IntPtr.Zero
      || readback.ToString() != text) throw new Exception("Filename readback mismatch");
  }
  public static void Click(IntPtr dialog, IntPtr button, uint pid, int id) {
    ValidateButton(dialog, button, pid, id);
    // Asynchronous BM_CLICK avoids blocking this helper on the overwrite modal.
    if (!PostMessage(button, 0x00F5, IntPtr.Zero, IntPtr.Zero)) throw new Exception("BM_CLICK failed");
  }
  public static void ValidateButton(IntPtr dialog, IntPtr button, uint pid, int id) {
    if (id != 1 && id != 2 && id != 6) throw new Exception("Unexpected button ID");
    Validate(dialog, button, pid, id, "Button");
    if (!IsWindowEnabled(dialog)) throw new Exception("Native dialog is disabled");
  }
  static readonly string[] OwnerChecks = { "expectedProcessValid", "saveProcessMatches",
    "confirmationProcessMatches", "distinctDialogs", "saveClassMatches", "confirmationClassMatches",
    "ownerMatches", "saveDisabled", "confirmationEnabled" };
  static readonly string[] ButtonChecks = { "buttonProcessMatches", "buttonIsChild",
    "buttonClassMatches", "buttonEnabled" };
  static bool ChecksPass(Dictionary<string, object> checks, string[] keys) {
    foreach (var key in keys) {
      object value;
      if (!checks.TryGetValue(key, out value) || !(value is bool) || !(bool)value) return false;
    }
    return true;
  }
  static Dictionary<string, object> ReadConfirmationChecks(IntPtr save, IntPtr confirm, uint pid) {
    uint savePid, confirmPid;
    GetWindowThreadProcessId(save, out savePid);
    GetWindowThreadProcessId(confirm, out confirmPid);
    var saveClass = ReadClassName(save);
    var confirmClass = ReadClassName(confirm);
    return new Dictionary<string, object> {
      { "expectedProcessValid", pid != 0 }, { "saveProcessMatches", savePid == pid },
      { "confirmationProcessMatches", confirmPid == pid }, { "distinctDialogs", save != confirm },
      { "saveClassMatches", saveClass == "#32770" }, { "confirmationClassMatches", confirmClass == "#32770" },
      { "ownerMatches", GetWindow(confirm, 4) == save }, { "saveDisabled", !IsWindowEnabled(save) },
      { "confirmationEnabled", IsWindowEnabled(confirm) },
      { "nativeSaveClass", saveClass }, { "nativeConfirmationClass", confirmClass }
    };
  }
  public static bool OwnsConfirmation(IntPtr save, IntPtr confirm, uint pid) {
    return ChecksPass(ReadConfirmationChecks(save, confirm, pid), OwnerChecks);
  }
  public static void RequireCommandChecks(Dictionary<string, object> checks) {
    if (ChecksPass(checks, OwnerChecks) && ChecksPass(checks, ButtonChecks)) return;
    var error = new Exception("Confirmation native identity mismatch");
    // This exact snapshot gates invocation; do not perform a second diagnostic-only read.
    error.Data["PdfConfirmationNative"] = checks;
    throw error;
  }
  public static void ValidateCommand(IntPtr save, IntPtr confirm, IntPtr button, uint pid) {
    var checks = ReadConfirmationChecks(save, confirm, pid);
    uint buttonPid;
    GetWindowThreadProcessId(button, out buttonPid);
    var buttonClass = ReadClassName(button);
    checks["buttonProcessMatches"] = buttonPid == pid;
    checks["buttonIsChild"] = IsChild(confirm, button);
    // UIA reports CCPushButton; the observed Win32 HWND class is Button (run 34048778670).
    checks["buttonClassMatches"] = buttonClass == "Button";
    checks["buttonEnabled"] = IsWindowEnabled(button);
    checks["nativeButtonClass"] = buttonClass;
    RequireCommandChecks(checks);
  }
}
'@

function Set-NativeFileName($Dialog, $Field, $AppProcessId, $Text, $Mode) {
  [PdfDialogNative]::SetFileName([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Field.Current.NativeWindowHandle, [uint32]$AppProcessId, $Text, $Mode)
}

function Set-NativeFileNameFocus($Dialog, $Field, $AppProcessId, $Mode) {
  [PdfDialogNative]::FocusFileName([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Field.Current.NativeWindowHandle, [uint32]$AppProcessId, $Mode)
}

function Invoke-NativeDialogButton($Dialog, $Button, $AppProcessId, $Id) {
  [PdfDialogNative]::Click([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$Button.Current.NativeWindowHandle, [uint32]$AppProcessId, [int]$Id)
}
