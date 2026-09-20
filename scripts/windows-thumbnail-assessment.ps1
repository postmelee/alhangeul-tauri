# Pure classification of collected evidence; no COM, registry, process or file operations.
function Get-ThumbnailExpectedLabels($Phase) {
  $labels = @("$Phase-association-hwp", "$Phase-association-hwpx", "$Phase-activate")
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx', 'control-jpg')) {
    foreach ($mode in @('shell', 'cache-only', 'force-extract')) { $labels += "$Phase-$id-$mode" }
    $labels += "$Phase-after-force-$id-cache-only"
  }
  return $labels
}

function Test-ThumbnailBitmap($Probe) {
  return $Probe.status -eq 'ok' -and $Probe.hresult -ceq '0x00000000' -and
    $Probe.bitmapPresent -is [bool] -and $Probe.bitmapPresent -and
    $Probe.width -is [int] -and $Probe.height -is [int] -and
    $Probe.width -gt 0 -and $Probe.height -gt 0 -and $Probe.width -le 1024 -and $Probe.height -le 1024
}

function Test-ThumbnailProbeContract($Probe, $Label) {
  try {
    if ($Probe.schemaVersion -ne 1 -or $Probe.apartment -ne 'STA' -or $Probe.status -notin @('ok', 'failed')) { return $false }
    if ($Probe.hresult -cnotmatch '^0x[0-9A-F]{8}$' -or $Probe.elapsedMs -lt 0) { return $false }
    $expectedMode = if ($Label -match '-association-') { 'association' } elseif ($Label.EndsWith('-activate')) { 'activate' }
      elseif ($Label.EndsWith('-cache-only')) { 'cache-only' } elseif ($Label.EndsWith('-force-extract')) { 'force-extract' } else { 'shell' }
    if ($Probe.mode -ne $expectedMode) { return $false }
    $phases = @('AssocQueryStringW', 'CoCreateInstance.handler', 'SHCreateItemFromParsingName.imageFactory', 'IShellItemImageFactory.GetImage', 'SHCreateItemFromParsingName.shellItem', 'CoCreateInstance.thumbnailCache', 'IThumbnailCache.GetThumbnail', 'ISharedBitmap.GetSharedBitmap')
    if ($Probe.phase -notin $phases) { return $false }
    if ($Probe.status -eq 'failed') {
      if ($Probe.bitmapPresent -eq $true -or $null -ne $Probe.width -or $null -ne $Probe.height) { return $false }
      if ($expectedMode -eq 'cache-only' -and $Probe.phase -ne 'IThumbnailCache.GetThumbnail') { return $false }
      return $Probe.hresult -cmatch '^0x[89A-F][0-9A-F]{7}$'
    }
    if ($Probe.hresult -cne '0x00000000') { return $false }
    if ($expectedMode -in @('shell', 'cache-only', 'force-extract')) {
      $flag = if ($expectedMode -eq 'shell') { 8 } elseif ($expectedMode -eq 'cache-only') { 1 } else { 4 }
      $finalPhase = if ($expectedMode -eq 'shell') { 'IShellItemImageFactory.GetImage' } else { 'ISharedBitmap.GetSharedBitmap' }
      return (Test-ThumbnailBitmap $Probe) -and $Probe.requestFlags -eq $flag -and $Probe.phase -eq $finalPhase
    }
    return ($expectedMode -eq 'association' -and $Probe.phase -eq 'AssocQueryStringW') -or ($expectedMode -eq 'activate' -and $Probe.phase -eq 'CoCreateInstance.handler')
  } catch { return $false }
}

function Get-ThumbnailRegistrationMatch($Context) {
  $envState = $Context.environment.environment
  if ($Context.environment.status -ne 'collected' -or -not $envState.is64BitProcess -or $envState.apartment -ne 'STA' -or $envState.token.status -ne 'ok') { throw 'invalid-environment' }
  $hive = if ($Context.kind -eq 'nsis') { 'CurrentUser' } elseif ($Context.kind -eq 'msi') { 'LocalMachine' } else { throw 'invalid-installer' }
  $rows = @($envState.registrations | Where-Object { $_.hive -eq $hive -and $_.view -eq 'Registry64' })
  if ($rows.Count -ne 1) { throw 'missing-registration-evidence' }
  $row = $rows[0]
  if ($row.inproc.status -ne 'ok' -or $row.threadingModel.status -ne 'ok' -or $row.threadingModel.value -ne 'Apartment') { return $false }
  foreach ($pair in @(@('handler', 'thumbnail-handler'), @('worker', 'thumbnail-worker'))) {
    $actual = $row.inproc.($pair[0]); $expected = @($Context.inventory.files | Where-Object { $_.kind -eq $pair[1] })
    if ($expected.Count -ne 1 -or $expected[0].sha256 -notmatch '^[0-9a-f]{64}$') { throw 'invalid-inventory' }
    if ($actual.status -ne 'ok' -or $actual.sha256 -ine $expected[0].sha256 -or $actual.bytes -ne $expected[0].size) { return $false }
  }
  foreach ($extension in @('.hwp', '.hwpx')) {
    $entries = @($row.extensions | Where-Object { $_.extension -eq $extension })
    if ($entries.Count -ne 1 -or $entries[0].handler.status -ne 'ok' -or $entries[0].handler.value -ine '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}') { return $false }
  }
  return $true
}

