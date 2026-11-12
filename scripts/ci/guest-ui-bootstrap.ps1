# Runs only during specialize on the newly created disposable guest disk.
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$media = @(Get-Volume | Where-Object { $_.FileSystemLabel -eq 'ALHPAYLOAD' -and $_.DriveLetter })
if ($media.Count -ne 1 -or (Test-Path 'C:\AlhProbe')) { throw 'fresh-guest-media-required' }
$source = $media[0].DriveLetter + ':\payload'
New-Item -ItemType Directory -Path 'C:\AlhProbe' | Out-Null
Copy-Item -Path ($source + '\*') -Destination 'C:\AlhProbe' -Recurse
New-Item -ItemType Directory -Path 'C:\AlhProbe\evidence' | Out-Null
& icacls.exe 'C:\AlhProbe\evidence' /grant '*S-1-5-32-545:(OI)(CI)M' /Q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'evidence-acl-failed' }
$startup = [Environment]::GetFolderPath('CommonStartup')
'@powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -STA -File C:\AlhProbe\scripts\ci\guest-ui-probe.ps1' |
  Set-Content -LiteralPath (Join-Path $startup 'alh-probe.cmd') -Encoding ASCII
