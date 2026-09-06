[CmdletBinding()]
param([string]$SupportRoot = 'artifacts\thumbnail-support', [string]$SummaryRoot = '', [switch]$VerifyExitCode)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Assert-Manual($Condition, $Message) { if (-not $Condition) { throw $Message } }
Assert-Manual ([Environment]::OSVersion.Platform -eq 'Win32NT' -and [Environment]::Is64BitProcess -and $PSVersionTable.PSVersion.Major -eq 5 -and $PSVersionTable.PSVersion.Minor -eq 1) 'Windows x64 PowerShell 5.1 required'
# Load only repository-owned function declarations, not the executable entry point.
$tokens = $null; $parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'windows-thumbnail-check.ps1'), [ref]$tokens, [ref]$parseErrors)
Assert-Manual ($parseErrors.Count -eq 0) 'entry parse failed'
foreach ($node in $ast.EndBlock.Statements) { if ($node -is [Management.Automation.Language.FunctionDefinitionAst]) { . ([scriptblock]::Create($node.Extent.Text)) } }
. (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-check-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-thumbnail-check-support.ps1')
$SupportRoot = [IO.Path]::GetFullPath($SupportRoot)
$package = Read-CheckPackage $SupportRoot
$sha = git -C (Join-Path $PSScriptRoot '..') rev-parse HEAD
Assert-Manual ($LASTEXITCODE -eq 0 -and $package.Manifest.sourceSha -eq $sha) 'support source SHA mismatch'
foreach ($record in $package.Manifest.files) {
  $source = if ($record.path -eq 'WINDOWS_THUMBNAILS.md') { Join-Path $PSScriptRoot '..\docs\architecture\WINDOWS_THUMBNAILS.md' }
    elseif ($record.path -eq 'alhangeul-artifact-inventory.json') { Join-Path $PSScriptRoot '..\artifacts\windows-x64\alhangeul-artifact-inventory.json' }
    else { Join-Path $PSScriptRoot $record.path }
  Assert-Manual ((Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash -ieq $record.sha256) 'support payload differs from checkout/bundle'
}

function New-ManualCase($Hive = 'CurrentUser') {
  $clsid = '{C1DCF316-0771-49DD-BFEA-C85F69B1674B}'; $rows = @()
  foreach ($h in @('CurrentUser', 'LocalMachine')) {
    $inproc = if ($h -eq $Hive) { [ordered]@{ status = 'ok'; handler = @{ status = 'ok'; bytes = 1; sha256 = ('a' * 64) }; worker = @{ status = 'ok'; bytes = 2; sha256 = ('b' * 64) } } } else { @{ status = 'missing' } }
    $rows += [ordered]@{ hive = $h; view = 'Registry64'; inproc = $inproc; threadingModel = @{ status = 'ok'; value = 'Apartment' }; extensions = @(@{ extension = '.hwp'; handler = @{ status = 'ok'; value = $clsid } }, @{ extension = '.hwpx'; handler = @{ status = 'ok'; value = $clsid } }) }
  }
  $state = [ordered]@{ status = 'collected'; environment = @{ is64BitProcess = $true; apartment = 'STA'; token = @{ status = 'ok' }; enableLUA = @{ status = 'ok'; value = 1 }; registrations = $rows } }
  $inventory = @{ files = @(@{ kind = 'thumbnail-handler'; size = 1; sha256 = ('a' * 64) }, @{ kind = 'thumbnail-worker'; size = 2; sha256 = ('b' * 64) }) }
  $probes = @()
  foreach ($label in (Get-CheckLabels '.hwp')) {
    $mode = if ($label -match '-association-') { 'association' } elseif ($label.EndsWith('-activate')) { 'activate' } elseif ($label.EndsWith('-cache-only')) { 'cache-only' } elseif ($label.EndsWith('-force-extract')) { 'force-extract' } else { 'shell' }
    $phase = switch ($mode) { association { 'AssocQueryStringW' } activate { 'CoCreateInstance.handler' } shell { 'IShellItemImageFactory.GetImage' } default { 'ISharedBitmap.GetSharedBitmap' } }
    $flag = switch ($mode) { shell { 8 } 'cache-only' { 1 } 'force-extract' { 4 } default { $null } }
    $probes += [ordered]@{ Label = $label; Result = [ordered]@{ schemaVersion = 1; mode = $mode; phase = $phase; status = 'ok'; hresult = '0x00000000'; elapsedMs = 1; apartment = 'STA'; bitmapPresent = $true; width = 181; height = 256; requestFlags = $flag; resolvedHandler = $clsid } }
  }
  return [ordered]@{ State = $state; Inventory = $inventory; Probes = $probes }
}

function Set-ManualFailure($Case, $Label, $Hr = '0x80040154') {
  $probe = @($Case.Probes | Where-Object { $_.Label -eq $Label })[0].Result
  $probe.status = 'failed'; $probe.hresult = $Hr; $probe.bitmapPresent = $false; $probe.width = $null; $probe.height = $null
  if ($probe.mode -in @('cache-only', 'force-extract')) { $probe.phase = 'IThumbnailCache.GetThumbnail' }
}

function Assert-ManualFinding($Case, $Expected) {
  $before = ConvertTo-Json $Case -Depth 20 -Compress
  $reg = Get-CheckRegistration $Case.State $Case.Inventory $Case.Probes[0].Result '.hwp'
  $result = Get-CheckAssessment $Case.Probes $reg '.hwp' $true
  Assert-Manual ($result.finding -eq $Expected) "finding mismatch: $Expected / $($result.finding)"
  Assert-Manual ($result.lifecycleStatus -eq 'not-tested' -and ($Expected -eq 'thumbnail-api-ok' -or $result.exitCode -ne 0)) 'false product success'
  Assert-Manual ($before -ceq (ConvertTo-Json $Case -Depth 20 -Compress)) 'raw evidence mutated'
  $roundTrip = $before | ConvertFrom-Json
  $r = Get-CheckRegistration $roundTrip.State $roundTrip.Inventory $roundTrip.Probes[0].Result '.hwp'
  $again = Get-CheckAssessment $roundTrip.Probes $r '.hwp' $true
  Assert-Manual ((ConvertTo-Json $result -Depth 16 -Compress) -ceq (ConvertTo-Json $again -Depth 16 -Compress)) 'JSON round-trip mismatch'
}

function Test-ManualAssessment {
  foreach ($uac in @(0, 1)) {
    $case = New-ManualCase; $case.State.environment.enableLUA.value = $uac
    Assert-ManualFinding $case 'thumbnail-api-ok'
    Set-ManualFailure $case 'manual-document-shell'; Set-ManualFailure $case 'manual-document-force-extract'
    Assert-ManualFinding $case 'per-user-shell-activation-failed'
  }
  $case = New-ManualCase 'LocalMachine'; Assert-ManualFinding $case 'thumbnail-api-ok'
  Set-ManualFailure $case 'manual-document-shell'; Set-ManualFailure $case 'manual-document-force-extract'; Assert-ManualFinding $case 'unclassified-failure'
  $case = New-ManualCase; Set-ManualFailure $case 'manual-control-jpg-shell'; Assert-ManualFinding $case 'shell-control-failed'
  $case = New-ManualCase; Set-ManualFailure $case 'manual-document-shell'; Assert-ManualFinding $case 'unclassified-failure'
  $case = New-ManualCase; Set-ManualFailure $case 'manual-activate'; Assert-ManualFinding $case 'unclassified-failure'
  $case = New-ManualCase; $case.Probes[0].Result.resolvedHandler = '{00000000-0000-0000-0000-000000000000}'; Assert-ManualFinding $case 'other-handler-selected'
  $case = New-ManualCase; $case.State.environment.registrations[1].inproc = $case.State.environment.registrations[0].inproc; Assert-ManualFinding $case 'registration-ambiguous'
  $case = New-ManualCase; $case.State.environment.registrations[0].inproc.worker.sha256 = ('c' * 64); Assert-ManualFinding $case 'reference-mismatch'
  $case = New-ManualCase; $case.State.environment.registrations[1].inproc.status = 'unreadable'; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; $case.State.environment.enableLUA = @{ status = 'unreadable'; value = $null }; Assert-ManualFinding $case 'thumbnail-api-ok'
  $case = New-ManualCase; $case.Probes[2].Result.phase = 'child-timeout'; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; $case.Probes = $case.Probes[0..8]; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; $case.Probes[2] = $case.Probes[3]; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; $case.Probes[2].Result.width = 0; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; $case.Probes[2].Result.hresult = 'broken-json-contract'; Assert-ManualFinding $case 'diagnostic-invalid'
  $case = New-ManualCase; Set-ManualFailure $case 'manual-document-cache-only' '0x8004B200'; Assert-ManualFinding $case 'thumbnail-api-ok'
  Set-ManualFailure $case 'manual-document-shell'; Set-ManualFailure $case 'manual-document-force-extract'
  Assert-ManualFinding $case 'per-user-shell-activation-failed' # after-force cache hit cannot hide failure
  $reg = Get-CheckRegistration $case.State $case.Inventory $case.Probes[0].Result '.hwp'
  Assert-Manual ((Get-CheckAssessment $case.Probes $reg '.hwp' $false).exitCode -eq 2) 'integrity failure accepted'
}

function Assert-ManualThrows($Action) {
  $thrown = $false
  try { & $Action | Out-Null } catch { $thrown = $true }
  Assert-Manual $thrown 'expected rejection missing'
}

function Test-ManualFiles($Root) {
  $doc = Join-Path $Root "한글 ' 문서.hwp"; $jpg = Join-Path $Root '대조 사진.jpg'
  [IO.File]::WriteAllBytes($doc, [byte[]](1, 2, 3)); [IO.File]::WriteAllBytes($jpg, [byte[]](4, 5, 6))
  foreach ($path in @('\\server\share\file.hwp', '\\?\C:\file.hwp', 'C:\file.hwp:stream', 'C:\bad"file.hwp')) { Assert-ManualThrows { Assert-CheckLocalPath $path } }
  Assert-ManualThrows { New-CheckContext $doc $jpg $Root }
  Assert-ManualThrows { New-CheckContext $doc $doc (Join-Path $Root 'duplicate') }
  Assert-ManualThrows { Open-CheckSource (Join-Path $Root 'missing.hwp') @('.hwp') }
  $empty = Join-Path $Root 'empty.hwp'; [IO.File]::WriteAllBytes($empty, [byte[]]@())
  Assert-ManualThrows { Open-CheckSource $empty @('.hwp') }
  $locked = [IO.File]::Open($doc, [IO.FileMode]::Open, [IO.FileAccess]::Read, [IO.FileShare]::None)
  try { Assert-ManualThrows { Open-CheckSource $doc @('.hwp') } } finally { $locked.Dispose() }
  $junction = Join-Path $Root 'junction'
  New-Item -ItemType Junction -Path $junction -Target $Root | Out-Null
  try { Assert-ManualThrows { Assert-CheckLocalPath (Join-Path $junction 'empty.hwp') } }
  finally { [IO.Directory]::Delete($junction, $false) }
  $large = Join-Path $Root 'large.hwp'; $file = [IO.File]::OpenWrite($large)
  try { $file.SetLength(64MB + 1) } finally { $file.Dispose() }
  Assert-ManualThrows { Open-CheckSource $large @('.hwp') }
  $context = New-CheckContext $doc $jpg (Join-Path $Root 'output')
  try {
    Assert-ManualThrows { [IO.File]::WriteAllText($doc, 'concurrent change') }
    New-CheckCopies $context; Assert-CheckIntegrity $context
    [IO.File]::WriteAllBytes($context.Copies[0].Path, [byte[]](9))
    Assert-ManualThrows { Assert-CheckIntegrity $context }
  } finally { Assert-ManualThrows { Complete-CheckContext $context } }
  Assert-Manual ($null -eq $context.Temp) 'owned copies remained after integrity failure'
  Assert-Manual ([IO.File]::ReadAllBytes($doc).Length -eq 3) 'original file changed'
  $context = New-CheckContext $doc $jpg (Join-Path $Root 'output-two')
  New-CheckCopies $context; $unexpected = Join-Path $context.Temp 'unowned.txt'
  [IO.File]::WriteAllText($unexpected, 'test sentinel')
  Assert-ManualThrows { Complete-CheckContext $context }
  Assert-Manual (Test-Path -LiteralPath $unexpected) 'unexpected file deleted'
  [IO.File]::Delete($unexpected); [IO.Directory]::Delete($context.Temp, $false)
}

function Test-ManualPackage($Root) {
  $copy = Join-Path $Root 'package'; [void][IO.Directory]::CreateDirectory($copy)
  foreach ($file in (Get-ChildItem -LiteralPath $SupportRoot -File)) { [IO.File]::Copy($file.FullName, (Join-Path $copy $file.Name), $false) }
  [void](Read-CheckPackage $copy)
  $target = Join-Path $copy 'windows-thumbnail-token.cs'
  $bytes = [IO.File]::ReadAllBytes($target)
  [IO.File]::AppendAllText($target, 'tampered'); Assert-ManualThrows { Read-CheckPackage $copy }
  [IO.File]::WriteAllBytes($target, $bytes)
  $manifestPath = Join-Path $copy 'support-manifest.json'; $original = [IO.File]::ReadAllText($manifestPath)
  $manifest = $original | ConvertFrom-Json; $manifest.files[0].path = '../escape.ps1'
  [IO.File]::WriteAllText($manifestPath, (ConvertTo-Json $manifest -Depth 10)); Assert-ManualThrows { Read-CheckPackage $copy }
  [IO.File]::WriteAllText($manifestPath, $original)
  [IO.File]::Delete($target); Assert-ManualThrows { Read-CheckPackage $copy }
}

function Assert-ManualEvidence($Root) {
  $installer = Get-Content -LiteralPath (Join-Path $Root 'windows-installer-smoke-summary.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  $results = $installer.Installers[0].ManualChecks
  Assert-Manual ($results.Count -eq 3 -and @($results.fixtureId | Select-Object -Unique).Count -eq 3) 'manual integration evidence missing'
  foreach ($id in @('small-hwp', 'large-hwp', 'form-hwpx')) {
    $dir = Join-Path $Root "manual-check\$id"
    $s = Get-Content -LiteralPath (Join-Path $dir 'thumbnail-check-summary.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    Assert-Manual ($s.sourceSha -eq $package.Manifest.sourceSha -and $s.cleanup -and $s.integrity -and $s.phase -eq 'complete') 'manual summary identity or cleanup failed'
    $result = @($results | Where-Object { $_.fixtureId -eq $id })
    Assert-Manual ($result.Count -eq 1 -and $result[0].finding -eq $s.finding -and $result[0].exitCode -eq $s.exitCode) 'manual exit evidence mismatch'
    Assert-Manual ($s.extension -eq $(if ($id -eq 'form-hwpx') { '.hwpx' } else { '.hwp' }) -and $s.productVersion -eq $package.Manifest.productVersion) 'manual input identity mismatch'
    foreach ($pair in @(@('before-state', $s.before), @('after-state', $s.after))) {
      $raw = Get-Content -LiteralPath (Join-Path $dir "$($pair[0]).json") -Raw -Encoding UTF8 | ConvertFrom-Json
      Assert-Manual ((ConvertTo-Json $raw -Depth 20 -Compress) -ceq (ConvertTo-Json $pair[1] -Depth 20 -Compress)) 'manual state mismatch'
    }
    Assert-Manual ($s.probes.Count -eq 10 -and @($s.probes.Label | Select-Object -Unique).Count -eq 10 -and @(Get-ChildItem -LiteralPath $dir -Force).Count -eq 13) 'manual probes missing'
    $labels = @(Get-CheckLabels $s.extension)
    foreach ($probe in $s.probes) {
      Assert-Manual ($probe.Label -cin $labels) 'manual probe label invalid'
      $raw = Get-Content -LiteralPath (Join-Path $dir "$($probe.Label).json") -Raw -Encoding UTF8 | ConvertFrom-Json
      Assert-Manual ((ConvertTo-Json $raw -Depth 20 -Compress) -ceq (ConvertTo-Json $probe.Result -Depth 20 -Compress)) 'manual raw mismatch'
    }
    $assoc = @($s.probes | Where-Object { $_.Result.mode -eq 'association' })[0].Result
    $reg = Get-CheckRegistration $s.before $package.Inventory $assoc $s.extension
    Assert-Manual ($s.referenceStatus -eq $reg.referenceStatus -and $s.registrationScope -eq $reg.registrationScope) 'manual registration mismatch'
    Assert-Manual ((ConvertTo-Json $s.before.environment.registrations -Depth 16 -Compress) -ceq (ConvertTo-Json $s.after.environment.registrations -Depth 16 -Compress)) 'manual registration changed'
    $computed = Get-CheckAssessment $s.probes $reg $s.extension $s.integrity
    foreach ($key in $computed.Keys) { Assert-Manual ((ConvertTo-Json $computed[$key] -Depth 16 -Compress) -ceq (ConvertTo-Json $s.$key -Depth 16 -Compress)) 'manual assessment mismatch' }
    Assert-Manual ($s.finding -in @('thumbnail-api-ok', 'per-user-shell-activation-failed')) 'unclassified manual failure'
  }
}

function Test-ManualPrivacy($Root) {
  $case = New-ManualCase
  # Exercise the real orchestration/cleanup without invoking Shell on synthetic bytes.
  function Invoke-CheckProbe($Context, $Label, $Mode, $InputValue = '') {
    if ($Mode -eq 'state') { return $case.State }
    return @($case.Probes | Where-Object { $_.Label -eq $Label })[0].Result
  }
  $context = New-CheckContext (Join-Path $Root "한글 ' 문서.hwp") (Join-Path $Root '대조 사진.jpg') (Join-Path $Root 'privacy')
  try {
    $result = Invoke-ManualThumbnailCheck $context @{ Inventory = $case.Inventory; Manifest = $package.Manifest }
    Assert-Manual ($result.finding -eq 'thumbnail-api-ok' -and $result.probes.Count -eq 10) 'synthetic orchestration incomplete'
    $json = ConvertTo-Json $result -Depth 20 -Compress
    foreach ($source in $context.Sources.Values) {
      foreach ($private in @($source.Path, [IO.Path]::GetFileName($source.Path), $source.Hash)) {
        Assert-Manual (-not $json.Contains($private) -and -not $json.Contains($private.Replace('\', '\\'))) 'private input leaked'
      }
    }
  } finally { Complete-CheckContext $context }
  $result.cleanup = $true; Set-CheckIncomplete $result 'synthetic-cleanup-failure'
  Assert-Manual ($result.exitCode -eq 2 -and $result.thumbnailStatus -ne 'passed' -and $result.phase -eq 'incomplete') 'cleanup failure retained success'
}

function Test-ManualEntry($Root) {
  $entry = Join-Path $SupportRoot 'windows-thumbnail-check.ps1'; $output = Join-Path $Root 'must-not-exist'
  $argsList = @('-NoProfile', '-NonInteractive', '-STA', '-File', $entry, '-DocumentPath', (Join-Path $Root 'private.hwp'), '-JpgPath', (Join-Path $Root 'private.jpg'), '-OutputDirectory', $output)
  $stdout = & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" @argsList
  Assert-Manual ($LASTEXITCODE -eq 2 -and ($stdout -join '') -match 'Consent' -and -not (Test-Path -LiteralPath $output)) 'consent gate failed'
  $stdout = & "$env:SystemRoot\SysWOW64\WindowsPowerShell\v1.0\powershell.exe" @argsList -Consent
  Assert-Manual ($LASTEXITCODE -eq 2 -and ($stdout -join '') -match 'diagnostic-invalid' -and -not (Test-Path -LiteralPath $output)) 'x86 gate failed'
  Assert-Manual (($stdout -join '') -notmatch 'private.hwp|private.jpg|must-not-exist') 'private error leaked'
}

function Test-ManualChildFailures {
  $tokens = $null; $errors = $null; $Mode = 'shell'; $TimeoutSeconds = 1
  $ast = [Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot 'windows-thumbnail-diagnostics.ps1'), [ref]$tokens, [ref]$errors)
  Assert-Manual ($errors.Count -eq 0) 'diagnostic parse failed'
  foreach ($node in $ast.EndBlock.Statements) {
    if ($node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -in @('New-ThumbnailFailure', 'Read-ThumbnailChildResult')) { . ([scriptblock]::Create($node.Extent.Text)) }
  }
  $process = [pscustomobject]@{ ExitCode = 0; Timeout = $false; Killed = $false }
  $process | Add-Member ScriptMethod WaitForExit { param($Milliseconds) return -not $this.Timeout }
  $process | Add-Member ScriptMethod Kill { $this.Killed = $true }
  $stdout = [pscustomobject]@{ Result = '{invalid JSON' }; $stderr = [pscustomobject]@{ Result = '' }
  foreach ($stream in @($stdout, $stderr)) { $stream | Add-Member ScriptMethod Wait { param($Milliseconds) return $true } }
  $result = Read-ThumbnailChildResult $process $stdout $stderr
  Assert-Manual ($result.detailCode -eq 'invalid-json-contract') 'malformed child JSON accepted'
  $process.Timeout = $true
  $result = Read-ThumbnailChildResult $process $stdout $stderr
  Assert-Manual ($result.phase -eq 'child-timeout' -and $process.Killed) 'child timeout was not isolated'
}

function Invoke-ManualTestProcess($Root) {
  $script = (Join-Path $PSScriptRoot 'windows-thumbnail-check-tests.ps1').Replace("'", "''")
  $inputRoot = $Root.Replace("'", "''")
  # Match Actions' built-in shell trailer, including a stale native exit code.
  $command = "`$ErrorActionPreference = 'Stop'; & '$script' -SupportRoot '$inputRoot'; if (Test-Path -LiteralPath variable:\LASTEXITCODE) { exit `$LASTEXITCODE }"
  $info = New-Object Diagnostics.ProcessStartInfo
  $info.FileName = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $info.Arguments = '-NoProfile -NonInteractive -STA -EncodedCommand ' + [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
  $info.UseShellExecute = $false; $info.CreateNoWindow = $true
  $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
  $process = New-Object Diagnostics.Process; $process.StartInfo = $info
  try {
    Assert-Manual ($process.Start()) 'manual test child did not start'
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    Assert-Manual ($process.WaitForExit(60000)) 'manual test child timed out'
    Assert-Manual ($stdout.Wait(1000) -and $stderr.Wait(1000)) 'manual test child output incomplete'
    return @{ Code = $process.ExitCode; Stdout = $stdout.Result; Stderr = $stderr.Result }
  } finally {
    try { if (-not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(3000) } } catch { }
    $process.Dispose()
  }
}

function Test-ManualProcessExit {
  $passed = Invoke-ManualTestProcess $SupportRoot
  Assert-Manual ($passed.Code -eq 0 -and $passed.Stdout -match 'tests passed\.') "manual suite process failed: $($passed.Stderr)"
  # A payload file cannot be a support directory: the real child must fail before success.
  $failed = Invoke-ManualTestProcess (Join-Path $SupportRoot 'support-manifest.json')
  Assert-Manual ($failed.Code -ne 0 -and $failed.Stdout -notmatch 'tests passed\.') 'invalid package exited successfully'
  Write-Output 'Manual suite process exit contract passed (success=0, invalid package=nonzero).'
}

if ($SummaryRoot) { Assert-ManualEvidence $SummaryRoot; Write-Output 'Manual thumbnail evidence verified; product failures remain failures.'; exit 0 }
if ($VerifyExitCode) { Test-ManualProcessExit; exit 0 }
Test-ManualAssessment
Test-ManualChildFailures
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-check-tests-' + [Guid]::NewGuid().ToString('N'))
[void][IO.Directory]::CreateDirectory($testRoot)
try {
  Test-ManualFiles $testRoot
  Test-ManualPackage $testRoot
  Test-ManualPrivacy $testRoot
  Test-ManualEntry $testRoot
} finally {
  Assert-Manual ([IO.Path]::GetFileName($testRoot) -match '^alhangeul-check-tests-[0-9a-f]{32}$') 'test cleanup scope'
  Remove-Item -LiteralPath $testRoot -Recurse -Force
}
Write-Output 'Manual thumbnail package, classification, input, integrity and cleanup tests passed.'
# Expected child rejection codes must not become the suite's final process status.
# This is reached only after every assertion and the finally cleanup succeeded.
exit 0
