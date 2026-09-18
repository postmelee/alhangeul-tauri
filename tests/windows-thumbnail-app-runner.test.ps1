# Pure runner boundary tests: fake registry and process; no installed app or registry writes.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-app-smoke.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Open-AppDiagnosticDisplayKey { $script:opened++; if ($script:mode -eq 'missing-key') { return $null }; return $script:key }
function New-AppDiagnosticProcess { return $script:process }
function Get-AppDiagnosticEvidence($Suite) { return @() }
function Assert-AppDiagnostic($Suite, $Inventory, $Kind, $Version, $LegacyProbes) {
  if ($script:mode -eq 'assessment') { throw 'private assessment exception' }
  return @([ordered]@{ extension = '.hwp'; finding = 'thumbnail-api-ok' })
}
function New-FakeTask {
  $task = [pscustomobject]@{ Result = ''; Status = 'RanToCompletion' }
  $task | Add-Member ScriptMethod Wait { param($Timeout) return $script:mode -ne 'drain' }
  return $task
}
function Reset-Fakes($Present, $Value) {
  $script:opened = 0
  $script:key = [pscustomobject]@{ Present = $Present; Value = $Value; Writes = 0; Disposed = $false; Kind = [Microsoft.Win32.RegistryValueKind]::DWord }
  $script:key | Add-Member ScriptMethod GetValueNames { if ($this.Present) { return @('IconsOnly') }; return @() }
  $script:key | Add-Member ScriptMethod GetValueKind { param($Name) return $this.Kind }
  $script:key | Add-Member ScriptMethod GetValue { param($Name) return $this.Value }
  $script:key | Add-Member ScriptMethod SetValue {
    param($Name, $Value, $Kind)
    Assert-Condition ($Name -ceq 'IconsOnly') 'Unexpected registry target.'
    $this.Writes++
    if ($script:mode -eq 'restore' -and $this.Writes -gt 1) { throw 'private restore exception' }
    $this.Present = $true; $this.Value = $Value; $this.Kind = $Kind
    if ($script:mode -eq 'prepare' -and $this.Writes -eq 1) { throw 'private prepare exception after write' }
    if ($script:mode -eq 'readback' -and $this.Writes -eq 1) { $this.Value = 1 }
  }
  $script:key | Add-Member ScriptMethod DeleteValue { param($Name, $Missing) $this.Present = $false; $this.Value = $null }
  $script:key | Add-Member ScriptMethod Dispose { $this.Disposed = $true }
  $script:stdout = New-FakeTask; $script:stderr = New-FakeTask
  $reader = [pscustomobject]@{}
  $reader | Add-Member ScriptMethod ReadToEndAsync { return $script:stdout }
  $errorReader = [pscustomobject]@{}
  $errorReader | Add-Member ScriptMethod ReadToEndAsync { return $script:stderr }
  $writer = [pscustomobject]@{}
  $writer | Add-Member ScriptMethod Write {
    param($Text)
    if ($script:mode -eq 'write') { throw 'private input path' }
    Assert-Condition ($script:key.Value -eq 0) 'Display not prepared before app call.'
    $request = $Text | ConvertFrom-Json
    $reply = @{ schemaVersion = 1; requestId = $request.requestId; operation = 'suite'; result = @{ kind = 'suite'; value = @{ cleanup = $true } } }
    if ($script:mode -eq 'identity') { $reply.requestId = [Guid]::Empty.ToString() }
    $script:stdout.Result = $reply | ConvertTo-Json -Depth 8 -Compress
    if ($script:mode -eq 'parse') { $script:stdout.Result = 'private malformed reply' }
    if ($script:mode -eq 'empty') { $script:stdout.Result = '' }
    if ($script:mode -eq 'oversized') { $script:stdout.Result = 'x' * 262145 }
    if ($script:mode -eq 'stderr') { $script:stderr.Result = 'private stderr path' }
  }
  $writer | Add-Member ScriptMethod Close {}
  $script:process = [pscustomobject]@{ StartInfo = $null; StandardOutput = $reader; StandardError = $errorReader; StandardInput = $writer; HasExited = $false; ExitCode = 0; Killed = $false; Disposed = $false }
  $script:process | Add-Member ScriptMethod Start {
    Assert-Condition ([Console]::InputEncoding.CodePage -eq 65001 -and [Console]::InputEncoding.GetPreamble().Length -eq 0) 'Process started without BOM-less UTF-8.'
    if ($script:mode -eq 'start') { throw 'private executable path' }
    return $true
  }
  $script:process | Add-Member ScriptMethod WaitForExit {
    param($Timeout)
    if ($script:mode -in @('timeout', 'reap') -and -not $this.Killed) { return $false }
    $this.HasExited = $true
    if ($script:mode -eq 'exit') { $this.ExitCode = 23 }
    return $true
  }
  $script:process | Add-Member ScriptMethod Kill {
    if ($script:mode -eq 'reap') { throw 'private cleanup exception' }
    $this.Killed = $true; $this.HasExited = $true; $this.ExitCode = 137
  }
  $script:process | Add-Member ScriptMethod Dispose { $this.Disposed = $true }
}
$savedEnvironment = @($env:GITHUB_ACTIONS, $env:RUNNER_ENVIRONMENT, $env:RUNNER_OS)
$savedEncoding = [Console]::InputEncoding
$OutputDirectory = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-app-runner-test-' + [Guid]::NewGuid())
[void](New-Item -ItemType Directory -Path $OutputDirectory)
$reportPath = Join-Path $OutputDirectory 'app-diagnostic.json'
$result = @{ InstalledState = @{ Executable = 'fake.exe' }; Kind = 'msi'; Probes = @() }
$inventory = @{ sourceSha = ('a' * 40) }
$cases = @(
  @('ok', $true, 1, $null), @('ok', $true, 0, $null), @('ok', $false, $null, $null),
  @('start', $true, 1, 'process-start'), @('write', $true, 1, 'request-write'),
  @('timeout', $true, 1, 'process-wait'), @('drain', $true, 1, 'pipe-drain'),
  @('exit', $true, 1, 'transport-check'), @('empty', $true, 1, 'transport-check'),
  @('stderr', $true, 1, 'transport-check'), @('parse', $true, 1, 'reply-parse'),
  @('identity', $true, 1, 'reply-identity'), @('assessment', $true, 1, 'suite-assessment'),
  @('prepare', $true, 1, 'display-prepare'), @('readback', $true, 1, 'display-prepare'),
  @('restore', $true, 1, 'display-restore'), @('guard', $true, 1, 'display-guard'),
  @('type', $true, 1, 'display-read'), @('start', $false, $null, 'process-start'),
  @('missing-key', $false, $null, 'display-read'), @('oversized', $true, 1, 'transport-check'),
  @('reap', $true, 1, 'process-wait')
)
try {
  foreach ($case in $cases) {
    [Console]::InputEncoding = [Text.UTF8Encoding]::new($true)
    $script:mode = $case[0]; Reset-Fakes $case[1] $case[2]
    $env:GITHUB_ACTIONS = 'true'; $env:RUNNER_ENVIRONMENT = 'github-hosted'; $env:RUNNER_OS = 'Windows'
    if ($script:mode -eq 'guard') { $env:RUNNER_ENVIRONMENT = 'self-hosted' }
    if ($script:mode -eq 'type') { $script:key.Kind = [Microsoft.Win32.RegistryValueKind]::String }
    $failed = $false
    try { [void](Invoke-InstalledAppDiagnostic $result $inventory '0.1.0') } catch { $failed = $true }
    Assert-Condition ([Console]::InputEncoding.CodePage -eq 65001 -and [Console]::InputEncoding.GetPreamble().Length -eq 3) 'Original input encoding not restored.'
    $text = Get-Content -LiteralPath $reportPath -Raw
    $report = $text | ConvertFrom-Json
    Assert-Condition ($failed -eq ($null -ne $case[3]) -and $report.failureStage -ceq $case[3]) "Wrong failure stage: $($case[0]) / $($report.failureStage)"
    Assert-Condition ($text -notmatch 'private|fake.exe|stateToken') 'Raw private data leaked.'
    if ($script:mode -eq 'guard') { Assert-Condition ($script:opened -eq 0) 'Guard touched registry.' }
    elseif ($script:mode -eq 'missing-key') { Assert-Condition ($script:key.Writes -eq 0) 'Missing key was created.' }
    elseif ($script:mode -eq 'restore') { Assert-Condition ($report.display.restored -eq $false) 'Restore failure accepted.' }
    else { Assert-Condition ($script:key.Present -eq $case[1] -and $script:key.Value -eq $case[2] -and $script:key.Disposed) 'Original display state not restored.' }
    if ($script:mode -eq 'type') { Assert-Condition ($script:key.Writes -eq 0) 'Unexpected type was modified.' }
    if ($script:mode -eq 'exit') { Assert-Condition ($report.exitCode -eq 23) 'Exit code lost.' }
    if ($script:mode -eq 'assessment') { Assert-Condition ($report.assessmentFailure.code -ceq 'unclassified' -and $null -eq $report.assessmentFailure.extension) 'Unknown assessment exception was not sanitized.' }
    if ($script:mode -eq 'start') { Assert-Condition ($null -eq $report.cleanup -and $null -eq $report.exitCode) 'Unknown cleanup/exit claimed.' }
    if ($script:mode -eq 'timeout') { Assert-Condition ($script:process.Killed -and $report.processReaped) 'Owned timeout process not reclaimed.' }
    if ($script:mode -eq 'reap') { Assert-Condition ($report.processReaped -eq $false -and $report.display.restored -eq $true) 'Process cleanup failure hid display restoration.' }
  }
  Write-Output "App runner boundaries: $($cases.Count) cases passed; mocked process/registry, no Windows Shell acceptance."
} finally {
  [Console]::InputEncoding = $savedEncoding
  $env:GITHUB_ACTIONS = $savedEnvironment[0]; $env:RUNNER_ENVIRONMENT = $savedEnvironment[1]; $env:RUNNER_OS = $savedEnvironment[2]
  if (Test-Path -LiteralPath $reportPath) { Remove-Item -LiteralPath $reportPath }
  Remove-Item -LiteralPath $OutputDirectory
}
