param([string]$EvidencePath = '')
# Read-only hosted-runner observation. No installer, registry writes or names in evidence.
# .NET returns normalized strings: this is NOT raw UTF-16 decoder acceptance.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
function Get-DisplayType($Kind) {
  switch ([int]$Kind) {
    1 { return 'REG_SZ' }
    2 { return 'REG_EXPAND_SZ' }
    3 { return 'REG_BINARY' }
    4 { return 'REG_DWORD' }
    7 { return 'REG_MULTI_SZ' }
    11 { return 'REG_QWORD' }
    default { return 'OTHER' }
  }
}
foreach ($pair in @(@(1, 'REG_SZ'), @(2, 'REG_EXPAND_SZ'), @(3, 'REG_BINARY'), @(4, 'REG_DWORD'), @(7, 'REG_MULTI_SZ'), @(11, 'REG_QWORD'), @(0, 'OTHER'), @(-1, 'OTHER'))) {
  if ((Get-DisplayType $pair[0]) -cne $pair[1]) { throw 'Display-name type projection failed.' }
}
function Get-DisplayCategory($Kind, $Value) {
  if ($Kind -ne [Microsoft.Win32.RegistryValueKind]::String) { return 'unsupportedTypes' }
  if ($Value -isnot [string]) { return 'unreadableValues' }
  if ($Value.Length -gt 16383) { return 'oversizedStrings' }
  if ($Value.Contains([string][char]0)) { return 'embeddedNullStrings' }
  if ($Value.Length -eq 0) { return 'emptyStrings' }
  return 'nonEmptyStrings'
}
$cases = @(
  @([Microsoft.Win32.RegistryValueKind]::String, '', 'emptyStrings'),
  @([Microsoft.Win32.RegistryValueKind]::String, 'Alhangeul', 'nonEmptyStrings'),
  @([Microsoft.Win32.RegistryValueKind]::String, 'Other application', 'nonEmptyStrings'),
  @([Microsoft.Win32.RegistryValueKind]::DWord, 1, 'unsupportedTypes'),
  @([Microsoft.Win32.RegistryValueKind]::ExpandString, '%NAME%', 'unsupportedTypes'),
  @([Microsoft.Win32.RegistryValueKind]::String, $null, 'unreadableValues'),
  @([Microsoft.Win32.RegistryValueKind]::String, ('a' * 16384), 'oversizedStrings'),
  @([Microsoft.Win32.RegistryValueKind]::String, ('a' + [char]0 + 'b'), 'embeddedNullStrings')
)
foreach ($case in $cases) {
  if ((Get-DisplayCategory $case[0] $case[1]) -cne $case[2]) { throw 'Display-name shape classification failed.' }
}
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted' -or $env:RUNNER_OS -cne 'Windows') {
  throw 'Live observation requires disposable hosted Windows CI.'
}
$evidence = [ordered]@{ schemaVersion = 2; normalizedValues = $true; rawDecodeVerified = $false; rows = @() }
foreach ($hive in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {
  $row = [ordered]@{ hive = $hive.ToString(); status = 'observed'; entries = 0; missingDisplayNames = 0
    emptyStrings = 0; nonEmptyStrings = 0; unsupportedTypes = 0; unreadableValues = 0
    oversizedStrings = 0; embeddedNullStrings = 0; unreadableKeys = 0; limitExceeded = $false
    displayTypes = [ordered]@{ REG_SZ = 0; REG_EXPAND_SZ = 0; REG_BINARY = 0; REG_DWORD = 0; REG_MULTI_SZ = 0; REG_QWORD = 0; OTHER = 0 } }
  $base = $null; $root = $null
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($hive, [Microsoft.Win32.RegistryView]::Registry64)
    $root = $base.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Uninstall', $false)
    if ($null -eq $root) { $row.status = 'missing'; continue }
    $names = @($root.GetSubKeyNames())
    if ($names.Count -gt 4096) { $row.limitExceeded = $true; $row.status = 'partial' }
    foreach ($name in @($names | Select-Object -First 4096)) {
      $entry = $null; $row.entries++
      try {
        $entry = $root.OpenSubKey($name, $false)
        if ($null -eq $entry) { $row.unreadableKeys++; continue }
        if ($entry.GetValueNames() -notcontains 'DisplayName') { $row.missingDisplayNames++; continue }
        $kind = $entry.GetValueKind('DisplayName')
        $row.displayTypes[(Get-DisplayType $kind)]++
        if ($kind -ne [Microsoft.Win32.RegistryValueKind]::String) { $row.unsupportedTypes++; continue }
        $value = $entry.GetValue('DisplayName', $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        $row[(Get-DisplayCategory $kind $value)]++
      } catch { $row.unreadableKeys++ }
      finally { if ($null -ne $entry) { $entry.Dispose() } }
    }
    if ($row.unreadableKeys -gt 0) { $row.status = 'partial' }
  } catch { $row.status = 'unreadable' }
  finally {
    if ($null -ne $root) { $root.Dispose() }
    if ($null -ne $base) { $base.Dispose() }
    $evidence.rows += $row
  }
}
if ($EvidencePath) { $evidence | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
Write-Output 'Install record shapes: 8 synthetic shapes and 8 type projections passed; hosted registry counts observed read-only, no product identity acceptance.'
