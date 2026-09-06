# Optional diagnostics only: never use this snapshot to select or authorize a button.
function Invoke-PdfTreeDiagnosticCapture([scriptblock]$ReadNodes) {
  try {
    $nodes = @(& $ReadNodes)
    return @{ status = 'available'; reason = $null; nodes = $nodes }
  } catch {
    $exception = $_.Exception
    for ($depth = 0; $depth -lt 8 -and $null -ne $exception; $depth++) {
      if ($exception -is [System.Windows.Automation.ElementNotAvailableException]) {
        return @{ status = 'unavailable'; reason = 'element-not-available'; nodes = @() }
      }
      $exception = $exception.InnerException
    }
    throw
  }
}

function Get-PdfDiagnosticToken([string]$Value) {
  if ($Value -cmatch '^[A-Za-z0-9_.#-]{0,80}$') { return $Value }
  return 'redacted'
}

function Get-PdfDialogTreeNodes($Dialogs) {
  $pending = [System.Collections.Generic.Queue[object]]::new()
  $queued = 0
  foreach ($dialog in $Dialogs) {
    if ($queued -ge 100) { break }
    $pending.Enqueue($dialog); $queued++
  }
  $walker = [System.Windows.Automation.TreeWalker]::RawViewWalker
  while ($pending.Count -gt 0) {
    $node = $pending.Dequeue()
    $info = $node.Current
    # No Name/Value/prompt or exception text. Only bounded control metadata.
    $patterns = @()
    if ($info.AutomationId -in @('CommandButton_6', 'CommandButton_7')) {
      $patterns = @($node.GetSupportedPatterns() | ForEach-Object { $_.Id })
    }
    @{ id = Get-PdfDiagnosticToken $info.AutomationId; class = Get-PdfDiagnosticToken $info.ClassName;
       type = Get-PdfDiagnosticToken $info.ControlType.ProgrammaticName; enabled = $info.IsEnabled; patterns = $patterns }
    if ($queued -ge 100) { continue }
    $child = $walker.GetFirstChild($node)
    while ($null -ne $child -and $queued -lt 100) {
      $pending.Enqueue($child); $queued++
      if ($queued -lt 100) { $child = $walker.GetNextSibling($child) }
    }
  }
}

function Read-PdfDialogTree($Dialogs) {
  return Invoke-PdfTreeDiagnosticCapture { Get-PdfDialogTreeNodes $Dialogs }
}
