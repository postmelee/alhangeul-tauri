# Pure single-document assessment. Does not relax the CI three-fixture contract.
function Get-CheckLabels($Extension) {
  $labels = @("manual-association-$($Extension.TrimStart('.'))", 'manual-activate')
  foreach ($role in @('document', 'control-jpg')) {
    $labels += @("manual-$role-shell", "manual-$role-cache-only", "manual-$role-force-extract", "manual-after-force-$role-cache-only")
  }
  return $labels
}

function Get-CheckRegistration($State, $Inventory, $Association, $Extension) {
  $answer = [ordered]@{ referenceStatus = 'not-verified'; registrationScope = 'unknown'; finding = 'diagnostic-invalid'; ready = $false }
  try {
    $envState = $State.environment
    if ($State.status -ne 'collected' -or -not $envState.is64BitProcess -or $envState.apartment -ne 'STA' -or $envState.token.status -ne 'ok') { return $answer }
    if ($Extension -notin @('.hwp', '.hwpx') -or -not (Test-ThumbnailProbeContract $Association "manual-association-$($Extension.TrimStart('.'))")) { return $answer }
    if ($Association.status -ne 'ok') { return $answer }
    if ($Association.resolvedHandler -ine '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}') { $answer.finding = 'other-handler-selected'; return $answer }
    $rows = @($envState.registrations | Where-Object { $_.view -eq 'Registry64' })
    if ($rows.Count -ne 2 -or @($rows.hive | Select-Object -Unique).Count -ne 2 -or @($rows | Where-Object { $_.hive -notin @('CurrentUser', 'LocalMachine') -or $_.inproc.status -notin @('ok', 'missing') }).Count -gt 0) { return $answer }
    $active = @($rows | Where-Object { $_.inproc.status -eq 'ok' })
    if ($active.Count -gt 1) { $answer.finding = 'registration-ambiguous'; return $answer }
    if ($active.Count -ne 1) { $answer.finding = 'registration-mismatch'; return $answer }
    $row = $active[0]
    $answer.registrationScope = if ($row.hive -eq 'CurrentUser') { 'user-only' } else { 'machine-only' }
    $entries = @($row.extensions | Where-Object { $_.extension -eq $Extension })
    if ($row.threadingModel.status -ne 'ok' -or $row.threadingModel.value -ne 'Apartment' -or $entries.Count -ne 1 -or $entries[0].handler.status -ne 'ok' -or $entries[0].handler.value -ine $Association.resolvedHandler) { $answer.finding = 'registration-mismatch'; return $answer }
    foreach ($pair in @(@('handler', 'thumbnail-handler'), @('worker', 'thumbnail-worker'))) {
      $expected = @($Inventory.files | Where-Object { $_.kind -eq $pair[1] }); $actual = $row.inproc.($pair[0])
      if ($expected.Count -ne 1 -or $expected[0].sha256 -cnotmatch '^[0-9a-f]{64}$' -or $expected[0].size -le 0) { return $answer }
      if ($actual.status -ne 'ok' -or $actual.sha256 -ine $expected[0].sha256 -or $actual.bytes -ne $expected[0].size) { $answer.referenceStatus = 'mismatch'; $answer.finding = 'reference-mismatch'; return $answer }
    }
    $answer.referenceStatus = 'matched'; $answer.finding = 'ready'; $answer.ready = $true
  } catch { $answer.finding = 'diagnostic-invalid'; $answer.ready = $false }
  return $answer
}

function Get-CheckAssessment($Probes, $Registration, $Extension, $Integrity) {
  $answer = [ordered]@{ evidenceStatus = 'invalid'; thumbnailStatus = 'not-accepted'; lifecycleStatus = 'not-tested'; finding = 'diagnostic-invalid'; recommendedAction = 'check-diagnostics'; exitCode = 2; evidenceLabels = @() }
  try {
    if (-not $Registration.ready) { $answer.finding = $Registration.finding; return $answer }
    if ($Integrity -isnot [bool] -or -not $Integrity) { return $answer }
    $expected = @(Get-CheckLabels $Extension); $map = @{}
    if ($Probes.Count -ne 10) { return $answer }
    foreach ($record in $Probes) {
      if ($record.Label -notin $expected -or $map.ContainsKey($record.Label) -or -not (Test-ThumbnailProbeContract $record.Result $record.Label)) { return $answer }
      $map[$record.Label] = $record.Result
    }
    if ($map["manual-association-$($Extension.TrimStart('.'))"].resolvedHandler -ine '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}') { return $answer }
    $answer.evidenceStatus = 'valid'; $answer.evidenceLabels = $expected; $answer.exitCode = 1
    foreach ($mode in @('shell', 'force-extract')) {
      if (-not (Test-ThumbnailBitmap $map["manual-control-jpg-$mode"])) { $answer.finding = 'shell-control-failed'; $answer.recommendedAction = 'check-shell-environment'; return $answer }
    }
    $pair = @($map['manual-document-shell'], $map['manual-document-force-extract'])
    $activation = $map['manual-activate'].status -eq 'ok'
    $answer.finding = Get-ThumbnailDocumentFinding $pair ($Registration.registrationScope -eq 'user-only') $activation
    if (-not $activation) { $answer.finding = 'unclassified-failure' }
    $answer.recommendedAction = 'investigate'
    if ($answer.finding -eq 'per-user-shell-activation-failed') { $answer.recommendedAction = 'consider-msi' }
    if ($answer.finding -eq 'thumbnail-api-ok') { $answer.thumbnailStatus = 'passed'; $answer.exitCode = 0; $answer.recommendedAction = 'none' }
  } catch { $answer.evidenceStatus = 'invalid'; $answer.thumbnailStatus = 'not-accepted'; $answer.finding = 'diagnostic-invalid'; $answer.recommendedAction = 'check-diagnostics'; $answer.exitCode = 2 }
  return $answer
}

function Get-CheckMessage($Finding) {
  switch ($Finding) {
    'thumbnail-api-ok' { return '선택한 문서의 썸네일 API 검사가 통과했습니다. Explorer 화면·다른 문서·설치 완료를 보장하지 않습니다.' }
    'per-user-shell-activation-failed' { return '현재 문맥에서 사용자별 처리기의 Shell 활성화에 실패했습니다. 저장·종료 후 NSIS 제거와 같은 빌드 MSI 설치를 대안으로 검토하세요.' }
    'reference-mismatch' { return '설치된 처리기와 진단 묶음의 빌드가 다릅니다. 같은 빌드의 묶음을 확인하세요.' }
    'other-handler-selected' { return '다른 썸네일 처리기가 선택돼 문서 실행을 생략했습니다. 기본 앱이나 등록을 자동 변경하지 않습니다.' }
    'registration-ambiguous' { return '사용자별·시스템 등록이 함께 있어 실행을 생략했습니다. 설치 이력과 등록 상태를 확인하세요.' }
    'registration-mismatch' { return '처리기 등록 상태가 예상과 달라 실행을 생략했습니다.' }
    'shell-control-failed' { return 'JPG 대조군도 실패했습니다. 공통 Shell 환경을 확인하세요. UAC 값만으로 원인을 확정하지 않습니다.' }
    'unclassified-failure' { return '썸네일 검사에 실패했지만 알려진 설치 제한 패턴은 아닙니다. 원시 진단 결과를 확인하세요.' }
    default { return '진단을 완료하지 못했습니다. 입력·진단 묶음·보안 정책과 결과 코드를 확인하세요.' }
  }
}
