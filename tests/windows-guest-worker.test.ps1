Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-upgrade.ps1')
. (Join-Path $PSScriptRoot '../scripts/ci/guest-ui-worker-diagnostic.ps1')
$root = Join-Path $env:TEMP ('alh-worker-contract-' + [guid]::NewGuid().ToString())
function Assert-WorkerCondition($Condition, $Message) { if (-not $Condition) { throw $Message } }
function Set-TestRequest([byte]$Mode) {
  $request = Join-Path $root 'verification\small-hwp.request'
  [IO.File]::WriteAllBytes($request, [byte[]]@($Mode))
  $script:inputData.workerDiagnostic.requestSha256 = (Get-FileHash $request -Algorithm SHA256).Hash.ToLowerInvariant()
}
try {
  New-Item -ItemType Directory -Path (Join-Path $root 'verification') | Out-Null
  $executable = Join-Path $root 'AlhangeulThumbnailWorker.exe'
  Add-Type -OutputAssembly $executable -OutputType ConsoleApplication -TypeDefinition @'
using System;
using System.IO;
using System.Threading;
public static class GuestWorkerFixture {
  static byte[] Header(ushort kind, uint bytes, uint width, uint height, uint stride) {
    byte[] h = new byte[64];
    System.Text.Encoding.ASCII.GetBytes("ALHGTHM\0").CopyTo(h, 0);
    BitConverter.GetBytes((ushort)1).CopyTo(h, 8);
    BitConverter.GetBytes(kind).CopyTo(h, 10);
    BitConverter.GetBytes(bytes).CopyTo(h, 12);
    BitConverter.GetBytes(width).CopyTo(h, 16);
    BitConverter.GetBytes(height).CopyTo(h, 20);
    BitConverter.GetBytes(stride).CopyTo(h, 24);
    return h;
  }
  public static void Main() {
    Stream input = Console.OpenStandardInput(), output = Console.OpenStandardOutput();
    int mode = input.ReadByte();
    while (input.ReadByte() >= 0) {}
    if (mode == 1) { Thread.Sleep(30000); return; }
    Thread.Sleep(1700);
    byte[] header = Header(2, 4, 1, 1, 4);
    if (mode == 2) header[0] = 0;
    output.Write(header, 0, header.Length);
    output.Write(new byte[4], 0, 4);
    header = Header(4, 0, 0, 0, 0);
    output.Write(header, 0, header.Length);
    output.Flush();
  }
}
'@
  $script:inputData = @{
    binaries = @([pscustomobject]@{ name = 'AlhangeulThumbnailWorker.exe'; bytes = (Get-Item $executable).Length; sha256 = (Get-FileHash $executable -Algorithm SHA256).Hash.ToLowerInvariant() })
    workerDiagnostic = @{ requestSha256 = '' }
  }
  Set-TestRequest 0
  $result = Measure-GuestWorker $root
  Assert-WorkerCondition ($result.status -eq 'observed' -and $result.processReaped -and $result.exitCode -eq 0 -and $result.stderrChars -eq 0) 'worker-normal-transport'
  Assert-WorkerCondition ($result.frames.Count -eq 2 -and $result.frames[0].kind -eq 2 -and $result.frames[1].kind -eq 4) 'worker-frames-missing'
  Assert-WorkerCondition ($result.frames[0].headerMs -ge 1700) 'worker-timing-not-measured'
  Set-TestRequest 2
  $bad = Measure-GuestWorker $root
  Write-Output ($bad | ConvertTo-Json -Depth 6 -Compress)
  Assert-WorkerCondition ($bad.status -eq 'failed' -and $bad.failure -eq 'worker-frame-header' -and $bad.processReaped) 'worker-invalid-frame-accepted'
  Set-TestRequest 1
  $slow = Measure-GuestWorker $root
  Assert-WorkerCondition ($slow.status -eq 'failed' -and $slow.failure -eq 'worker-diagnostic-timeout' -and $slow.processReaped) 'worker-timeout-or-cleanup'
  $inputData.workerDiagnostic.requestSha256 = '0' * 64
  $thrown = $false
  try { Measure-GuestWorker $root | Out-Null } catch { $thrown = $_.Exception.Message -eq 'worker-request-hash-mismatch' }
  Assert-WorkerCondition $thrown 'worker-request-mismatch-accepted'
} finally { Remove-Item -LiteralPath $root -Recurse -Force }
Write-Output 'Worker timing, malformed frame, request integrity and owned process timeout passed.'
