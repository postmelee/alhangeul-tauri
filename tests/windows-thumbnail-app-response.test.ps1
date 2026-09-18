param([string]$EvidencePath = '')
# Full JSON response through the real transport, assessment and report writer.
# Only process/registry IO is synthetic; Windows 5.1 supplies JSON numeric types.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-assessment.ps1')
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-app-smoke.ps1')
. (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-app-suite.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }

function Open-AppDiagnosticDisplayKey {
  $key = [pscustomobject]@{ Value = 1; Disposed = $false }
  $key | Add-Member ScriptMethod GetValueNames { return @('IconsOnly') }
  $key | Add-Member ScriptMethod GetValueKind { param($Name) return [Microsoft.Win32.RegistryValueKind]::DWord }
  $key | Add-Member ScriptMethod GetValue { param($Name) return $this.Value }
  $key | Add-Member ScriptMethod SetValue { param($Name, $Value, $Kind) $this.Value = $Value }
  $key | Add-Member ScriptMethod Dispose { $this.Disposed = $true }
  $script:key = $key
  return $key
}
function New-ResponseTask($Value) {
  $task = [pscustomobject]@{ Result = $Value; Status = 'RanToCompletion' }
  $task | Add-Member ScriptMethod Wait { param($Timeout) return $true }
  return $task
}
function New-AppDiagnosticProcess {
  $script:stdout = New-ResponseTask ''; $script:stderr = New-ResponseTask ''
  $reader = [pscustomobject]@{}; $errorReader = [pscustomobject]@{}; $writer = [pscustomobject]@{}
  $reader | Add-Member ScriptMethod ReadToEndAsync { return $script:stdout }
  $errorReader | Add-Member ScriptMethod ReadToEndAsync { return $script:stderr }
  $writer | Add-Member ScriptMethod Write {
    param($Text)
    $request = $Text | ConvertFrom-Json
    $reply = @{ schemaVersion = 1; requestId = $request.requestId; operation = 'suite'; result = @{ kind = 'suite'; value = $script:suite } }
    $script:stdout.Result = $reply | ConvertTo-Json -Depth 32 -Compress
  }
  $writer | Add-Member ScriptMethod Close {}
  $process = [pscustomobject]@{ StartInfo = $null; StandardInput = $writer; StandardOutput = $reader; StandardError = $errorReader; HasExited = $true; ExitCode = 0; Disposed = $false }
  $process | Add-Member ScriptMethod Start { return $true }
  $process | Add-Member ScriptMethod WaitForExit { param($Timeout) return $true }
  $process | Add-Member ScriptMethod Dispose { $this.Disposed = $true }
  return $process
}

