param([ValidateSet('Setup','Restore')][string]$Phase='Setup', [Parameter(Mandatory=$true)][string]$EvidencePath)
$ErrorActionPreference='Stop'
if ($env:GITHUB_ACTIONS -cne 'true' -or $env:RUNNER_ENVIRONMENT -cne 'github-hosted') { throw 'Disposable hosted CI only' }
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class CaptureDisplay {
 // DEVMODEW public layout, retaining the complete native buffer during enumeration.
 [StructLayout(LayoutKind.Explicit, Size=220)] public struct Mode {
  [FieldOffset(68)] public ushort Size;
  [FieldOffset(72)] public uint Fields;
  [FieldOffset(172)] public uint Width;
  [FieldOffset(176)] public uint Height;
 }
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern bool EnumDisplaySettings(string device,int index,ref Mode mode);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int ChangeDisplaySettings(ref Mode mode,uint flags);
 public static Mode Current() {
  var m=new Mode { Size=220 };
  if(!EnumDisplaySettings(null,-1,ref m)) throw new Exception("Cannot read current display mode");
  return m;
 }
 public static int Apply(uint width,uint height,uint flags) {
  var m=Current();m.Fields=0x180000;m.Width=width;m.Height=height;
  return ChangeDisplaySettings(ref m,flags);
 }
}
'@
if ($Phase -eq 'Restore') {
  if (-not (Test-Path -LiteralPath $EvidencePath)) { return }
  $report=Get-Content -LiteralPath $EvidencePath -Raw | ConvertFrom-Json
  $code=[CaptureDisplay]::Apply($report.before.width,$report.before.height,0)
  $now=[CaptureDisplay]::Current()
  $report | Add-Member -NotePropertyName restored -NotePropertyValue ($code -eq 0 -and $now.Width -eq $report.before.width -and $now.Height -eq $report.before.height) -Force
  $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
  if (-not $report.restored) { throw 'Display restoration failed' }
  return
}
$old=[CaptureDisplay]::Current()
$report=@{before=@{width=$old.Width;height=$old.Height};requested=@{width=1920;height=1080};testCode=$null;applyCode=$null;after=$null}
try {
  $report.testCode=[CaptureDisplay]::Apply(1920,1080,2)
  if ($report.testCode -ne 0) { throw '1920x1080 not supported by this runner display' }
  $report.applyCode=[CaptureDisplay]::Apply(1920,1080,0)
  Start-Sleep -Seconds 2
  $now=[CaptureDisplay]::Current()
  $report.after=@{width=$now.Width;height=$now.Height}
  if ($report.applyCode -ne 0 -or $now.Width -lt 1400 -or $now.Height -lt 1000) { throw 'Capture display size insufficient' }
} finally { $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
