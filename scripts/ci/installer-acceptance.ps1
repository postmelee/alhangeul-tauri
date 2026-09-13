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
if ([IO.Path]::GetFullPath($InputPath) -ieq [IO.Path]::GetFullPath($resultPath)) { throw 'evaluation-input-output-collision' }
# Invalidate any stale result before reading input or invoking a child process.
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultPath -Encoding UTF8
try {
  $encoded = @(& node $bridge read $InputPath)
  if ($LASTEXITCODE -ne 0) { throw 'evaluation-input-invalid' }
  $prepared = ($encoded -join "`n") | ConvertFrom-Json
  $result.inputSha256 = $prepared.sha256
  $result.verdict = Get-InstallerAcceptance $prepared.input
  if ($result.verdict.contractStatus -ceq 'passed') { $result.status = 'passed' }
} catch {
  # Do not echo input values, paths or exception messages into CI summaries.
  $result.status = 'failed'
} finally {
  $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $resultPath -Encoding UTF8
}
& node $bridge report $resultPath
if ($LASTEXITCODE -ne 0 -or $result.status -cne 'passed') { exit 1 }
exit 0
