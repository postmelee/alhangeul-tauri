param([Parameter(Mandatory = $true)][string]$EvidencePath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot '../scripts/windows-pdf-tree-diagnostics.ps1')
$cases = [System.Collections.Generic.List[object]]::new()
function Test-Case($Name, $Body) {
  try { & $Body; $cases.Add(@{ name = $Name; passed = $true }) }
  catch { $cases.Add(@{ name = $Name; passed = $false }) }
}
function Assert-Equal($Actual, $Expected) {
  if ($Actual -cne $Expected) { throw 'Assertion mismatch.' }
}
function Assert-Unavailable($Snapshot) {
  Assert-Equal $Snapshot.status 'unavailable'
  Assert-Equal $Snapshot.reason 'element-not-available'
  Assert-Equal $Snapshot.nodes.Count 0
  Assert-Equal (($Snapshot | ConvertTo-Json -Depth 5) -match 'private|partial') $false
}
function Assert-Rethrows([scriptblock]$ReadNodes) {
  $rejected = $false
  try { $null = Invoke-PdfTreeDiagnosticCapture $ReadNodes }
  catch { $rejected = $true }
  Assert-Equal $rejected $true
}

Test-Case 'successful capture retains sanitized nodes' {
  $result = Invoke-PdfTreeDiagnosticCapture { @{ id = 'CommandButton_6'; enabled = $true } }
  Assert-Equal $result.status 'available'
  Assert-Equal $result.reason $null
  Assert-Equal $result.nodes.Count 1
  Assert-Equal $result.nodes[0].id 'CommandButton_6'
}
Test-Case 'empty dialog roots are available and do not enumerate desktop' {
  $result = Read-PdfDialogTree @()
  Assert-Equal $result.status 'available'
  Assert-Equal $result.nodes.Count 0
}
Test-Case 'typed stale element is unavailable without exception text' {
  Assert-Unavailable (Invoke-PdfTreeDiagnosticCapture {
    throw [System.Windows.Automation.ElementNotAvailableException]::new('C:\private\fixture.pdf')
  })
}
Test-Case 'wrapped typed stale element is unavailable' {
  Assert-Unavailable (Invoke-PdfTreeDiagnosticCapture {
    throw [System.Reflection.TargetInvocationException]::new('private',
      [System.Windows.Automation.ElementNotAvailableException]::new('private'))
  })
}
Test-Case 'partial output is discarded after typed stale element' {
  Assert-Unavailable (Invoke-PdfTreeDiagnosticCapture {
    @{ id = 'partial' }
    throw [System.Windows.Automation.ElementNotAvailableException]::new('private')
  })
}
Test-Case 'matching message without matching exception type still fails' {
  Assert-Rethrows { throw [InvalidOperationException]::new('ElementNotAvailableException: Unrecognized error.') }
}
Test-Case 'unknown exception still fails' {
  Assert-Rethrows { throw [Exception]::new('private') }
}
Test-Case 'missing callback fails rather than producing an empty success' {
  Assert-Rethrows $null
}
Test-Case 'exception unwrap depth is bounded and fails closed' {
  Assert-Rethrows {
    $nested = [System.Windows.Automation.ElementNotAvailableException]::new('private')
    for ($i = 0; $i -lt 10; $i++) { $nested = [Exception]::new('private', $nested) }
    throw $nested
  }
}
Test-Case 'metadata tokens redact paths and unbounded text' {
  foreach ($value in @('C:\private\fixture.pdf', '/private/fixture.pdf', 'document text', ('a' * 81))) {
    Assert-Equal (Get-PdfDiagnosticToken $value) 'redacted'
  }
  Assert-Equal (Get-PdfDiagnosticToken '#32770') '#32770'
  Assert-Equal (Get-PdfDiagnosticToken 'CommandButton_6') 'CommandButton_6'
}

$passed = @($cases | Where-Object { $_.passed }).Count
@{ schemaVersion = 1; kind = 'synthetic-diagnostic-exceptions'; productTested = $false;
   passed = $passed; total = $cases.Count; cases = @($cases.ToArray()) } |
  ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
Write-Output "Tree diagnostic assertions: $passed/$($cases.Count)"
if ($passed -ne $cases.Count) { exit 1 }
exit 0