function Test-ThumbnailPerUserOnly($Context) {
  if ($Context.kind -ne 'nsis') { return $false }
  $machine = @($Context.environment.environment.registrations | Where-Object { $_.hive -eq 'LocalMachine' -and $_.view -eq 'Registry64' })
  return $machine.Count -eq 1 -and $machine[0].inproc.status -eq 'missing'
}

function Get-ThumbnailDocumentFinding($Pair, $PerUser, $ActivationOk) {
  if (@($Pair | Where-Object { -not (Test-ThumbnailBitmap $_) }).Count -eq 0) { return 'thumbnail-api-ok' }
  if ($PerUser -and $ActivationOk -and $Pair[0].phase -eq 'IShellItemImageFactory.GetImage' -and $Pair[1].phase -eq 'IThumbnailCache.GetThumbnail' -and
      @($Pair | Where-Object { $_.status -ne 'failed' -or $_.hresult -cne '0x80040154' }).Count -eq 0) { return 'per-user-shell-activation-failed' }
  return 'unclassified-failure'
}

function Get-ThumbnailPhaseAssessment($Probes, $Context, $Phase) {
  $answer = [ordered]@{ phase = $Phase; evidenceStatus = 'invalid'; thumbnailStatus = 'not-accepted'; lifecycleStatus = $Context.lifecycleStatus; finding = 'diagnostic-invalid'; recommendedAction = 'check-diagnostics'; documents = @(); evidenceLabels = @(); cacheObservations = @() }
  try {
    if (-not $Context.evidenceValid) { return $answer }
    $expected = @(Get-ThumbnailExpectedLabels $Phase)
    $records = @($Probes | Where-Object { $_.Label.StartsWith("$Phase-") })
    if ($records.Count -ne 19 -or @($records.Label | Select-Object -Unique).Count -ne 19) { return $answer }
    $map = @{}
    foreach ($record in $records) {
      if ($record.Label -notin $expected -or -not (Test-ThumbnailProbeContract $record.Result $record.Label)) { return $answer }
      $map[$record.Label] = $record.Result
    }
    $registration = Get-ThumbnailRegistrationMatch $Context
    $answer.evidenceStatus = 'valid'; $answer.evidenceLabels = $expected
    $answer.cacheObservations = @($records | Where-Object { $_.Result.mode -eq 'cache-only' } | ForEach-Object { [ordered]@{ label = $_.Label; status = $_.Result.status; hresult = $_.Result.hresult; cacheFlags = $_.Result.cacheFlags } })
    foreach ($extension in @('hwp', 'hwpx')) {
      $association = $map["$Phase-association-$extension"]
      if ($association.status -ne 'ok' -or $association.resolvedHandler -ine '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}') { $registration = $false }
    }
    if (-not $registration) { $answer.finding = 'registration-mismatch'; $answer.recommendedAction = 'check-registration'; return $answer }
    foreach ($mode in @('shell', 'force-extract')) {
      if (-not (Test-ThumbnailBitmap $map["$Phase-control-jpg-$mode"])) { $answer.finding = 'shell-control-failed'; $answer.recommendedAction = 'check-shell-environment'; return $answer }
    }
    $perUser = Test-ThumbnailPerUserOnly $Context
    foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) {
      $pair = @($map["$Phase-$id-shell"], $map["$Phase-$id-force-extract"])
      $finding = Get-ThumbnailDocumentFinding $pair $perUser ($map["$Phase-activate"].status -eq 'ok')
      $answer.documents += [ordered]@{ id = $id; finding = $finding; labels = @("$Phase-$id-shell", "$Phase-$id-force-extract") }
    }
    $findings = @($answer.documents.finding | Select-Object -Unique)
    $answer.finding = if ($findings.Count -eq 1 -and $map["$Phase-activate"].status -eq 'ok') { $findings[0] } else { 'unclassified-failure' }
    $answer.recommendedAction = 'investigate'
    if ($answer.finding -eq 'per-user-shell-activation-failed') { $answer.recommendedAction = 'consider-msi' }
    if ($answer.finding -eq 'thumbnail-api-ok') { $answer.thumbnailStatus = 'passed'; $answer.recommendedAction = 'none' }
  } catch { $answer.evidenceStatus = 'invalid'; $answer.finding = 'diagnostic-invalid'; $answer.recommendedAction = 'check-diagnostics'; $answer.thumbnailStatus = 'not-accepted' }
  return $answer
}
