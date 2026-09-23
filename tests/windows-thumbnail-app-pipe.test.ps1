param([string]$EvidencePath = '')
# Real Windows PowerShell 5.1 pipes; synthetic child only, not Shell acceptance.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot '../scripts/windows-thumbnail-app-smoke.ps1')
function Assert-Condition($Condition, $Message) { if (-not $Condition) { throw $Message } }
Assert-Condition ($env:OS -eq 'Windows_NT' -and $PSVersionTable.PSEdition -eq 'Desktop') 'This regression requires Windows PowerShell 5.1.'

function New-TransportReport {
  return [ordered]@{ stage = 'created'; failureStage = $null; errorHresult = $null
    processStarted = $false; processReaped = $null; exitCode = $null; stdoutChars = $null; stderrChars = $null }
}
function Invoke-InputCapture($Executable, $Payload, $FixedStart, $ChildArgument) {
  $process = [Diagnostics.Process]::new(); $report = New-TransportReport
  try {
    $process.StartInfo = [Diagnostics.ProcessStartInfo]@{
      FileName = $Executable; Arguments = $ChildArgument; UseShellExecute = $false; CreateNoWindow = $true
      RedirectStandardInput = $true; RedirectStandardOutput = $true; RedirectStandardError = $true
      StandardOutputEncoding = [Text.UTF8Encoding]::new($false, $true)
      StandardErrorEncoding = [Text.UTF8Encoding]::new($false, $true)
    }
    if ($FixedStart) { Start-AppDiagnosticProcess $process $report }
    else { $report.processStarted = $process.Start() }
    Assert-Condition $report.processStarted 'Synthetic receiver did not start.'
    $output = $process.StandardOutput.ReadToEndAsync(); $errors = $process.StandardError.ReadToEndAsync()
    $process.StandardInput.Write($Payload); $process.StandardInput.Close()
    Assert-Condition ($process.WaitForExit(10000)) 'Synthetic receiver timed out.'
    Assert-Condition ($output.Wait(5000) -and $errors.Wait(5000)) 'Synthetic pipes did not close.'
    Assert-Condition ($errors.Result.Length -eq 0) 'Synthetic receiver emitted stderr.'
    $capture = $null
    if ($output.Result.Length -gt 0) { $capture = $output.Result | ConvertFrom-Json }
    return [ordered]@{ exitCode = $process.ExitCode; stdoutChars = $output.Result.Length; capture = $capture }
  } finally {
    if ($report.processStarted -and -not $process.HasExited) { $process.Kill(); [void]$process.WaitForExit(5000) }
    if ($report.processStarted) { Assert-Condition $process.HasExited 'Synthetic receiver was not reclaimed.' }
    $process.Dispose()
  }
}
function Assert-EncodingRestored($Expected) {
  $actual = [Console]::InputEncoding
  Assert-Condition ($actual.CodePage -eq $Expected.CodePage -and
    [Convert]::ToBase64String($actual.GetPreamble()) -ceq [Convert]::ToBase64String($Expected.GetPreamble())) 'Input encoding was not restored.'
}

$savedEncoding = [Console]::InputEncoding
$directory = Join-Path ([IO.Path]::GetTempPath()) ('alhangeul-pipe-test-' + [Guid]::NewGuid())
$executable = Join-Path $directory 'synthetic-diagnostic-child.exe'
$evidence = [ordered]@{ schemaVersion = 1; status = 'failed'; testOnly = $true
  defaultCodePage = $savedEncoding.CodePage; defaultPreambleBytes = $savedEncoding.GetPreamble().Length; cases = @() }
