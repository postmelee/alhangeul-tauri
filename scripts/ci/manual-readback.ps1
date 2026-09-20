param([string]$SupportRoot, [string]$SummaryRoot)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$record = [ordered]@{ schemaVersion = 1; status = 'failed'; code = 'manual-readback-exception'; sites = @() }
try {
  if (-not $SupportRoot -or -not $SummaryRoot) { throw 'missing-readback-input' }
  $global:LASTEXITCODE = 0
  & (Join-Path $PSScriptRoot '..\windows-thumbnail-check-tests.ps1') -SupportRoot $SupportRoot -SummaryRoot $SummaryRoot | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'manual-readback-nonzero' }
  $record.status = 'passed'; $record.code = 'manual-readback-passed'
} catch {
  # Only exact repository-owned messages; never emit arbitrary exception text.
  $codes = @{
    'missing-readback-input' = 'missing-readback-input'
    'manual-readback-nonzero' = 'manual-readback-nonzero'
    'input-invalid' = 'input-invalid'
    'input-nonlocal' = 'input-nonlocal'
    'input-reparse' = 'input-reparse'
    'package-invalid' = 'package-invalid'
    'support source SHA mismatch' = 'support-source-mismatch'
    'support payload differs from checkout/bundle' = 'support-payload-mismatch'
    'manual raw mismatch' = 'manual-raw-mismatch'
    'manual assessment mismatch' = 'manual-assessment-mismatch'
    'manual probes missing' = 'manual-probes-missing'
  }
  if ($codes.ContainsKey($_.Exception.Message)) { $record.code = $codes[$_.Exception.Message] }
  foreach ($frame in ($_.ScriptStackTrace -split '\r?\n')) {
    if ($frame -match ', .*[/\\](windows-thumbnail-check(?:-tests|-support|-assessment)?\.ps1): line ([0-9]+)$') {
      if ($record.sites.Count -lt 8) { $record.sites += @{ file = $Matches[1]; line = [int]$Matches[2] } }
    }
  }
}
Write-Output ('ALHANGEUL_READBACK_DIAGNOSTIC=' + (ConvertTo-Json $record -Depth 4 -Compress))
if ($record.status -ceq 'passed') { exit 0 }
exit 1
