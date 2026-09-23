# Pure app/legacy assessment parity. No registry, COM, installer, or policy changes.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $repo 'scripts/windows-thumbnail-assessment.ps1')
. (Join-Path $repo 'scripts/windows-thumbnail-check-assessment.ps1')

function Set-AppCaseValue($Document, $Pointer, $Value) {
    $segments = $Pointer.TrimStart('/').Split('/')
    $cursor = $Document
    for ($i = 0; $i -lt $segments.Count - 1; $i++) {
        $part = $segments[$i]
        $cursor = if ($cursor -is [Array]) { $cursor[[int]$part] } else { $cursor.PSObject.Properties[$part].Value }
    }
    $last = $segments[$segments.Count - 1]
    if ($cursor -is [Array]) { $cursor[[int]$last] = $Value }
    else { $cursor.PSObject.Properties[$last].Value = $Value }
}

function Get-AppCaseAssessment($Document) {
    $invalid = [ordered]@{ finding = 'diagnostic-invalid'; recommendedAction = 'check-diagnostics'; evidenceValid = $false; thumbnailPassed = $false }
    if (-not $Document.integrity -or -not $Document.cleanup -or -not $Document.registrationStable) { return $invalid }
    $registration = $Document.registration
    if (-not $registration.ready) {
        if ($registration.finding -in @('other-handler-selected', 'registration-ambiguous', 'registration-mismatch', 'reference-mismatch', 'display-policy-restricted')) {
            $invalid.finding = $registration.finding
        }
        return $invalid
    }
    if ($registration.finding -ne 'ready' -or -not $registration.referenceMatched -or $registration.scope -notin @('user-only', 'machine-only')) { return $invalid }
    $legacyRegistration = [ordered]@{ ready = $true; finding = 'ready'; registrationScope = $registration.scope }
    $answer = Get-CheckAssessment @($Document.probes) $legacyRegistration $Document.extension $true
    $action = $answer.recommendedAction
    if ($answer.finding -eq 'per-user-shell-activation-failed' -and $Document.installKind -ne 'nsis') { $action = 'check-install-history' }
    return [ordered]@{
        finding = $answer.finding
        recommendedAction = $action
        evidenceValid = $answer.evidenceStatus -eq 'valid'
        thumbnailPassed = $answer.thumbnailStatus -eq 'passed'
    }
}

$fixture = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-app-assessments.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($fixture.schemaVersion -ne 1 -or $fixture.cases.Count -lt 40) { throw 'App assessment fixture contract missing' }
$seen = @{}
foreach ($case in $fixture.cases) {
    if ($seen.ContainsKey($case.id)) { throw 'Duplicate app assessment case' }
    $seen[$case.id] = $true
    $document = $fixture.base | ConvertTo-Json -Depth 24 | ConvertFrom-Json
    foreach ($mutation in $case.mutations) { Set-AppCaseValue $document $mutation.pointer $mutation.value }
    $actual = Get-AppCaseAssessment $document
    foreach ($property in @('finding', 'recommendedAction', 'evidenceValid', 'thumbnailPassed')) {
        if ($actual[$property] -cne $case.expected.$property) { throw "App assessment mismatch: $($case.id) / $property" }
    }
}
Write-Output "App thumbnail assessment parity passed: $($fixture.cases.Count) cases; no native or installer acceptance."
exit 0
