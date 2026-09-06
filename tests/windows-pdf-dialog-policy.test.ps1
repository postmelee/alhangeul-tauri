param([Parameter(Mandatory = $true)][string]$EvidencePath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-pdf-dialog-policy.ps1')
$cases = [System.Collections.Generic.List[object]]::new()

function Test-Case($Name, $Body) {
  try {
    & $Body
    $cases.Add(@{ name = $Name; passed = $true })
  } catch {
    $cases.Add(@{ name = $Name; passed = $false })
  }
}
function Assert-Equal($Actual, $Expected) {
  if ($Actual -cne $Expected) { throw 'Assertion mismatch.' }
}
function Assert-Rejects($Body, $ExpectedMessage) {
  $observed = $null
  try { & $Body | Out-Null } catch { $observed = $_.Exception.Message }
  Assert-Equal $observed $ExpectedMessage
}
function New-Candidate($Node) {
  return @{ Id = $Node.Id; Class = $Node.Class; Enabled = $Node.Enabled;
    ProcessId = 10; DialogProcessId = 10; DialogHandle = 100; NativeHandle = 101 }
}

$fixture = Get-Content (Join-Path $PSScriptRoot 'fixtures/windows-dialog-controls.json') -Raw -Encoding UTF8 |
  ConvertFrom-Json
$expected = @{ Id = '1'; ProcessId = 10; DialogHandle = 100 }
$button = New-Candidate $fixture.collision[1]
Test-Case 'Windows PowerShell 5.1' {
  Assert-Equal $PSVersionTable.PSVersion.Major 5
  Assert-Equal $PSVersionTable.PSVersion.Minor 1
}
Test-Case 'observed ID collision selects Button, not UIItem' {
  $nodes = @($fixture.collision | ForEach-Object { New-Candidate $_ })
  Assert-Equal (Select-PdfDialogButton $nodes $expected).Class 'Button'
}
Test-Case 'missing button returns null' { Assert-Equal (Select-PdfDialogButton @() $expected) $null }
Test-Case 'duplicate buttons rejected' {
  Assert-Rejects { Select-PdfDialogButton @($button, $button.Clone()) $expected } 'Ambiguous native dialog button.'
}
foreach ($field in @('ProcessId', 'DialogProcessId', 'DialogHandle', 'NativeHandle')) {
  Test-Case "wrong or missing $field rejected" {
    $changed = $button.Clone(); $changed[$field] = 0
    Assert-Rejects { Select-PdfDialogButton @($changed) $expected } 'Dialog button identity or state mismatch.'
  }
}
foreach ($enabled in @($false, 'true', $null)) {
  Test-Case "disabled or untyped state rejected ($enabled)" {
    $changed = $button.Clone(); $changed.Enabled = $enabled
    Assert-Rejects { Select-PdfDialogButton @($changed) $expected } 'Dialog button identity or state mismatch.'
  }
}
Test-Case 'disabled duplicate does not disambiguate' {
  $changed = $button.Clone(); $changed.Enabled = $false
  Assert-Rejects { Select-PdfDialogButton @($button, $changed) $expected } 'Ambiguous native dialog button.'
}
Test-Case 'unexpected requested ID rejected' {
  $changed = $expected.Clone(); $changed.Id = '7'
  Assert-Rejects { Select-PdfDialogButton @($button) $changed } 'Invalid button expectation.'
}
Test-Case 'observed command buttons not legacy native buttons' {
  $changed = $expected.Clone(); $changed.Id = '6'
  $nodes = @($fixture.confirmation | ForEach-Object { New-Candidate $_ })
  Assert-Equal (Select-PdfDialogButton $nodes $changed) $null
}
Test-Case 'legacy yes candidate still requires separate intent decision' {
  $changed = $expected.Clone(); $changed.Id = '6'
  $yes = $button.Clone(); $yes.Id = '6'
  Assert-Equal (Select-PdfDialogButton @($yes) $changed).Id '6'
}

$context = @{ Cancelled = $false; Mode = 'Save'; TargetExists = $true;
  TargetPath = 'fixture://existing.pdf'; SubmittedPath = 'fixture://existing.pdf';
  OwnedBySaveDialog = $true; PromptKind = 'replace-existing-file'; PromptTarget = 'fixture://existing.pdf' }
Test-Case 'synthetic eligible intent is not an OS click' { Assert-Equal (Get-PdfOverwriteDecision $context) 'eligible' }
$negative = @(
  @('Cancelled', $true, 'cancelled'), @('Cancelled', $null, 'cancelled'),
  @('Mode', 'Open', 'not-save'), @('TargetExists', $false, 'not-existing-target'),
  @('TargetExists', 'true', 'not-existing-target'), @('TargetPath', '', 'submitted-target-mismatch'),
  @('SubmittedPath', 'fixture://other.pdf', 'submitted-target-mismatch'),
  @('OwnedBySaveDialog', $false, 'unverified-owner'), @('OwnedBySaveDialog', 'true', 'unverified-owner'),
  @('PromptKind', 'unknown', 'unknown-prompt'), @('PromptKind', 'delete-file', 'unknown-prompt'),
  @('PromptTarget', 'fixture://other.pdf', 'prompt-target-mismatch')
)
foreach ($mutation in $negative) {
  Test-Case "intent rejects $($mutation[0]): $($mutation[2])" {
    $changed = $context.Clone(); $changed[$mutation[0]] = $mutation[1]
    Assert-Equal (Get-PdfOverwriteDecision $changed) $mutation[2]
  }
}
$failed = @($cases | Where-Object { -not $_.passed })
@{ schemaVersion = 1; kind = 'pure-policy'; powerShell = $PSVersionTable.PSVersion.ToString();
   passed = $failed.Count -eq 0; cases = @($cases.ToArray()); nativeUiTested = $false } |
  ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
$cases | ForEach-Object { Write-Output "$(if ($_.passed) { 'PASS' } else { 'FAIL' }): $($_.name)" }
if ($failed.Count -gt 0) { exit 1 }
exit 0
