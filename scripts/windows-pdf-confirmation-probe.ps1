# Observation only: share the real ownership/prompt logic but never invoke a command.
. (Join-Path $PSScriptRoot 'windows-pdf-confirmation.ps1')

function Read-PdfConfirmationProbe($Dialog, $Intent) {
  $buttons = @()
  foreach ($action in @('Confirm', 'Decline')) {
    $observation = Get-PdfConfirmationObservation $Dialog $Intent $action
    $matches = @($observation.Candidates | Where-Object {
      $_.Id -ceq $observation.Expected.Id -and $_.Class -ceq 'CCPushButton'
    })
    if ($matches.Count -ne 1) { throw 'Probe requires a unique command.' }
    $button = $matches[0]
    Assert-PdfCandidateIdentity $button $observation.Expected
    $native = [PdfDialogNative]::ReadCommandProbe([IntPtr]$Intent.SaveHandle,
      [IntPtr]$Dialog.Current.NativeWindowHandle, [IntPtr]$button.NativeHandle, [uint32]$Intent.ProcessId)
    $buttons += @{ action = $action; id = $button.Id; class = $button.Class;
      type = $button.Element.Current.ControlType.ProgrammaticName; enabled = $button.Enabled;
      supportsInvoke = $button.SupportsInvoke;
      patterns = @($button.Element.GetSupportedPatterns() | Select-Object -First 32 | ForEach-Object { $_.Id });
      native = $native }
  }
  return @{ schemaVersion = 1; status = 'observed'; productDialogObserved = $true;
    promptMatchesExpectedTarget = $true; commandInvoked = $false; pdfTested = $false; buttons = $buttons }
}
