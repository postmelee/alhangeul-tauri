# Runs only during specialize on the newly created disposable guest disk.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$media = @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'ALHPAYLOAD' -and $_.DriveLetter })
if ($media.Count -ne 1 -or (Test-Path 'C:\AlhProbe')) { throw 'fresh-guest-media-required' }
$source = $media[0].DriveLetter + ':\payload'
New-Item -ItemType Directory -Path 'C:\AlhProbe' | Out-Null
& icacls.exe 'C:\AlhProbe' /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'protected-payload-acl-failed' }
Copy-Item -Path ($source + '\*') -Destination 'C:\AlhProbe' -Recurse
New-Item -ItemType Directory -Path 'C:\AlhProbe\evidence' | Out-Null
& icacls.exe 'C:\AlhProbe\evidence' /grant '*S-1-5-32-545:(OI)(CI)M' /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'evidence-acl-failed' }
$startup = [Environment]::GetFolderPath('CommonStartup')
'@powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -File C:\AlhProbe\scripts\ci\guest-ui-probe.ps1' |
  Set-Content -LiteralPath (Join-Path $startup 'alh-probe.cmd') -Encoding ASCII

$inputData = Get-Content 'C:\AlhProbe\input.json' -Raw | ConvertFrom-Json
if ($inputData.scenario -eq 'msi' -or $inputData.prerequisites.Count -gt 0) {
  New-Item -ItemType Directory -Path 'C:\AlhProbe\requests', 'C:\AlhProbe\admin-results' | Out-Null
  & icacls.exe 'C:\AlhProbe\requests' /grant '*S-1-5-32-545:(OI)(CI)M' /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'request-acl-failed' }
  & icacls.exe 'C:\AlhProbe\admin-results' /inheritance:r /grant:r '*S-1-5-18:(OI)(CI)F' '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-32-545:(OI)(CI)RX' /Q | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'admin-result-acl-failed' }
  Set-Content -LiteralPath 'C:\AlhProbe\admin-results\boundary.txt' -Value 'protected' -Encoding ASCII
  $engine = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $action = New-ScheduledTaskAction -Execute $engine -Argument '-NoProfile -ExecutionPolicy Bypass -File C:\AlhProbe\scripts\ci\guest-ui-admin.ps1'
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Minutes 35)
  Register-ScheduledTask -TaskName 'AlhGuestInstaller' -Action $action -Trigger $trigger -Settings $settings -User 'SYSTEM' -RunLevel Highest | Out-Null
}
