# Local orchestration only. Source paths/hashes/streams remain in memory, never in reports.
function Open-CheckSource($Path, $Extensions) {
  $full = Assert-CheckLocalPath $Path
  if ([IO.Path]::GetExtension($full).ToLowerInvariant() -notin $Extensions) { throw 'input-extension' }
  $stream = $null
  try {
    $stream = [IO.File]::Open($full, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::Read)
    if ($stream.Length -le 0 -or $stream.Length -gt 64MB) { throw 'input-size' }
    $digest = Get-CheckStreamHash $stream
    return [ordered]@{ Path = $full; Stream = $stream; Hash = $digest; Bytes = $stream.Length; Mtime = [IO.File]::GetLastWriteTimeUtc($full).Ticks }
  } catch { if ($null -ne $stream) { $stream.Dispose() }; throw 'input-unreadable' }
}

function Get-CheckStreamHash($Stream) {
  $hash = [Security.Cryptography.SHA256]::Create()
  try { $Stream.Position = 0; return [BitConverter]::ToString($hash.ComputeHash($Stream)).Replace('-', '').ToLowerInvariant() }
  finally { $Stream.Position = 0; $hash.Dispose() }
}

function New-CheckContext($Document, $Jpg, $Output) {
  $sources = @{}
  try {
    $outputPath = Assert-CheckLocalPath $Output
    if (Test-Path -LiteralPath $outputPath) { throw 'output-exists' }
    $parent = [IO.Path]::GetDirectoryName($outputPath)
    if (-not (Test-Path -LiteralPath $parent -PathType Container)) { throw 'output-parent-missing' }
    $packageRoot = [IO.Path]::GetFullPath($PSScriptRoot).TrimEnd('\') + '\'
    if ($outputPath.StartsWith($packageRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'output-inside-package' }
    $sources['document'] = Open-CheckSource $Document @('.hwp', '.hwpx')
    $sources['control-jpg'] = Open-CheckSource $Jpg @('.jpg', '.jpeg')
    if ($sources.document.Path -ieq $sources.'control-jpg'.Path -or $outputPath -ieq $sources.document.Path -or $outputPath -ieq $sources.'control-jpg'.Path) { throw 'input-output-collision' }
    New-Item -ItemType Directory -Path $outputPath -ErrorAction Stop | Out-Null
    return [ordered]@{ Sources = $sources; Output = $outputPath; Temp = $null; Copies = @(); Extension = [IO.Path]::GetExtension($sources.document.Path).ToLowerInvariant() }
  } catch { foreach ($source in $sources.Values) { $source.Stream.Dispose() }; throw 'input-or-output-invalid' }
}

function New-CheckCopies($Context) {
  $parent = Assert-CheckLocalPath ([IO.Path]::GetTempPath().TrimEnd('\'))
  $temp = Join-Path $parent ('alhangeul-thumbnail-check-' + [Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $temp -ErrorAction Stop | Out-Null
  $Context.Temp = $temp
  foreach ($role in @('document', 'control-jpg')) {
    $source = $Context.Sources[$role]
    foreach ($mode in @('shell', 'cache-only', 'force-extract')) {
      $path = Join-Path $temp ([Guid]::NewGuid().ToString('N') + [IO.Path]::GetExtension($source.Path))
      $stream = [IO.File]::Open($path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
      $record = [ordered]@{ Role = $role; Mode = $mode; Path = $path; Mtime = $null }
      $Context.Copies += $record
      try { $source.Stream.Position = 0; $source.Stream.CopyTo($stream) } finally { $stream.Dispose() }
      $record.Mtime = [IO.File]::GetLastWriteTimeUtc($path).Ticks
    }
  }
  Assert-CheckIntegrity $Context
}

function Assert-CheckIntegrity($Context) {
  foreach ($source in $Context.Sources.Values) {
    [void](Assert-CheckLocalPath $source.Path)
    if ($source.Stream.Length -ne $source.Bytes -or (Get-CheckStreamHash $source.Stream) -cne $source.Hash -or [IO.File]::GetLastWriteTimeUtc($source.Path).Ticks -ne $source.Mtime) { throw 'source-changed' }
  }
  foreach ($copy in $Context.Copies) {
    [void](Assert-CheckLocalPath $copy.Path)
    $source = $Context.Sources[$copy.Role]; $file = Get-Item -LiteralPath $copy.Path
    if ($file.Length -ne $source.Bytes -or $file.LastWriteTimeUtc.Ticks -ne $copy.Mtime -or (Get-FileHash -LiteralPath $copy.Path -Algorithm SHA256).Hash -ine $source.Hash) { throw 'copy-changed' }
  }
}

function Complete-CheckContext($Context) {
  $valid = $true
  try { Assert-CheckIntegrity $Context } catch { $valid = $false }
  finally { foreach ($source in $Context.Sources.Values) { $source.Stream.Dispose() } }
  if ($null -ne $Context.Temp) {
    $temp = Assert-CheckLocalPath $Context.Temp
    $parent = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
    if ([IO.Path]::GetDirectoryName($temp) -ine $parent -or [IO.Path]::GetFileName($temp) -notmatch '^alhangeul-thumbnail-check-[0-9a-f]{32}$') { throw 'cleanup-scope' }
    foreach ($copy in $Context.Copies) {
      $path = Assert-CheckLocalPath $copy.Path
      if ([IO.Path]::GetDirectoryName($path) -ine $temp) { throw 'cleanup-scope' }
      [IO.File]::Delete($path)
    }
    # Never recursively delete an output directory or unexpected files introduced by another actor.
    [IO.Directory]::Delete($temp, $false)
    $Context.Temp = $null
  }
  if (-not $valid) { throw 'integrity-failed' }
}

function Invoke-CheckProbe($Context, $Label, $Mode, $InputValue = '') {
  $path = Join-Path $Context.Output "$Label.json"
  [void](Assert-CheckLocalPath $path)
  & (Join-Path $PSScriptRoot 'windows-thumbnail-diagnostics.ps1') -InputPath $InputValue -OutputPath $path -Mode $Mode -Size 256 -TimeoutSeconds 30 *> $null
  $code = $LASTEXITCODE
  $probe = Get-Content -LiteralPath $path -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($Mode -eq 'state') {
    if ($code -ne 0 -or $probe.status -ne 'collected') { throw 'state-incomplete' }
  } elseif (-not (Test-ThumbnailProbeContract $probe $Label) -or ($probe.status -eq 'ok' -and $code -ne 0) -or ($probe.status -eq 'failed' -and $code -ne 1)) { throw 'probe-incomplete' }
  return $probe
}

function Invoke-CheckImages($Context, $Probes) {
  New-CheckCopies $Context
  foreach ($copy in @($Context.Copies | Where-Object { $_.Mode -eq 'shell' })) {
    $label = "manual-$($copy.Role)-shell"
    $Probes.Add([ordered]@{ Label = $label; Result = Invoke-CheckProbe $Context $label 'shell' $copy.Path })
    Assert-CheckIntegrity $Context
  }
  foreach ($copy in @($Context.Copies | Where-Object { $_.Mode -ne 'shell' })) {
    $label = "manual-$($copy.Role)-$($copy.Mode)"
    $Probes.Add([ordered]@{ Label = $label; Result = Invoke-CheckProbe $Context $label $copy.Mode $copy.Path })
    Assert-CheckIntegrity $Context
    if ($copy.Mode -eq 'force-extract') {
      $label = "manual-after-force-$($copy.Role)-cache-only"
      $Probes.Add([ordered]@{ Label = $label; Result = Invoke-CheckProbe $Context $label 'cache-only' $copy.Path })
      Assert-CheckIntegrity $Context
    }
  }
  $Probes.Add([ordered]@{ Label = 'manual-activate'; Result = Invoke-CheckProbe $Context 'manual-activate' 'activate' })
}

function Invoke-ManualThumbnailCheck($Context, $Package) {
  $state = Invoke-CheckProbe $Context 'before-state' 'state'
  $label = "manual-association-$($Context.Extension.TrimStart('.'))"
  $association = Invoke-CheckProbe $Context $label 'association' $Context.Extension
  $registration = Get-CheckRegistration $state $Package.Inventory $association $Context.Extension
  $probes = New-Object 'Collections.Generic.List[object]'
  $probes.Add([ordered]@{ Label = $label; Result = $association })
  if ($registration.ready) { Invoke-CheckImages $Context $probes }
  $after = Invoke-CheckProbe $Context 'after-state' 'state'
  Assert-CheckIntegrity $Context
  # A concurrent registration change invalidates the diagnosis, even if a bitmap was returned.
  if ((ConvertTo-Json $state.environment.registrations -Depth 16 -Compress) -cne (ConvertTo-Json $after.environment.registrations -Depth 16 -Compress)) { throw 'registration-changed' }
  $assessment = Get-CheckAssessment @($probes.ToArray()) $registration $Context.Extension $true
  $summary = [ordered]@{
    schemaVersion = 1; sourceSha = $Package.Manifest.sourceSha; productVersion = $Package.Manifest.productVersion
    referenceStatus = $registration.referenceStatus; registrationScope = $registration.registrationScope
    extension = $Context.Extension; integrity = $true; cleanup = $false
    phase = if ($registration.ready) { 'complete' } else { 'preflight-blocked' }
    skipReason = if ($registration.ready) { $null } else { $registration.finding }
    probes = @($probes.ToArray()); before = $state; after = $after
  }
  foreach ($key in $assessment.Keys) { $summary[$key] = $assessment[$key] }
  return $summary
}
