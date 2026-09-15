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
try {
  $env:GITHUB_OUTPUT = Join-Path $temporary 'parent-output.txt'
  Set-Content -LiteralPath $env:GITHUB_OUTPUT -Value 'parent-output-must-not-change'
  $inputPath = Join-Path $temporary 'input with spaces.json'
  New-AcceptanceTestCase | ConvertTo-Json -Depth 40 | Set-Content -LiteralPath $inputPath -Encoding UTF8
  & node (Join-Path $PSScriptRoot 'fixtures\windows-installer-replay.mjs') $inputPath (Join-Path $temporary 'replay with spaces')
  if ($LASTEXITCODE -ne 0) { throw 'windows-replay-regression-failed' }
  $status = 'passed'
} finally {
  $env:GITHUB_OUTPUT = $savedOutput
  if ($EvidencePath) {
    [ordered]@{ schemaVersion = 1; status = $status; installedProductAcceptance = 'unverified' } |
      ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
  }
  Remove-Item -LiteralPath $temporary -Recurse -Force
}
exit 0
