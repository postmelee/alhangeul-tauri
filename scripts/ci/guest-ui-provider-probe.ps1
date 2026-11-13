# Diagnostic child only: preserve the real Shell failure and use the installed COM class.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$root = 'C:\AlhProbe'
try {
  $data = Get-Content (Join-Path $root 'input.json') -Raw | ConvertFrom-Json
  $fixtures = (Get-Content (Join-Path $root 'scripts\windows-thumbnail-fixtures.json') -Raw | ConvertFrom-Json).fixtures
  $fixture = @($fixtures | Where-Object id -eq 'small-hwp')[0]
  $file = Join-Path $root $fixture.path
  if ((Get-FileHash $file -Algorithm SHA256).Hash.ToLowerInvariant() -cne $fixture.sha256) { throw 'fixture-mismatch' }
  Add-Type -Path (Join-Path $PSScriptRoot 'guest-ui-provider.cs')
  $raw = [Alhangeul.GuestProviderDiagnostic.Probe]::Run($file)
  $result = $raw | Select-Object -Property * -ExcludeProperty modulePath
  $expected = @($data.binaries | Where-Object kind -eq 'thumbnail-handler')[0]
  $matched = $raw.modulePath -and (Get-FileHash $raw.modulePath -Algorithm SHA256).Hash.ToLowerInvariant() -ceq $expected.sha256
  $result | Add-Member -NotePropertyName installedModuleHashMatched -NotePropertyValue ([bool]$matched)
  [Console]::Out.WriteLine(($result | ConvertTo-Json -Depth 6 -Compress))
} catch {
  [Console]::Out.WriteLine((@{ status = 'failed'; phase = 'provider-child'; hresult = ('0x{0:X8}' -f $_.Exception.HResult) } | ConvertTo-Json -Compress))
}
