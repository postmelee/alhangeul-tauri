# Test-only rejection exercise. Invocation uses the same adapter as normal PDF export.
function Wait-PdfAppDialogs($AppProcessId, $Count) {
  $condition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $AppProcessId),
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770'))
  $limit = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $dialogs = @([System.Windows.Automation.AutomationElement]::RootElement.FindAll(
      [System.Windows.Automation.TreeScope]::Descendants, $condition))
    if ($dialogs.Count -eq $Count) { return $dialogs }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $limit)
  throw "Expected $Count app dialogs."
}

function Test-PdfAppDecline($Dialog, $Intent, $Case) {
  if ($Case -notin @('Decline', 'WrongTarget')) { throw 'Invalid decline case.' }
  $result = @{ action = 'Decline'; wrongTargetRejected = $false; returnedToSave = $false; dialogsClosed = $false }
  if ($Case -eq 'WrongTarget') {
    $wrong = $Intent.Clone()
    $wrong.TargetPath = Join-Path ([IO.Path]::GetDirectoryName($Intent.TargetPath)) 'confirmation-verify-other.pdf'
    $wrong.SubmittedPath = $wrong.TargetPath
    if (-not (Test-Path -LiteralPath $wrong.TargetPath -PathType Leaf)) { throw 'Missing wrong-target fixture.' }
    $rejection = $null
    try { Invoke-PdfConfirmation $Dialog $wrong 'Confirm' | Out-Null }
    catch { $rejection = $_.Exception.Message }
    if ($rejection -cne 'Overwrite intent rejected: unknown-prompt.') { throw 'Wrong target not safely rejected.' }
    $null = Wait-PdfAppDialogs $Intent.ProcessId 2
    $result.wrongTargetRejected = $true
  }
  $result.method = Invoke-PdfConfirmation $Dialog $Intent 'Decline'
  $remaining = @(Wait-PdfAppDialogs $Intent.ProcessId 1)
  if ($remaining[0].Current.NativeWindowHandle -ne $Intent.SaveHandle -or -not $remaining[0].Current.IsEnabled) {
    throw 'Decline did not return to the enabled Save dialog.'
  }
  $result.returnedToSave = $true
  Close-PdfFileDialog $remaining[0] $Intent.ProcessId
  $null = Wait-PdfAppDialogs $Intent.ProcessId 0
  $result.dialogsClosed = $true
  return $result
}
