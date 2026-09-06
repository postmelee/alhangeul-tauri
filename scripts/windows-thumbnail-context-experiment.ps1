[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$ArtifactRoot,
  [Parameter(Mandatory = $true)][string]$SupportRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][ValidatePattern('^[a-f0-9]{40}$')][string]$ExpectedSourceSha,
  [switch]$CIConsent
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-files.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-registry.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-evidence.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-process.ps1')
# Defense in depth, not authentication: only an explicitly approved disposable hosted job may invoke this.
Assert-Context ($CIConsent -and $env:GITHUB_ACTIONS -ceq 'true' -and $env:RUNNER_ENVIRONMENT -ceq 'github-hosted' -and $env:RUNNER_OS -ceq 'Windows' -and $env:ALHANGEUL_CONTEXT_EXPERIMENT -ceq 'approved') 'requires-disposable-ci-consent'
Assert-Context ([Environment]::OSVersion.Platform -eq 'Win32NT' -and [Environment]::Is64BitProcess) 'requires-windows-x64'
Add-Type -Path (Join-Path $PSScriptRoot 'windows-thumbnail-context.cs')
$caller = [Alhangeul.ContextExperiment.Native]::Inspect($PID)
Assert-Context ($caller.status -eq 'ok' -and $caller.elevated -and $caller.integrityRid -ge 12288) 'requires-elevated-ci'
$sha = git -C (Join-Path $PSScriptRoot '..') rev-parse HEAD
Assert-Context ($LASTEXITCODE -eq 0 -and $sha -ceq $ExpectedSourceSha -and $env:GITHUB_SHA -ceq $sha -and $env:GITHUB_WORKFLOW_SHA -ceq $sha) 'source-workflow-mismatch'
$ArtifactRoot = [IO.Path]::GetFullPath($ArtifactRoot); $SupportRoot = [IO.Path]::GetFullPath($SupportRoot)
$OutputDirectory = [IO.Path]::GetFullPath($OutputDirectory)
Assert-Context (-not (Test-Path -LiteralPath $OutputDirectory)) 'output-exists'
Assert-ContextLocalPath ([IO.Path]::GetDirectoryName($OutputDirectory))
[void][IO.Directory]::CreateDirectory($OutputDirectory)
$summary = [ordered]@{ schemaVersion = 1; experimentOnly = $true; productAcceptance = 'not-established'; status = 'invalid'; operation = 'preflight'; error = $null; errorCode = $null; cleanupError = $null; sourceSha = $sha; runId = $env:GITHUB_RUN_ID; runAttempt = $env:GITHUB_RUN_ATTEMPT; imageVersion = $env:ImageVersion; caller = $caller; installExit = $null; uninstallExit = $null; reference = $null; limited = $null; phases = @(); registryRestored = $false; associationsRestored = $false; cleanup = $false }
$bundle = $null; $protected = $null; $requestRoot = $null; $installed = $false; $installedClass = $null
$pathJournal = New-ContextJournal; $machineJournal = New-ContextJournal
$installRoot = Join-Path $env:LOCALAPPDATA 'Alhangeul'
$originalDll = Join-Path $installRoot 'AlhangeulThumbnailHandler.dll'
$baselineAssociations = $null; $installedAssociations = $null
try {
  Assert-ContextEmptyInstall
  $baselineAssociations = Get-ContextAssociations
  $summary.operation = 'verify-bundle'
  $bundle = Read-ContextBundle $ArtifactRoot $SupportRoot $sha
  $summary.reference = @($bundle.records.Values | ForEach-Object { [ordered]@{ kind = $_.kind; bytes = $_.size; sha256 = $_.sha256 } } | Sort-Object kind)
  [void](Get-ContextFixtures)
  $requestRoot = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-context-requests-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($requestRoot)
  # Mark ownership before launch so a partial installation also enters cleanup.
  $installed = $true
  $summary.operation = 'install'
  $summary.installExit = Invoke-ContextProcess $bundle.paths['nsis'] '/S' 300
  Assert-Context ($summary.installExit -eq 0) 'install-failed'
  Assert-ContextFile $originalDll $bundle.records['thumbnail-handler']
  Assert-ContextFile (Join-Path $installRoot 'AlhangeulThumbnailWorker.exe') $bundle.records['thumbnail-worker']
  Assert-Context ($null -eq (Get-ContextClass 'LocalMachine')) 'machine-class-after-nsis'
  $installedClass = Get-ContextClass 'CurrentUser'
  $installedAssociations = Get-ContextAssociations
  $initial = Invoke-ContextPhase 'c0-initial' $originalDll
  Assert-Context ((Get-ContextFinding $initial) -ceq 'shell-class-not-registered') 'baseline-not-reproduced'
  $summary.limited = Get-ContextLimitedAvailability
  if ($summary.limited.status -eq 'available') {
    # A launch failure is unavailable, but a started phase with bad evidence is a failed experiment.
    [void](Invoke-ContextPhase 'c1-limited' $originalDll $true)
    [void](Invoke-ContextPhase 'c0-after-context' $originalDll)
  }
  $summary.operation = 'protected-copy'
  $protected = New-ContextProtectedDirectory
  Copy-ContextPayload $bundle $protected
  $protectedDll = Join-Path $protected 'AlhangeulThumbnailHandler.dll'
  Set-ContextUserPath $pathJournal $originalDll $protectedDll
  [void](Invoke-ContextPhase 'c2-protected-path' $protectedDll)
  $summary.operation = 'machine-overlay'
  Assert-ContextFile $protectedDll $bundle.records['thumbnail-handler']
  Assert-ContextFile (Join-Path $protected 'AlhangeulThumbnailWorker.exe') $bundle.records['thumbnail-worker']
  Add-ContextMachineClass $machineJournal $protectedDll
  [void](Invoke-ContextPhase 'c3-machine-visible' $protectedDll)
  Restore-ContextJournal $machineJournal
  Assert-Context ($null -eq (Get-ContextClass 'LocalMachine')) 'machine-class-residual'
  [void](Invoke-ContextPhase 'c2-after-machine-restore' $protectedDll)
  Restore-ContextJournal $pathJournal
  Assert-Context (Test-ContextEqual $installedClass (Get-ContextClass 'CurrentUser')) 'user-class-restore-mismatch'
  [void](Invoke-ContextPhase 'c0-final' $originalDll)
  $summary.status = 'observed'
  $summary.operation = 'comparison-complete'
} catch {
  $allowed = @('baseline-not-reproduced', 'install-failed', 'registry-restore-conflict', 'association-mutation', 'phase-process-failed')
  $summary.error = if ($_.Exception.Message -in $allowed) { $_.Exception.Message } else { 'experiment-invalid' }
  $summary.errorCode = $_.Exception.HResult
} finally {
  $summary['cleanupOperation'] = 'restore-registry'
  try {
    if (-not $machineJournal.restored) { Restore-ContextJournal $machineJournal }
    if (-not $pathJournal.restored) { Restore-ContextJournal $pathJournal }
    Assert-Context ($null -eq (Get-ContextClass 'LocalMachine')) 'machine-class-residual'
    if ($installed -and -not $installedClass) { Assert-Context ($null -eq (Get-ContextClass 'CurrentUser')) 'partial-install-ownership-unknown' }
    if ($installedClass) { Assert-Context (Test-ContextEqual $installedClass (Get-ContextClass 'CurrentUser')) 'user-class-restore-mismatch' }
    if ($installedAssociations) { Assert-Context (Test-ContextEqual $installedAssociations (Get-ContextAssociations)) 'association-mutation' }
    $summary.registryRestored = $true
    # Never run a product uninstaller over a detected third-party class/association change.
    if ($installed) {
      $summary.cleanupOperation = 'uninstall'
      $uninstaller = Join-Path $installRoot 'uninstall.exe'
      Assert-ContextLocalPath $uninstaller
      $summary.uninstallExit = Invoke-ContextProcess $uninstaller '/S' 300
      Assert-Context ($summary.uninstallExit -eq 0) 'uninstall-failed'
      # NSIS may return before its self-copy has removed the directory; bounded observation only.
      for ($i = 0; $i -lt 30 -and (Test-Path -LiteralPath $installRoot); $i++) { Start-Sleep -Milliseconds 1000 }
      $summary.cleanupOperation = 'verify-uninstall'
      Assert-ContextEmptyInstall
    }
    $summary.cleanupOperation = 'verify-associations'
    if ($baselineAssociations) { Assert-Context (Test-ContextEqual $baselineAssociations (Get-ContextAssociations)) 'association-restore-mismatch' }
    $summary.associationsRestored = $true
    $summary.cleanupOperation = 'remove-protected-copy'
    if ($protected) { Remove-ContextPayload $protected $bundle }
    $summary.cleanupOperation = 'remove-requests'
    if ($requestRoot) { [IO.Directory]::Delete($requestRoot, $false) }
    $summary.cleanup = $true
    $summary.cleanupOperation = 'complete'
  } catch { $summary.status = 'invalid'; $summary.cleanupError = 'cleanup-failed'; $summary['cleanupErrorCode'] = $_.Exception.HResult }
  Write-ContextJson (Join-Path $OutputDirectory 'experiment.json') $summary
}
if ($summary.status -ne 'observed' -or -not $summary.cleanup) { exit 2 }
# This is an experimental observation gate, never NSIS product acceptance.
exit 0
