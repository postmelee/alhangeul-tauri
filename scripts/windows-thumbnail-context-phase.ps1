[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$RequestPath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-files.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-context-registry.ps1')
Add-Type -Path (Join-Path $PSScriptRoot 'windows-thumbnail-context.cs')

function Get-ContextProcesses {
  $records = @()
  foreach ($process in @(Get-Process -Name 'explorer', 'dllhost', 'AlhangeulThumbnailWorker' -ErrorAction SilentlyContinue)) {
    try {
      $loaded = $null; $moduleStatus = 'unreadable'
      try { $loaded = @($process.Modules | Where-Object { $_.ModuleName -ieq 'AlhangeulThumbnailHandler.dll' }).Count -gt 0; $moduleStatus = 'observed' } catch { }
      $records += [ordered]@{ role = $process.ProcessName; pid = $process.Id; context = [Alhangeul.ContextExperiment.Native]::Inspect($process.Id); moduleStatus = $moduleStatus; handlerLoaded = $loaded }
    } finally { $process.Dispose() }
  }
  return ,$records
}

function Invoke-ContextProbe($Label, $Mode, $InputValue) {
  $path = Join-Path $request.outputDirectory "$Label.json"
  & (Join-Path $PSScriptRoot 'windows-thumbnail-diagnostics.ps1') -Mode $Mode -InputPath $InputValue -OutputPath $path -Size 256 -TimeoutSeconds 30 | Out-Null
  $code = $LASTEXITCODE
  $probe = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Context ($probe.mode -ceq $Mode -and $probe.schemaVersion -eq 1) 'invalid-probe'
  if ($probe.status -in @('ok', 'collected')) { Assert-Context ($code -eq 0) 'probe-exit-mismatch' }
  else { Assert-Context ($code -eq 1 -and $probe.phase -in @('IShellItemImageFactory.GetImage', 'IThumbnailCache.GetThumbnail', 'CoCreateInstance.handler', 'AssocQueryStringW') -and $probe.hresult -match '^0x[89A-F][0-9A-F]{7}$') 'invalid-probe-failure' }
  $script:phaseResult.probes += [ordered]@{ label = $Label; result = $probe; exitCode = $code }
}

function Invoke-ContextDocumentProbe($Fixture, $Mode) {
  $source = Join-Path (Join-Path $PSScriptRoot '..') $Fixture.path
  $copy = Join-Path $scratch ($Fixture.id + '-' + $Mode + [IO.Path]::GetExtension($source))
  [IO.File]::Copy($source, $copy, $false)
  try {
    Assert-ContextFile $copy $Fixture
    Invoke-ContextProbe "$($Fixture.id)-$Mode" $Mode $copy
    Assert-ContextFile $copy $Fixture; Assert-ContextFile $source $Fixture
    $script:phaseResult.integrityChecks++
  } finally { [IO.File]::Delete($copy) }
}

$request = Get-Content -LiteralPath $RequestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$scratch = $null
$script:phaseResult = [ordered]@{ schemaVersion = 1; phase = $request.phase; status = 'invalid'; error = $null; errorCode = $null; context = $null; limited = $request.limited; processesBefore = @(); processesAfter = @(); probes = @(); integrityChecks = 0; cleanup = $false }
try {
  Assert-Context ([Environment]::Is64BitProcess -and [Threading.Thread]::CurrentThread.GetApartmentState() -eq 'STA') 'requires-x64-sta'
  $self = [Alhangeul.ContextExperiment.Native]::Inspect($PID)
  $parent = [Alhangeul.ContextExperiment.Native]::Inspect($request.parentId)
  Assert-Context ($self.status -eq 'ok' -and $parent.status -eq 'ok' -and $parent.sameUser -and $parent.session -eq $self.session) 'context-user-session-mismatch'
  if ($request.limited) { Assert-Context (-not $self.elevated -and $self.elevationType -eq 3 -and $self.integrityRid -eq 8192) 'not-limited-context' }
  else { Assert-Context ($self.elevated -and $self.integrityRid -eq $parent.integrityRid) 'caller-context-mismatch' }
  $script:phaseResult.context = $self
  # Same-user HKCU/profile visibility must be verified in the actual child before any document API.
  $base = Open-ContextHive 'CurrentUser'; $key = $base.OpenSubKey("$script:contextClassPath\InprocServer32")
  try { Assert-Context ($null -ne $key -and $key.GetValue('') -ceq $request.expectedDll) 'profile-registration-mismatch' }
  finally { if ($null -ne $key) { $key.Dispose() }; $base.Dispose() }
  Assert-ContextFile $request.expectedDll $request.handler
  Assert-ContextFile (Join-Path ([IO.Path]::GetDirectoryName($request.expectedDll)) 'AlhangeulThumbnailWorker.exe') $request.worker
  $fixtures = Get-ContextFixtures
  $scratch = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-context-fixtures-' + [Guid]::NewGuid().ToString('N'))
  Assert-Context (-not (Test-Path -LiteralPath $scratch)) 'scratch-exists'
  [void][IO.Directory]::CreateDirectory($scratch)
  $script:phaseResult.processesBefore = Get-ContextProcesses
  Invoke-ContextProbe 'environment' 'state' ''
  # Every document Shell request precedes activation, cache observation and forced extraction.
  foreach ($fixture in $fixtures) { Invoke-ContextDocumentProbe $fixture 'shell' }
  foreach ($extension in @('.hwp', '.hwpx')) { Invoke-ContextProbe "association-$($extension.TrimStart('.'))" 'association' $extension }
  foreach ($fixture in $fixtures) { Invoke-ContextDocumentProbe $fixture 'cache-only' }
  foreach ($fixture in $fixtures) { Invoke-ContextDocumentProbe $fixture 'force-extract' }
  Invoke-ContextProbe 'activation' 'activate' ''
  $script:phaseResult.processesAfter = Get-ContextProcesses
  Assert-Context (@($script:phaseResult.processesAfter | Where-Object { $_.role -eq 'AlhangeulThumbnailWorker' }).Count -eq 0) 'worker-residual'
  $script:phaseResult.status = 'observed'
} catch {
  # Do not expose exception text, paths, registry contents or compiler diagnostics.
  $script:phaseResult.error = 'phase-invalid'
  $script:phaseResult.errorCode = $_.Exception.HResult
} finally {
  try {
    if ($scratch) { [IO.Directory]::Delete($scratch, $false) }
    $script:phaseResult.cleanup = $true
  } catch { $script:phaseResult.status = 'invalid'; $script:phaseResult.error = 'fixture-cleanup-failed' }
  Write-ContextJson (Join-Path $request.outputDirectory 'phase.json') $script:phaseResult
}
if ($script:phaseResult.status -ne 'observed') { exit 2 }
exit 0
