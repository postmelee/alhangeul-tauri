function Copy-Case($Value) { return ($Value | ConvertTo-Json -Depth 32 | ConvertFrom-Json) }
$base = (Get-Content (Join-Path $PSScriptRoot 'windows-thumbnail-app-assessments.json') -Raw -Encoding UTF8 | ConvertFrom-Json).base
$inventory = [pscustomobject]@{ sourceSha = ('a' * 40); files = @(
  [pscustomobject]@{ kind = 'thumbnail-handler'; size = 20; sha256 = ('b' * 64) },
  [pscustomobject]@{ kind = 'thumbnail-worker'; size = 30; sha256 = ('c' * 64) }
) }
function New-AppSuiteCase($Kind, $Limited = $false) {
  $scope = if ($Kind -eq 'nsis') { 'user-only' } else { 'machine-only' }
  $formats = @(); $legacy = @()
  foreach ($extension in @('.hwp', '.hwpx')) {
    $inputValue = Copy-Case $base
    $inputValue.extension = $extension; $inputValue.registration.scope = $scope
    $inputValue.probes[0].Label = "manual-association-$($extension.TrimStart('.'))"
    if ($Limited) {
      foreach ($record in $inputValue.probes) {
        if ($record.Label -cin @('manual-document-shell', 'manual-document-force-extract')) {
          $record.Result.status = 'failed'; $record.Result.hresult = '0x80040154'
          $record.Result.bitmapPresent = $false; $record.Result.width = $null; $record.Result.height = $null
          if ($record.Result.mode -eq 'force-extract') { $record.Result.phase = 'IThumbnailCache.GetThumbnail' }
        }
      }
    }
    $fixture = if ($extension -eq '.hwp') { 'small-hwp' } else { 'form-hwpx' }
    foreach ($mode in @('shell', 'force-extract')) {
      $probe = ($inputValue.probes | Where-Object { $_.Label -ceq "manual-document-$mode" }).Result
      $legacy += [pscustomobject]@{ Label = "initial-$fixture-$mode"; Result = $probe }
    }
    $assessment = [pscustomobject]@{ evidenceValid = $true; thumbnailPassed = -not $Limited; finding = $(if ($Limited) { 'per-user-shell-activation-failed' } else { 'thumbnail-api-ok' }); recommendedAction = $(if ($Limited) { 'consider-msi' } else { 'none' }) }
    $formats += [pscustomobject]@{ input = $inputValue; assessment = $assessment }
  }
  $reference = [pscustomobject]@{ schemaVersion = 1; sourceSha = $inventory.sourceSha; productVersion = '0.1.0'; files = @(
    [pscustomobject]@{ name = 'AlhangeulThumbnailHandler.dll'; bytes = 20; sha256 = ('b' * 64) },
    [pscustomobject]@{ name = 'AlhangeulThumbnailWorker.exe'; bytes = 30; sha256 = ('c' * 64) }
  ) }
  return [pscustomobject]@{ legacy = $legacy; suite = [pscustomobject]@{ status = 'completed'; cleanup = $true; formats = $formats; inspection = [pscustomobject]@{
    buildReference = $reference; installKind = $Kind; installRecordsReadable = $true; registration = @($formats | ForEach-Object { $_.input.registration })
  } } }
}
