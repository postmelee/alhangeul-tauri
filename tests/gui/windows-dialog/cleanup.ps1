param(
  [Parameter(Mandatory = $true)][string]$CleanupStatePath,
  [Parameter(Mandatory = $true)][string]$EvidencePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$result = @{ passed = $false; stateFound = $false; processStopped = $false; fixtureRemoved = $false }
try {
  if (Test-Path -LiteralPath $CleanupStatePath -PathType Leaf) {
    $result.stateFound = $true
    $state = Get-Content -LiteralPath $CleanupStatePath -Raw -Encoding UTF8 | ConvertFrom-Json
    $root = [IO.Path]::GetFullPath($state.root)
    $parent = [IO.Path]::GetDirectoryName($root).TrimEnd('\')
    if ($state.kind -cne 'alhangeul-dialog-fixture' -or
        $parent -ine [IO.Path]::GetTempPath().TrimEnd('\') -or
        [IO.Path]::GetFileName($root) -cnotmatch '^alhangeul-dialog-[0-9a-f]{32}$') {
      throw 'Unrecognized cleanup scope.'
    }
    if ($state.processId -gt 0) {
      $owned = Get-Process -Id $state.processId -ErrorAction SilentlyContinue
      if ($null -ne $owned) {
        if ($owned.ProcessName -ine 'powershell' -or
            $owned.StartTime.ToUniversalTime().Ticks.ToString() -cne $state.startTicks) {
          throw 'Cleanup process identity changed.'
        }
        $owned.Kill()
        if (-not $owned.WaitForExit(5000)) { throw 'Cleanup process did not stop.' }
        $owned.Dispose()
      }
    }
    $result.processStopped = $true
    if (Test-Path -LiteralPath $root) { Remove-Item -LiteralPath $root -Recurse -Force }
    $result.fixtureRemoved = -not (Test-Path -LiteralPath $root)
    Remove-Item -LiteralPath $CleanupStatePath -Force
  }
  $result.passed = $true
} catch { $result.errorType = $_.Exception.GetType().Name }
$result | ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
if (-not $result.passed) { throw 'Controlled fixture cleanup failed; no broader cleanup attempted.' }
