. (Join-Path $PSScriptRoot 'windows-pdf-dialog-observation.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-native-diagnostics.ps1')

function Get-PdfConfirmationObservation($Dialog, $Intent, $Action) {
  if ($Action -notin @('Confirm', 'Decline')) { throw 'Invalid confirmation action.' }
  $handle = $Dialog.Current.NativeWindowHandle
  $owned = [PdfDialogNative]::OwnsConfirmation([IntPtr]$Intent.SaveHandle, [IntPtr]$handle, $Intent.ProcessId)
  if (-not $owned -or $Dialog.Current.ProcessId -ne $Intent.ProcessId) { throw 'Unverified confirmation owner.' }
  $contentCondition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'ContentText')
  $scope = [System.Windows.Automation.TreeScope]::Descendants
  $content = $Dialog.FindAll($scope, $contentCondition)
  if ($content.Count -ne 1 -or $content[0].Current.ProcessId -ne $Intent.ProcessId) {
    throw 'Expected unique confirmation content.'
  }
  $matchesTarget = Test-PdfReplacePrompt $content[0].Current.Name ([IO.Path]::GetFileName($Intent.TargetPath))
  $context = $Intent.Clone()
  $context.OwnedBySaveDialog = $owned
  $context.TargetExists = $Intent.TargetExists -and (Test-Path -LiteralPath $Intent.TargetPath -PathType Leaf)
  $context.PromptKind = if ($matchesTarget) { 'replace-existing-file' } else { 'unknown' }
  $context.PromptTarget = if ($matchesTarget) { $Intent.TargetPath } else { $null }
  $decision = Get-PdfOverwriteDecision $context
  if ($decision -cne 'eligible') { throw "Overwrite intent rejected: $decision." }
  $id = if ($Action -eq 'Confirm') { 'CommandButton_6' } else { 'CommandButton_7' }
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id)
  $candidates = @($Dialog.FindAll($scope, $condition) | ForEach-Object {
    $node = Get-PdfButtonObservation $_
    $pattern = $null
    $supported = $_.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)
    $node | Add-Member -NotePropertyName SupportsInvoke -NotePropertyValue $supported
    $node
  })
  $expected = @{ Id = $id; ProcessId = $Intent.ProcessId; DialogHandle = $handle }
  return @{ Candidates = $candidates; Expected = $expected }
}

function Get-PdfConfirmationPair($Dialog, $Intent, $Action) {
  $otherAction = if ($Action -eq 'Confirm') { 'Decline' } else { 'Confirm' }
  $first = Get-PdfConfirmationObservation $Dialog $Intent $Action
  $second = Get-PdfConfirmationObservation $Dialog $Intent $otherAction
  $selected = Select-PdfConfirmationCandidate $first.Candidates $first.Expected
  $other = Select-PdfConfirmationCandidate $second.Candidates $second.Expected
  return @{ Selected = $selected; Other = $other; Method = (Get-PdfConfirmationMethod $selected $other) }
}

function Invoke-PdfConfirmation($Dialog, $Intent, $Action) {
  $pair = Get-PdfConfirmationPair $Dialog $Intent $Action
  # Re-read meaning, ownership and candidate identity immediately before invoking.
  $current = Get-PdfConfirmationPair $Dialog $Intent $Action
  foreach ($key in @('Selected', 'Other')) {
    if ($pair[$key].NativeHandle -ne $current[$key].NativeHandle -or
        -not [System.Windows.Automation.Automation]::Compare($pair[$key].Element, $current[$key].Element)) {
      throw 'Confirmation button changed before invocation.'
    }
  }
  if ($pair.Method -cne $current.Method) { throw 'Confirmation capability changed before invocation.' }
  if ($current.Method -ceq 'Win32-BM_CLICK-command') {
    [PdfDialogNative]::ClickCommand([IntPtr]$Intent.SaveHandle, [IntPtr]$Dialog.Current.NativeWindowHandle,
      [IntPtr]$current.Selected.NativeHandle, [IntPtr]$current.Other.NativeHandle, [uint32]$Intent.ProcessId)
    return $current.Method
  }
  [PdfDialogNative]::ValidateCommand([IntPtr]$Intent.SaveHandle, [IntPtr]$Dialog.Current.NativeWindowHandle,
    [IntPtr]$current.Selected.NativeHandle, [uint32]$Intent.ProcessId)
  $pattern = $null
  if (-not $current.Selected.Element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
    throw 'Confirmation InvokePattern unsupported.'
  }
  $pattern.Invoke()
  return 'UIA-InvokePattern'
}

function Close-PdfFileDialog($Dialog, $AppProcessId) {
  $button = Find-PdfNativeButton $Dialog '2' $AppProcessId
  if ($null -eq $button) { throw 'File dialog cancel button missing.' }
  Assert-PdfButtonCurrent $Dialog $button $AppProcessId '2'
  Invoke-NativeDialogButton $Dialog $button $AppProcessId '2'
}