try {
  [void](New-Item -ItemType Directory -Path $directory)
  Add-Type -Path (Join-Path $PSScriptRoot 'fixtures/windows-thumbnail-ipc-child.cs') -OutputAssembly $executable -OutputType WindowsApplication -ReferencedAssemblies @('System.dll', 'System.Web.Extensions.dll')
  $request = [ordered]@{ schemaVersion = 1; requestId = [Guid]::NewGuid().ToString(); operation = 'suite'; fixtureId = $null; consent = $true } | ConvertTo-Json -Compress
  $baseline = Invoke-InputCapture $executable $request $false '--capture-input'
  Assert-Condition ($baseline.exitCode -eq 0) 'Default encoding capture failed.'
  $evidence.cases += [ordered]@{ name = 'runner-default'; result = $baseline }

  $bomEncoding = [Text.UTF8Encoding]::new($true)
  [Console]::InputEncoding = $bomEncoding
  $legacy = Invoke-InputCapture $executable $request $false '--capture-input'
  Assert-Condition ($legacy.exitCode -eq 0 -and $legacy.capture.bom -eq $true -and
    $legacy.capture.byteLength -eq ([Text.Encoding]::UTF8.GetByteCount($request) + 3)) 'Legacy BOM injection was not reproduced.'
  $evidence.cases += [ordered]@{ name = 'legacy-bom'; result = $legacy }
  $rejected = Invoke-InputCapture $executable $request $false '--alhangeul-thumbnail-diagnostic-child'
  Assert-Condition ($rejected.exitCode -eq 1 -and $rejected.stdoutChars -eq 0) 'Strict receiver accepted a BOM-prefixed request.'
  $evidence.cases += [ordered]@{ name = 'legacy-strict-rejection'; result = $rejected }

  $unicode = '{"note":"' + [char]0xd55c + [char]0xae00 + '"}'
  $hash = [Security.Cryptography.SHA256]::Create()
  try { $expectedHash = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($unicode))) }
  finally { $hash.Dispose() }
  foreach ($encoding in @($bomEncoding, [Text.Encoding]::GetEncoding(437))) {
    [Console]::InputEncoding = $encoding
    $fixed = Invoke-InputCapture $executable $unicode $true '--capture-input'
    Assert-Condition ($fixed.exitCode -eq 0 -and $fixed.capture.bom -eq $false -and $fixed.capture.firstByte -eq 123 -and
      $fixed.capture.byteLength -eq [Text.Encoding]::UTF8.GetByteCount($unicode) -and
      $fixed.capture.sha256 -ceq $expectedHash) 'Fixed transport did not send exact BOM-less UTF-8 bytes.'
    Assert-EncodingRestored $encoding
    $evidence.cases += [ordered]@{ name = 'fixed-unicode'; initialCodePage = $encoding.CodePage; result = $fixed }
  }
  [Console]::InputEncoding = $bomEncoding
  $report = New-TransportReport
  $suite = Invoke-AppDiagnosticTransport $executable $report
  Assert-Condition ($suite.testOnly -eq $true -and $suite.cleanup -eq $true -and $report.exitCode -eq 0 -and $report.processReaped -eq $true) 'Real transport envelope/EOF round trip failed.'
  Assert-EncodingRestored $bomEncoding
  $evidence.cases += [ordered]@{ name = 'fixed-suite-roundtrip'; result = $report }

  $report = New-TransportReport; $failed = $false
  try { [void](Invoke-AppDiagnosticTransport (Join-Path $directory 'missing.exe') $report) } catch { $failed = $true }
  Assert-Condition ($failed -and $report.failureStage -ceq 'process-start' -and -not $report.processStarted) 'Missing child was not rejected at process start.'
  Assert-EncodingRestored $bomEncoding
  $evidence.cases += [ordered]@{ name = 'start-failure-restoration'; result = $report }
  $evidence.status = 'passed'
  Write-Output 'Real Windows IPC: legacy BOM rejection, exact UTF-8, EOF/envelope and encoding restoration passed; no Shell acceptance.'
} finally {
  [Console]::InputEncoding = $savedEncoding
  if (Test-Path -LiteralPath $executable) { Remove-Item -LiteralPath $executable }
  if (Test-Path -LiteralPath $directory) { Remove-Item -LiteralPath $directory }
  if ($EvidencePath) { $evidence | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
}