$cases = @(
  @('msi-ok', 'msi', $false, $null, { param($c) }),
  @('nsis-ok', 'nsis', $false, $null, { param($c) }),
  @('nsis-limited', 'nsis', $true, $null, { param($c) }),
  @('suite', 'msi', $false, 'suite-completion', { param($c) $c.suite.status = 'failed' }),
  @('cleanup', 'msi', $false, 'suite-completion', { param($c) $c.suite.cleanup = $false }),
  @('source', 'msi', $false, 'reference-identity', { param($c) $c.suite.inspection.buildReference.sourceSha = 'private-source' }),
  @('missing-reference', 'msi', $false, 'reference-identity', { param($c) $c.suite.inspection.PSObject.Properties.Remove('buildReference') }),
  @('install', 'msi', $false, 'installation-identity', { param($c) $c.suite.inspection.installKind = 'nsis' }),
  @('shape', 'msi', $false, 'reference-registration-shape', { param($c) $c.suite.inspection.buildReference.files = @() }),
  @('binary', 'msi', $false, 'binary-reference', { param($c) $c.suite.inspection.buildReference.files[0].sha256 = ('d' * 64) }),
  @('preflight', 'msi', $false, 'registration-preflight', { param($c) $c.suite.inspection.registration[0].ready = $false }),
  @('formats', 'msi', $false, 'format-count', { param($c) $c.suite.formats = @($c.suite.formats[0]) }),
  @('duplicate', 'msi', $false, 'format-identity', { param($c) $c.suite.formats[1].input.extension = '.hwp' }),
  @('integrity', 'msi', $false, 'format-integrity', { param($c) $c.suite.formats[0].input.integrity = $false }),
  @('format-registration', 'msi', $false, 'format-registration', { param($c) $c.suite.formats[0].input.registration.scope = 'unknown' }),
  @('probes', 'msi', $false, 'independent-assessment', { param($c) $c.suite.formats[0].input.probes = @() }),
  @('reported', 'msi', $false, 'reported-assessment', { param($c) $c.suite.formats[0].assessment.thumbnailPassed = $false }),
  @('initial', 'msi', $false, 'initial-observation', { param($c) $c.legacy = @() }),
  @('parity', 'msi', $false, 'fixture-parity', { param($c) $c.legacy[0].Result.status = 'failed'; $c.legacy[0].Result.hresult = '0x80040154' }),
  @('hwpx', 'msi', $false, 'format-integrity', { param($c) $c.suite.formats[1].input.registrationStable = $false })
)
$savedEnvironment = @($env:GITHUB_ACTIONS, $env:RUNNER_ENVIRONMENT, $env:RUNNER_OS)
$OutputDirectory = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-app-response-test-' + [Guid]::NewGuid())
$reportPath = Join-Path $OutputDirectory 'app-diagnostic.json'
$evidence = [ordered]@{ schemaVersion = 1; status = 'failed'; synthetic = $true; cases = @() }
try {
  [void](New-Item -ItemType Directory -Path $OutputDirectory)
  $env:GITHUB_ACTIONS = 'true'; $env:RUNNER_ENVIRONMENT = 'github-hosted'; $env:RUNNER_OS = 'Windows'
  foreach ($entry in $cases) {
    # Roundtrip separates shared fixture references exactly as a native JSON reply does.
    $case = Copy-Case (New-AppSuiteCase $entry[1] $entry[2])
    & $entry[4] $case
    $script:suite = $case.suite
    $suite.inspection | Add-Member stateToken 'private-state-token'
    $result = @{ InstalledState = @{ Executable = 'private-executable' }; Kind = $entry[1]; Probes = $case.legacy }
    $failed = $false
    try { [void](Invoke-InstalledAppDiagnostic $result $inventory '0.1.0') } catch { $failed = $true }
    $text = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8
    $report = $text | ConvertFrom-Json
    $actual = if ($null -eq $report.assessmentFailure) { $null } else { $report.assessmentFailure.code }
    $evidence.cases += [ordered]@{ name = $entry[0]; status = $report.status; expectedCode = $entry[3]; actualCode = $actual }
    Assert-Condition ($failed -eq ($null -ne $entry[3]) -and $actual -ceq $entry[3]) "Full response mismatch: $($entry[0]) / $actual"
    Assert-Condition ($report.processReaped -eq $true -and $report.exitCode -eq 0 -and $report.display.restored -eq $true -and $script:key.Value -eq 1 -and $script:key.Disposed) 'Response path did not preserve cleanup.'
    Assert-Condition ($text -notmatch 'private|stateToken|Exception') 'Raw response leaked into report.'
    if ($entry[3]) { Assert-Condition ($report.failureStage -ceq 'suite-assessment') 'Wrong rejection stage.' }
    else { Assert-Condition ($report.status -ceq 'passed' -and $report.formats.Count -eq 2 -and $report.probes.Count -eq 2 -and $report.probes[0].probes.Count -eq 10) 'Full positive report incomplete.' }
    if ($entry[0] -ceq 'hwpx') { Assert-Condition ($report.assessmentFailure.extension -ceq '.hwpx') 'Failed format identity lost.' }
  }
  $evidence.status = 'passed'
  Write-Output "App full response: $($cases.Count) JSON/assessment/report cases passed; synthetic process/registry only."
} finally {
  $env:GITHUB_ACTIONS = $savedEnvironment[0]; $env:RUNNER_ENVIRONMENT = $savedEnvironment[1]; $env:RUNNER_OS = $savedEnvironment[2]
  if (Test-Path -LiteralPath $reportPath) { Remove-Item -LiteralPath $reportPath }
  if (Test-Path -LiteralPath $OutputDirectory) { Remove-Item -LiteralPath $OutputDirectory }
  if ($EvidencePath) { $evidence | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
}
