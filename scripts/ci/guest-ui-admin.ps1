# Only the new isolated guest's protected task executes these fixed operations.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = 'C:\AlhProbe'
$results = Join-Path $root 'admin-results'
$taskName = 'AlhGuestInstaller'
if ($env:COMPUTERNAME -cne 'ALH-GUEST' -or [Security.Principal.WindowsIdentity]::GetCurrent().User.Value -cne 'S-1-5-18') { throw 'isolated-system-task-required' }
. (Join-Path $PSScriptRoot 'guest-ui-process.ps1')
$inputData = Get-Content (Join-Path $root 'input.json') -Raw | ConvertFrom-Json
if ($inputData.scenario -cnotin @('nsis', 'msi', 'nsis-upgrade', 'msi-upgrade')) { throw 'fixed-privileged-scenario-required' }
. (Join-Path $PSScriptRoot 'guest-ui-prerequisites.ps1')
. (Join-Path $PSScriptRoot 'guest-ui-process-trace.ps1')
$trace = $null
$operations = @()
if ($inputData.prerequisites.Count -gt 0) { $operations += 'prerequisites' }
if ($inputData.scenario -eq 'msi-upgrade') { $operations += 'baseline' }
if ($inputData.scenario -in @('msi', 'msi-upgrade')) { $operations += @('install', 'reinstall', 'uninstall') }
if ($inputData.scenario -eq 'nsis-upgrade') { $operations += 'trace-stop' }
$installer = Join-Path $root 'installer.msi'
try {
  foreach ($operation in $operations) {
    $request = Join-Path $root ('requests\' + $operation + '.request')
    $deadline = [DateTime]::UtcNow.AddMinutes(12)
    while (-not (Test-Path -LiteralPath $request)) {
      if ([DateTime]::UtcNow -gt $deadline) { throw 'admin-request-timeout' }
      Start-Sleep -Seconds 1
    }
    $result = [ordered]@{ operation = $operation; status = 'failed'; exitCode = $null; system = $true; installerSha256 = $inputData.installerSha256 }
    try {
      if ($operation -eq 'prerequisites') {
        $result['packages'] = @(Install-GuestPrerequisites)
        if ($inputData.scenario -eq 'nsis-upgrade') { $trace = Start-GuestProcessTrace $results; $result['processTraceStarted'] = $true }
        $result.exitCode = 0
      } elseif ($operation -eq 'trace-stop') {
        $result['events'] = @(Read-GuestProcessTrace $trace)
        Clear-GuestProcessTrace $trace
        $result['traceMethod'] = 'ETW-perf'
        $result['sessionRemoved'] = -not $trace.active
        $result['rawTraceRemoved'] = -not (Test-Path -LiteralPath $trace.file)
        $result.exitCode = 0
      } else {
      $installer = Join-Path $root $(if ($operation -eq 'baseline') { 'baseline.msi' } else { 'installer.msi' })
      $expectedHash = if ($operation -eq 'baseline') { $inputData.baseline.installerSha256 } else { $inputData.installerSha256 }
      if ((Get-FileHash $installer -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedHash) { throw 'admin-installer-hash-mismatch' }
      $result['executedInstallerSha256'] = $expectedHash
      $mode = if ($operation -eq 'uninstall') { '/x' } else { '/i' }
      $arguments = $mode + ' "' + $installer + '" /qn /norestart /L*v "' + (Join-Path $results ($operation + '.log')) + '"'
      if ($operation -eq 'reinstall') { $arguments += ' REINSTALL=ALL REINSTALLMODE=omus' }
      $result.exitCode = Run-Owned (Join-Path $env:SystemRoot 'System32\msiexec.exe') $arguments 300
      }
      $result.status = 'observed'
    } catch { $result['failure'] = $_.Exception.Message }
    $pending = Join-Path $results ($operation + '.pending')
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $pending -Encoding UTF8
    Move-Item -LiteralPath $pending -Destination (Join-Path $results ($operation + '.json'))
  }
} finally {
  Clear-GuestProcessTrace $trace
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
}
