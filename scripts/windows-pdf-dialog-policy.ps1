# Pure decisions only. Live UI/ownership checks belong to the observation/native adapters.
function Select-PdfDialogButton($Candidates, $Expected) {
  if ($Expected.Id -notin @('1', '2', '6') -or $Expected.ProcessId -le 0 -or
      $Expected.DialogHandle -eq 0) { throw 'Invalid button expectation.' }
  $found = @($Candidates | Where-Object {
    $_.Id -ceq $Expected.Id -and $_.Class -ceq 'Button'
  })
  if ($found.Count -eq 0) { return $null }
  if ($found.Count -ne 1) { throw 'Ambiguous native dialog button.' }
  $candidate = $found[0]
  Assert-PdfCandidateIdentity $candidate $Expected
  return $candidate
}

function Assert-PdfCandidateIdentity($candidate, $Expected) {
  if ($candidate.ProcessId -ne $Expected.ProcessId -or
      $candidate.DialogProcessId -ne $Expected.ProcessId -or
      $candidate.DialogHandle -ne $Expected.DialogHandle -or
      $candidate.NativeHandle -eq 0 -or $candidate.Enabled -isnot [bool] -or
      -not $candidate.Enabled) { throw 'Dialog button identity or state mismatch.' }
}

function Select-PdfConfirmationCandidate($Candidates, $Expected) {
  if ($Expected.Id -notin @('CommandButton_6', 'CommandButton_7') -or
      $Expected.ProcessId -le 0 -or $Expected.DialogHandle -eq 0) { throw 'Invalid command expectation.' }
  $found = @($Candidates | Where-Object { $_.Id -ceq $Expected.Id -and $_.Class -ceq 'CCPushButton' })
  if ($found.Count -ne 1) { throw 'Expected unique confirmation command.' }
  $candidate = $found[0]
  Assert-PdfCandidateIdentity $candidate $Expected
  return $candidate
}

function Select-PdfConfirmationButton($Candidates, $Expected) {
  $candidate = Select-PdfConfirmationCandidate $Candidates $Expected
  if ($candidate.SupportsInvoke -isnot [bool] -or -not $candidate.SupportsInvoke) {
    throw 'Confirmation InvokePattern unsupported.'
  }
  return $candidate
}

function Get-PdfConfirmationMethod($Selected, $Other) {
  if ($Selected.NativeHandle -eq 0 -or $Other.NativeHandle -eq 0 -or
      $Selected.NativeHandle -eq $Other.NativeHandle -or
      $Selected.Id -notin @('CommandButton_6', 'CommandButton_7') -or
      $Other.Id -notin @('CommandButton_6', 'CommandButton_7') -or $Selected.Id -ceq $Other.Id) {
    throw 'Confirmation commands must have distinct identities.'
  }
  if ($Selected.SupportsInvoke -isnot [bool] -or $Other.SupportsInvoke -isnot [bool]) {
    throw 'Invalid confirmation capability.'
  }
  if ($Selected.SupportsInvoke) { return 'UIA-InvokePattern' }
  if ($Selected.Type -cne 'ControlType.Pane' -or $Other.Type -cne 'ControlType.Pane' -or $Other.SupportsInvoke) {
    throw 'Unsupported native confirmation shape.'
  }
  # Eligible route only; live native guards and active-dialog checks must still pass.
  return 'Win32-BM_CLICK-command'
}

function Test-PdfReplacePrompt($Text, $FileName) {
  if ([string]::IsNullOrEmpty($FileName) -or $FileName -match '[\r\n]') { return $false }
  # Only the observed English template. Preserve spaces and punctuation in the filename.
  $pattern = '\A' + [regex]::Escape($FileName) + ' already exists\.\s+Do you want to replace it\?\z'
  return [regex]::IsMatch($Text, $pattern)
}

function Get-PdfOverwriteDecision($Context) {
  if ($Context.Cancelled -isnot [bool] -or $Context.Cancelled) { return 'cancelled' }
  if ($Context.Mode -cne 'Save') { return 'not-save' }
  if ($Context.TargetExists -isnot [bool] -or -not $Context.TargetExists) { return 'not-existing-target' }
  if ([string]::IsNullOrEmpty($Context.TargetPath) -or
      $Context.TargetPath -cne $Context.SubmittedPath) { return 'submitted-target-mismatch' }
  if ($Context.OwnedBySaveDialog -isnot [bool] -or -not $Context.OwnedBySaveDialog) {
    return 'unverified-owner'
  }
  if ($Context.PromptKind -cne 'replace-existing-file') { return 'unknown-prompt' }
  if ($Context.PromptTarget -cne $Context.TargetPath) { return 'prompt-target-mismatch' }
  # Necessary conditions only; a supported, revalidated execution adapter is still required.
  return 'eligible'
}
