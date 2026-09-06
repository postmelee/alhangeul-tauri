# Public pinned fixtures only; copied documents stay outside the uploaded diagnostics directory.
function Initialize-ThumbnailFixtures {
  $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  $pin = git -C (Join-Path $repo 'third_party\rhwp') rev-parse HEAD
  Assert-Condition ($LASTEXITCODE -eq 0 -and $pin -eq $manifest.rhwpSha) 'thumbnail fixture pin이 다릅니다.'
  Assert-Condition ($manifest.schemaVersion -eq 1 -and $manifest.edge -eq 256 -and $manifest.fixtures.Count -eq 4) 'thumbnail fixture 계약이 다릅니다.'
  foreach ($fixture in $manifest.fixtures) {
    Assert-Condition ($fixture.id -match '^[a-z0-9-]+$' -and $fixture.path -match '^third_party/rhwp/[a-zA-Z0-9_./-]+$' -and $fixture.path -notmatch '\.\.') 'fixture 경로가 올바르지 않습니다.'
    $state = Get-ThumbnailFixtureState (Join-Path $repo $fixture.path)
    Assert-Condition ($state.Size -eq $fixture.bytes -and $state.Sha256 -eq $fixture.sha256) '공개 fixture bytes/hash가 고정값과 다릅니다.'
  }
  $script:thumbnailFixtureRoot = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-thumbnail-smoke-' + [Guid]::NewGuid().ToString('N'))
  [void][IO.Directory]::CreateDirectory($script:thumbnailFixtureRoot)
  $script:thumbnailFixtureManifest = $manifest
  return $manifest
}

function New-ThumbnailFixtureCopy($Fixture, $Phase, $Role) {
  $source = [IO.Path]::GetFullPath((Join-Path (Join-Path $PSScriptRoot '..') $Fixture.path))
  $extension = [IO.Path]::GetExtension($source)
  $copy = Join-Path $script:thumbnailFixtureRoot ("$Phase-$Role-$($Fixture.id)-" + [Guid]::NewGuid().ToString('N') + $extension)
  [IO.File]::Copy($source, $copy, $false)
  [IO.File]::SetLastWriteTimeUtc($copy, [DateTime]::UtcNow)
  $before = Get-ThumbnailFixtureState $copy
  Assert-Condition ($before.Size -eq $Fixture.bytes -and $before.Sha256 -eq $Fixture.sha256) 'fixture 복사본이 원본과 다릅니다.'
  return [ordered]@{ Source = $source; Path = $copy; Before = $before; Spec = $Fixture }
}

function Assert-ThumbnailFixtureUnchanged($Copy) {
  $after = Get-ThumbnailFixtureState $Copy.Path
  $source = Get-ThumbnailFixtureState $Copy.Source
  Assert-Condition ((ConvertTo-Json $Copy.Before -Compress) -eq (ConvertTo-Json $after -Compress)) 'thumbnail probe가 복사본을 변경했습니다.'
  Assert-Condition ($source.Size -eq $Copy.Spec.bytes -and $source.Sha256 -eq $Copy.Spec.sha256) 'thumbnail probe가 공개 원본을 변경했습니다.'
  return [ordered]@{ id = $Copy.Spec.id; bytes = $after.Size; sha256 = $after.Sha256; unchanged = $true }
}

function Invoke-ThumbnailDiagnostic($Label, $Mode, $InputValue = '') {
  $path = Join-Path $OutputDirectory "$Label.json"
  try {
    & (Join-Path $PSScriptRoot 'windows-thumbnail-diagnostics.ps1') -InputPath $InputValue -OutputPath $path -Mode $Mode -Size 256 -TimeoutSeconds 30 | Out-Null
    $code = $LASTEXITCODE
    Assert-Condition (Test-Path -LiteralPath $path -PathType Leaf) '진단 JSON이 없습니다.'
    $probe = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Condition ($probe.schemaVersion -eq 1 -and $probe.mode -eq $Mode) '진단 JSON 계약이 다릅니다.'
    Assert-Condition ($code -eq 0 -or $probe.status -eq 'failed') '진단 process 종료가 비정상입니다.'
    return $probe
  } catch {
    # Missing, malformed or truncated child evidence is a harness failure, never a cache miss.
    return [ordered]@{ schemaVersion = 1; mode = $Mode; status = 'failed'; phase = 'harness'; detailCode = 'diagnostic-evidence-invalid'; hresult = $null }
  }
}

function Assert-ThumbnailEnvironment($Probe) {
  Assert-Condition ($Probe.status -eq 'collected') '환경 진단 수집에 실패했습니다.'
  $state = $Probe.environment
  Assert-Condition ($state.is64BitProcess -and $state.apartment -eq 'STA' -and $state.token.status -eq 'ok') 'x64/STA/token 환경 증거가 없습니다.'
  Assert-Condition ($state.osBuild.status -eq 'ok' -and $state.enableLUA.status -eq 'ok') 'OS/UAC 환경 증거가 없습니다.'
  return $true
}

