Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class DialogProbeWindow {
  [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr h, uint command);
  [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  static extern int GetClassName(IntPtr h, StringBuilder value, int length);
  public static long Owner(IntPtr h) { return GetWindow(h, 4).ToInt64(); }
  public static long Parent(IntPtr h) { return GetParent(h).ToInt64(); }
  public static uint ProcessId(IntPtr h) { uint pid; GetWindowThreadProcessId(h, out pid); return pid; }
  public static string ClassName(IntPtr h) {
    var value = new StringBuilder(128); GetClassName(h, value, value.Capacity); return value.ToString();
  }
}
'@

function Find-ProbeDialogs($AppProcessId) {
  $condition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ProcessIdProperty, [int]$AppProcessId),
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770'))
  return [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants, $condition)
}

function Read-ProbeNode($Element, $SaveHandle, $AppProcessId) {
  $info = $Element.Current
  $handle = [IntPtr]$info.NativeWindowHandle
  $owner = [DialogProbeWindow]::Owner($handle)
  $name = $info.Name
  # Only our public fixture is inspected. Never persist raw names/paths/prompt body.
  $normalized = $null
  if ($info.AutomationId -ceq 'ContentText') {
    $normalized = [regex]::Replace($name.Replace('dialog-probe-existing.pdf', '<fixture>'), '\s+', ' ').Trim()
    if ($normalized -cne '<fixture> already exists. Do you want to replace it?') { $normalized = 'unrecognized' }
  }
  return @{ id = $info.AutomationId; class = $info.ClassName; type = $info.ControlType.ProgrammaticName;
    enabled = $info.IsEnabled; handle = $handle.ToInt64(); sameProcess = $info.ProcessId -eq $AppProcessId;
    owner = $owner; parent = [DialogProbeWindow]::Parent($handle);
    ownerIsSave = $owner -ne 0 -and $owner -eq $SaveHandle;
    ownerSameProcess = $owner -ne 0 -and [DialogProbeWindow]::ProcessId([IntPtr]$owner) -eq $AppProcessId;
    ownerClass = [DialogProbeWindow]::ClassName([IntPtr]$owner);
    patterns = @($Element.GetSupportedPatterns() | ForEach-Object { @{ id = $_.Id; name = $_.ProgrammaticName } });
    containsFixtureName = $name.Contains('dialog-probe-existing.pdf'); promptTemplate = $normalized }
}

function Read-ProbeDialogs($Dialogs, $SaveHandle, $AppProcessId) {
  $result = @($Dialogs | ForEach-Object { Read-ProbeNode $_ $SaveHandle $AppProcessId })
  # Keep confirmation evidence even when the save dialog has a large file-list tree.
  $ordered = @($Dialogs | Sort-Object { $_.Current.NativeWindowHandle -eq $SaveHandle })
  foreach ($dialog in $ordered) {
    $nodes = $dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants,
      [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($node in $nodes) {
      if ($result.Count -ge 100) { return $result }
      $result += Read-ProbeNode $node $SaveHandle $AppProcessId
    }
  }
  return $result
}
