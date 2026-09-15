param([string]$EvidencePath)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $root 'scripts\windows-installer-acceptance.ps1')
. (Join-Path $root 'scripts\windows-installer-acceptance-test-fixtures.ps1')
$temporary = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-replay-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporary | Out-Null
$savedOutput = $env:GITHUB_OUTPUT
$status = 'failed'
$childEvidence = Join-Path $temporary 'child-diagnostic.json'
try {
  $env:GITHUB_OUTPUT = Join-Path $temporary 'parent-output.txt'
  Set-Content -LiteralPath $env:GITHUB_OUTPUT -Value 'parent-output-must-not-change'
  $inputPath = Join-Path $temporary 'input with spaces.json'
  New-AcceptanceTestCase | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $inputPath -Encoding UTF8
  & node (Join-Path $PSScriptRoot 'fixtures\windows-installer-replay.mjs') $inputPath (Join-Path $temporary 'replay with spaces') $childEvidence
  if ($LASTEXITCODE -ne 0) { throw 'windows-replay-regression-failed' }
  $record = Get-Content -LiteralPath $childEvidence -Raw | ConvertFrom-Json
  if ($record.status -cne 'passed' -or $record.phase -cne 'completed') { throw 'missing-success-evidence' }
  # Prove a later assertion failure still preserves the last safe child diagnostic.
  New-AcceptanceTestCase | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $inputPath -Encoding UTF8
  $negativeEvidence = Join-Path $temporary 'expected-failure-diagnostic.json'
  Write-Output 'Expected negative: fail after readback assertions to verify diagnostic preservation.'
  & node (Join-Path $PSScriptRoot 'fixtures\windows-installer-replay.mjs') $inputPath (Join-Path $temporary 'negative replay') $negativeEvidence 'failure-evidence'
  if ($LASTEXITCODE -ne 1) { throw 'expected-preservation-failure-missing' }
  $negative = Get-Content -LiteralPath $negativeEvidence -Raw | ConvertFrom-Json
  if ($negative.status -cne 'failed' -or $negative.phase -cne 'completed' -or $negative.child.exitCode -ne 1) { throw 'failure-diagnostic-not-preserved' }
  $status = 'passed'
} finally {
  try {
    $env:GITHUB_OUTPUT = $savedOutput
    if ($EvidencePath) {
      [ordered]@{ schemaVersion = 1; status = $status; installedProductAcceptance = 'unverified' } |
        ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
      if (Test-Path -LiteralPath $childEvidence -PathType Leaf) {
        Copy-Item -LiteralPath $childEvidence -Destination "$EvidencePath.child.json"
      }
      $negativePath = Join-Path $temporary 'expected-failure-diagnostic.json'
      if (Test-Path -LiteralPath $negativePath -PathType Leaf) {
        Copy-Item -LiteralPath $negativePath -Destination "$EvidencePath.expected-failure.json"
      }
    }
  } finally {
    Remove-Item -LiteralPath $temporary -Recurse -Force
  }
}
exit 0