function Invoke-ThumbnailFixtureRequest($Result, $Phase, $Mode, $Copy) {
  $label = "$Phase-$($Copy.Spec.id)-$Mode"
  $probe = Invoke-ThumbnailDiagnostic $label $Mode $Copy.Path
  $Result.Probes += [ordered]@{ Label = $label; FixtureId = $Copy.Spec.id; Result = $probe }
  Invoke-Check $Result 'fixture' "$label-integrity" { Assert-ThumbnailFixtureUnchanged $Copy }
  if ($Mode -eq 'cache-only') {
    # Cache absence/API failure is observational; it is not accepted as extraction success.
    if ($probe.status -ne 'ok' -and ($probe.phase -ne 'IThumbnailCache.GetThumbnail' -or $probe.hresult -notmatch '^0x[89A-F][0-9A-F]{7}$')) {
      Add-Failure $Result 'thumbnail-diagnostics' "$label diagnostic did not reach the cache API."
    }
  } elseif ($probe.status -ne 'ok' -or $probe.bitmapPresent -ne $true -or $probe.width -le 0 -or $probe.height -le 0) {
    Add-Failure $Result 'thumbnail-render' "$label failed: $($probe.phase), $($probe.hresult)"
  }
}

function Invoke-ThumbnailFixtureProbe($Result, $Phase) {
  $copies = @()
  $beforeProcesses = @(Get-Process -Name 'Alhangeul', 'msedgewebview2' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  foreach ($fixture in $script:thumbnailFixtureManifest.fixtures) {
    $copies += [ordered]@{
      Shell = New-ThumbnailFixtureCopy $fixture $Phase 'first'
      Cache = New-ThumbnailFixtureCopy $fixture $Phase 'cache'
      Force = New-ThumbnailFixtureCopy $fixture $Phase 'force'
    }
  }
  # No activate, cache extraction, app launch, reinstall or rollback before the initial Shell requests.
  foreach ($copy in $copies) { Invoke-ThumbnailFixtureRequest $Result $Phase 'shell' $copy.Shell }
  foreach ($extension in $extensions) {
    $label = "$Phase-association-$($extension.TrimStart('.'))"
    $probe = Invoke-ThumbnailDiagnostic $label 'association' $extension
    $Result.Probes += [ordered]@{ Label = $label; Result = $probe }
    if ($probe.status -ne 'ok' -or $probe.resolvedHandler -ne $thumbnailClsid) { Add-Failure $Result 'thumbnail-registration' "$label did not resolve Alhangeul." }
  }
  foreach ($copy in $copies) {
    Invoke-ThumbnailFixtureRequest $Result $Phase 'cache-only' $copy.Cache
    Invoke-ThumbnailFixtureRequest $Result $Phase 'force-extract' $copy.Force
    Invoke-ThumbnailFixtureRequest $Result "$Phase-after-force" 'cache-only' $copy.Force
  }
  $activation = Invoke-ThumbnailDiagnostic "$Phase-activate" 'activate'
  $Result.Probes += [ordered]@{ Label = "$Phase-activate"; Result = $activation }
  if ($activation.status -ne 'ok') { Add-Failure $Result 'thumbnail-diagnostics' "$Phase COM activation failed." }
  $afterProcesses = @(Get-Process -Name 'Alhangeul', 'msedgewebview2' -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  Assert-Condition (@($afterProcesses | Where-Object { $beforeProcesses -notcontains $_ }).Count -eq 0) 'thumbnail 요청이 Alhangeul 또는 WebView process를 시작했습니다.'
  Assert-Condition (@(Get-Process -Name 'AlhangeulThumbnailWorker' -ErrorAction SilentlyContinue).Count -eq 0) 'thumbnail worker가 남았습니다.'
  return [ordered]@{ Phase = $Phase; FixtureCount = $copies.Count; RequestEdge = 256 }
}

function Assert-ThumbnailProbeEvidence($Result) {
  $Probes = $Result.Probes
  $phases = @('initial')
  if ($Result.ReinstallExitCode -eq 0 -or ($Result.Kind -eq 'msi' -and $Result.ReinstallExitCode -eq 3010)) {
    Assert-Condition ($Result.RebootEvents.Count -ge 2) '재설치 상태 증거가 없습니다.'
    $phases += if ($Result.RebootEvents[1].status -in @('no-reboot-observed', 'not-applicable')) { 'reinstalled' } else { 'pre-reboot-observation' }
  }
  Assert-Condition ((ConvertTo-Json @($Result.ExpectedPhases) -Compress) -eq (ConvertTo-Json $phases -Compress)) '종료 상태별 phase 계약이 다릅니다.'
  $expected = @($phases | ForEach-Object { Get-ThumbnailExpectedLabels $_ })
  foreach ($phase in $phases) {
    $label = if ($phase -eq 'initial') { 'installed-state' } else { "$phase-state" }
    $environment = Get-Content -LiteralPath (Join-Path $OutputDirectory "$label.json") -Raw -Encoding UTF8 | ConvertFrom-Json
    $reported = if ($Result.PhaseEnvironments -is [Collections.IDictionary]) { $Result.PhaseEnvironments[$phase] } else { $Result.PhaseEnvironments.PSObject.Properties[$phase].Value }
    Assert-Condition ((ConvertTo-Json $environment -Depth 16 -Compress) -ceq (ConvertTo-Json $reported -Depth 16 -Compress)) '환경 JSON과 summary가 다릅니다.'
    [void](Assert-ThumbnailEnvironment $environment)
  }
  Assert-Condition ($Probes.Count -eq $expected.Count) '필수 probe가 모두 실행되지 않았습니다.'
  Assert-Condition (@($Probes.Label | Select-Object -Unique).Count -eq $expected.Count) 'probe label이 중복되었습니다.'
  foreach ($probe in $Probes) {
    Assert-Condition ($expected -contains $probe.Label) '예상하지 않은 probe label입니다.'
    $path = Join-Path $OutputDirectory "$($probe.Label).json"
    Assert-Condition (Test-Path -LiteralPath $path -PathType Leaf) '필수 probe JSON이 없습니다.'
    $stored = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Condition ((ConvertTo-Json $stored -Depth 16 -Compress) -ceq (ConvertTo-Json $probe.Result -Depth 16 -Compress)) 'probe JSON과 summary가 다릅니다.'
    Assert-Condition (Test-ThumbnailProbeContract $stored $probe.Label) 'probe 내용 계약이 다릅니다.'
  }
  return $true
}

function Complete-ThumbnailAssessments($Result) {
  Invoke-Check $Result 'thumbnail-diagnostics' 'ProbeEvidenceCheck' { Assert-ThumbnailProbeEvidence $Result }
  $otherFailures = @($Result.Failures | Where-Object { $_.Category -ne 'thumbnail-render' })
  $pending = @($Result.RebootEvents | Where-Object { $_.status -notin @('no-reboot-observed', 'not-applicable') })
  $Result.LifecycleStatus = if ($pending.Count -gt 0) { $pending[0].status } elseif ($otherFailures.Count -gt 0) { 'failed' } else { 'passed' }
  $Result.Assessments = @()
  foreach ($phase in $Result.ExpectedPhases) {
    $context = [ordered]@{
      kind = $Result.Kind; inventory = $artifacts.Inventory; environment = $Result.PhaseEnvironments[$phase]
      lifecycleStatus = $Result.LifecycleStatus
      evidenceValid = $Result.ProbeEvidenceCheck -is [bool] -and $Result.ProbeEvidenceCheck -and @($Result.Failures | Where-Object { $_.Category -in @('fixture', 'thumbnail-diagnostics') }).Count -eq 0
    }
    $Result.Assessments += Get-ThumbnailPhaseAssessment $Result.Probes $context $phase
  }
  # This gate checks the diagnostic contract only, never rewrites product Status/Failures.
  $Result.DiagnosticContract = @($Result.Assessments | Where-Object { $_.evidenceStatus -ne 'valid' -or $_.finding -notin @('thumbnail-api-ok', 'per-user-shell-activation-failed') }).Count -eq 0
  if ($otherFailures.Count -gt 0 -or $pending.Count -gt 0) {
    $allowed = @('reboot-required', 'reboot-pending')
    $Result.DiagnosticContract = $Result.DiagnosticContract -and @($otherFailures | Where-Object { $_.Category -notin $allowed }).Count -eq 0 -and @($pending | Where-Object { $_.status -notin $allowed -or -not $_.observationComplete }).Count -eq 0
  }
  if ($pending.Count -gt 0 -and $otherFailures.Count -eq 0) { Add-Failure $Result $pending[0].status 'lifecycle has unresolved reboot evidence.' }
  if (-not $Result.DiagnosticContract) { Add-Failure $Result 'diagnostic-contract' 'diagnostic evidence is invalid or not classified.' }
}

function Remove-ThumbnailFixtureCopies {
  if ($null -eq $script:thumbnailFixtureRoot) { return }
  $parent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
  $path = [IO.Path]::GetFullPath($script:thumbnailFixtureRoot)
  Assert-Condition ([IO.Path]::GetDirectoryName($path) -ieq $parent -and [IO.Path]::GetFileName($path) -match '^alhangeul-thumbnail-smoke-[0-9a-f]{32}$') '임시 fixture 정리 범위가 다릅니다.'
  Remove-Item -LiteralPath $path -Recurse -Force
  $script:thumbnailFixtureRoot = $null
}
