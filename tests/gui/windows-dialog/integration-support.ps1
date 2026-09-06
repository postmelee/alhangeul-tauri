function Wait-IntegrationDialogs($AppProcessId, $Count) {
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $dialogs = @(Find-ProbeDialogs $AppProcessId)
    if ($dialogs.Count -eq $Count) { return $dialogs }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  throw "Expected $Count controlled dialogs."
}

function Submit-IntegrationDialog($Dialog, $AppProcessId, $TargetPath, $Mode) {
  $id = if ($Mode -eq 'Open') { '1148' } else { '1001' }
  $condition = [System.Windows.Automation.AndCondition]::new(
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Edit'),
    [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id))
  $fields = $Dialog.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
  if ($fields.Count -ne 1) { throw 'Expected unique filename field.' }
  $button = Find-PdfNativeButton $Dialog '1' $AppProcessId
  if ($null -eq $button) { throw 'Missing submit button.' }
  Set-NativeFileNameFocus $Dialog $fields[0] $AppProcessId $Mode
  Set-NativeFileName $Dialog $fields[0] $AppProcessId $TargetPath $Mode
  Assert-PdfButtonCurrent $Dialog $button $AppProcessId '1'
  Invoke-NativeDialogButton $Dialog $button $AppProcessId '1'
}

function Test-IntegrationConfirmation($Save, $Intent, $Scenario, $Record) {
  $dialogs = @(Wait-IntegrationDialogs $Intent.ProcessId 2)
  $extra = @($dialogs | Where-Object { $_.Current.NativeWindowHandle -ne $Intent.SaveHandle })
  if ($extra.Count -ne 1) { throw 'Expected unique confirmation.' }
  $Record.confirmation = @(Read-ProbeDialogs @($extra[0]) $Intent.SaveHandle $Intent.ProcessId)
  if ($Scenario -eq 'WrongTarget') {
    $wrong = $Intent.Clone()
    $wrong.TargetPath = Join-Path ([IO.Path]::GetDirectoryName($Intent.TargetPath)) 'other.pdf'
    $wrong.SubmittedPath = $wrong.TargetPath
    $errorText = $null
    try { Invoke-PdfConfirmation $extra[0] $wrong 'Confirm' | Out-Null } catch { $errorText = $_.Exception.Message }
    if ($errorText -cne 'Overwrite intent rejected: unknown-prompt.') { throw 'Wrong target was not safely rejected.' }
    $null = Wait-IntegrationDialogs $Intent.ProcessId 2
    $Record.wrongTargetRejected = $true
  }
  $action = if ($Scenario -eq 'Overwrite') { 'Confirm' } else { 'Decline' }
  $Record.method = Invoke-PdfConfirmation $extra[0] $Intent $action
  $Record.action = $action
  if ($action -eq 'Decline') {
    $remaining = @(Wait-IntegrationDialogs $Intent.ProcessId 1)
    if ($remaining[0].Current.NativeWindowHandle -ne $Intent.SaveHandle -or -not $remaining[0].Current.IsEnabled) {
      throw 'Decline did not return to the enabled save dialog.'
    }
    $Record.returnedToSave = $true
    Close-PdfFileDialog $Save $Intent.ProcessId
  }
}

function Assert-IntegrationResult($CaseRoot, $Scenario, $Record) {
  $hostResult = Get-Content -LiteralPath (Join-Path $CaseRoot 'host-result.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $cancelled = $Scenario -in @('Decline', 'WrongTarget')
  $expectedResult = if ($cancelled) { 'Cancel' } else { 'OK' }
  if ($hostResult.result -cne $expectedResult -or $hostResult.scenario -cne $Scenario) { throw 'Wrong host result.' }
  if (-not $cancelled -and -not $hostResult.selectedExpected) { throw 'Wrong selected path.' }
  $targetName = if ($Scenario -eq 'Fresh') { 'dialog-probe-new.pdf' } else { 'dialog-probe-existing.pdf' }
  $expectedContent = if ($Scenario -in @('Fresh', 'Overwrite')) { 'Alhangeul dialog integration saved' } else { 'Existing sentinel' }
  $Record.targetVerified = [IO.File]::ReadAllText((Join-Path $CaseRoot $targetName)) -ceq $expectedContent
  $Record.sourceUnchanged = [IO.File]::ReadAllText((Join-Path $CaseRoot 'source-control.txt')) -ceq 'Source sentinel'
  $Record.otherTargetUnchanged = [IO.File]::ReadAllText((Join-Path $CaseRoot 'other.pdf')) -ceq 'Other sentinel'
  $Record.dialogResult = $hostResult.result
  $Record.selectedExpected = $hostResult.selectedExpected
  if (-not ($Record.targetVerified -and $Record.sourceUnchanged -and $Record.otherTargetUnchanged)) {
    throw 'Fixture postcondition failed.'
  }
}
