param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '..\windows-installer-acceptance.ps1')

# Evaluates prepared evidence, not its provenance. Only the later independent
# metadata/download/read-back aggregate may promote this to io-verified.
$result = [ordered]@{
  schemaVersion = 1; policyVersion = 1; status = 'failed'; inputSha256 = $null
  provenanceStatus = 'requires-io-verification'; verdict = $null
}
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$resultPath = Join-Path $OutputDirectory 'installer-evaluation.json'
$bridge = Join-Path $PSScriptRoot 'installer-evaluation.mjs'
$env:ALHANGEUL_EVALUATION_DIAGNOSTIC = Join-Path $OutputDirectory 'installer-evaluation-io.json'
$driverPath = Join-Path $OutputDirectory 'installer-evaluation-driver.json'
$driver = [ordered]@{ schemaVersion = 1; phase = 'read'; status = 'failed'; nodeExitCode = $null }
foreach ($outputPath in @($resultPath, $driverPath, $env:ALHANGEUL_EVALUATION_DIAGNOSTIC)) {
  if ([IO.Path]::GetFullPath($InputPath) -ieq [IO.Path]::GetFullPath($outputPath)) { throw 'evaluation-input-output-collision' }
}
# Invalidate any stale result before reading input or invoking a child process.
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultPath -Encoding UTF8
[ordered]@{ schemaVersion = 1; phase = 'read'; status = 'unverified'; code = 'not-started' } |
  ConvertTo-Json | Set-Content -LiteralPath $env:ALHANGEUL_EVALUATION_DIAGNOSTIC -Encoding UTF8
try {
  $encoded = @(& node $bridge read $InputPath)
  $driver.nodeExitCode = $LASTEXITCODE
  if ($LASTEXITCODE -ne 0) { throw 'evaluation-input-invalid' }
  $driver.phase = 'decode'
  $prepared = ($encoded -join "`n") | ConvertFrom-Json
  $result.inputSha256 = $prepared.sha256
  $driver.phase = 'evaluate'
  $result.verdict = Get-InstallerAcceptance $prepared.input
  if ($result.verdict.contractStatus -ceq 'passed') { $result.status = 'passed' }
} catch {
  # Do not echo input values, paths or exception messages into CI summaries.
  $result.status = 'failed'
} finally {
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultPath -Encoding UTF8
  $driver | ConvertTo-Json | Set-Content -LiteralPath $driverPath -Encoding UTF8
}
if ($null -eq $result.verdict) { exit 1 }
try {
  $driver.phase = 'report'; $driver.nodeExitCode = $null
  & node $bridge report $resultPath
  $driver.nodeExitCode = $LASTEXITCODE
  if ($LASTEXITCODE -eq 0 -and $result.status -ceq 'passed') { $driver.status = 'passed' }
} catch { $driver.status = 'failed' } finally {
  $driver | ConvertTo-Json | Set-Content -LiteralPath $driverPath -Encoding UTF8
}
if ($driver.status -cne 'passed') { exit 1 }
exit 0
