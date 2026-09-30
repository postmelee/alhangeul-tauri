# Only called within the existing disposable hosted-CI display guard.
function Restart-GalleryExplorer {
  Assert-Condition ($env:GITHUB_ACTIONS -ceq 'true' -and $env:RUNNER_ENVIRONMENT -ceq 'github-hosted') 'Explorer restart requires disposable hosted CI.'
  $session = [Diagnostics.Process]::GetCurrentProcess().SessionId
  $expected = Join-Path $env:SystemRoot 'explorer.exe'
  $old = @(Get-Process explorer -ErrorAction SilentlyContinue | Where-Object {
    $_.SessionId -eq $session -and $_.Path -ieq $expected
  })
  foreach ($process in $old) { Stop-Process -Id $process.Id -Force -ErrorAction Stop }
  Start-Sleep -Seconds 2
  if (-not @(Get-Process explorer -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session }).Count) {
    Start-Process -FilePath $expected | Out-Null
  }
  Start-Sleep -Seconds 4
  $current = @(Get-Process explorer -ErrorAction SilentlyContinue | Where-Object { $_.SessionId -eq $session })
  Assert-Condition ($current.Count -gt 0) 'Explorer did not restart.'
  return @{oldProcessIds=@($old | ForEach-Object { $_.Id });newProcessIds=@($current | ForEach-Object { $_.Id });sessionId=$session}
}

function Invoke-GalleryThumbnailDiagnostics($Folder, $EvidenceDirectory) {
  $diagnostic = Join-Path (Split-Path $PSScriptRoot -Parent) 'windows-thumbnail-diagnostics.ps1'
  New-Item -ItemType Directory -Path $EvidenceDirectory -ErrorAction Stop | Out-Null
  $documents = @(Get-ChildItem -LiteralPath $Folder -File | Sort-Object Name)
  $inputs = @(
    ($documents | Where-Object Extension -eq '.hwp' | Select-Object -First 1),
    ($documents | Where-Object Extension -eq '.hwpx' | Select-Object -First 1),
    (Get-Item -LiteralPath (Join-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) 'third_party/rhwp/samples/s1.jpg'))
  )
  $records = @()
  foreach ($inputFile in $inputs) {
    Assert-Condition ($null -ne $inputFile) 'Diagnostic sample missing.'
    $label = $inputFile.Extension.TrimStart('.')
    # Observe Explorer-created cache first. Rendering probes use separate copies, after screenshots.
    $cacheOutput = Join-Path $EvidenceDirectory "$label-cache-only.json"
    & powershell.exe -NoProfile -STA -File $diagnostic -Mode cache-only `
      -InputPath $inputFile.FullName -OutputPath $cacheOutput -TimeoutSeconds 15 | Out-Null
    $records += @{sample=$label;mode='cache-only';exitCode=$LASTEXITCODE}
    $copy = Join-Path $EvidenceDirectory "diagnostic.$label"
    Copy-Item -LiteralPath $inputFile.FullName -Destination $copy -ErrorAction Stop
    foreach ($mode in @('shell','force-extract')) {
      & powershell.exe -NoProfile -STA -File $diagnostic -Mode $mode -InputPath $copy `
        -OutputPath (Join-Path $EvidenceDirectory "$label-$mode.json") -TimeoutSeconds 15 | Out-Null
      $records += @{sample=$label;mode=$mode;exitCode=$LASTEXITCODE;sha256=(Get-FileHash -LiteralPath $copy -Algorithm SHA256).Hash}
    }
  }
  $records | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $EvidenceDirectory 'requests.json') -Encoding UTF8
}
