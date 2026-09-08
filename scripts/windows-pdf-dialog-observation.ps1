. (Join-Path $PSScriptRoot 'windows-pdf-dialog-policy.ps1')

function Get-PdfButtonObservation($Element) {
  $info = $Element.Current
  $parent = [System.Windows.Automation.TreeWalker]::RawViewWalker.GetParent($Element)
  $depth = 0
  while ($null -ne $parent -and $parent.Current.ClassName -cne '#32770') {
    if (++$depth -gt 32) { throw 'Dialog ancestry limit exceeded.' }
    $parent = [System.Windows.Automation.TreeWalker]::RawViewWalker.GetParent($parent)
  }
  $dialogHandle = 0
  $dialogProcessId = 0
  if ($null -ne $parent) {
    $dialogHandle = $parent.Current.NativeWindowHandle
    $dialogProcessId = $parent.Current.ProcessId
  }
  return [pscustomobject]@{ Id = $info.AutomationId; Class = $info.ClassName;
    ProcessId = $info.ProcessId; DialogProcessId = $dialogProcessId;
    DialogHandle = $dialogHandle; NativeHandle = $info.NativeWindowHandle;
    Enabled = $info.IsEnabled; Type = $info.ControlType.ProgrammaticName; Element = $Element }
}

function Find-PdfNativeButton($Root, $Id, $AppProcessId) {
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $Id)
  $nodes = $Root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  $candidates = @($nodes | ForEach-Object { Get-PdfButtonObservation $_ })
  $expected = @{ Id = $Id; ProcessId = $AppProcessId; DialogHandle = $Root.Current.NativeWindowHandle }
  if ($Root.Current.ProcessId -ne $AppProcessId -or $Root.Current.ClassName -cne '#32770') {
    throw 'Dialog root identity mismatch.'
  }
  $selected = Select-PdfDialogButton $candidates $expected
  if ($null -eq $selected) { return $null }
  return $selected.Element
}

function Assert-PdfButtonCurrent($Dialog, $Button, $AppProcessId, $Id) {
  $current = Find-PdfNativeButton $Dialog $Id $AppProcessId
  if ($null -eq $current -or -not [System.Windows.Automation.Automation]::Compare($current, $Button)) {
    throw 'Dialog button changed before invocation.'
  }
  [PdfDialogNative]::ValidateButton([IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$current.Current.NativeWindowHandle, [uint32]$AppProcessId, [int]$Id)
}
