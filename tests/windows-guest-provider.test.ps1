Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -Path (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-provider.cs')
$missing = Join-Path $env:TEMP ([guid]::NewGuid().ToString() + '.hwp')
$result = [Alhangeul.GuestProviderDiagnostic.Probe]::Run($missing)
if ($result.status -ne 'failed' -or $result.phase -ne 'open-stream' -or $result.hresult -ne '0x80070002' -or (Test-Path $missing)) {
  throw 'provider-stream-must-be-read-only-and-fail-for-missing-input'
}
Write-Output 'Provider interop compiles; missing stream is rejected without creating a file.'
