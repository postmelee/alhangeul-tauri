$ErrorActionPreference = 'Stop'
$out = Join-Path $PWD 'privacy-evidence'
$installer = Join-Path $out 'Alhangeul_0.1.3_x64-setup.exe'
$install = Start-Process $installer -ArgumentList '/S' -Wait -PassThru
if ($install.ExitCode -ne 0) { throw "NSIS install failed: $($install.ExitCode)" }
$appPath = Join-Path $env:LOCALAPPDATA 'Alhangeul\Alhangeul.exe'
if (-not (Test-Path $appPath)) { throw 'installed executable missing' }
# Disposable runner only: connection metadata, not decrypted HTTP or document bytes.
auditpol /set /subcategory:'Filtering Platform Connection' /success:enable
if ($LASTEXITCODE -ne 0) { throw 'WFP auditing unavailable' }
$start = Get-Date
$app = Start-Process $appPath -PassThru
try {
  Start-Sleep -Seconds 45
  if ($app.HasExited) { throw 'app exited before observation' }
  Add-Type -AssemblyName System.Windows.Forms
  Add-Type -AssemblyName System.Drawing
  $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
  $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $out 'app-windows.png'))
  $graphics.Dispose(); $bitmap.Dispose()
  $events = @(Get-WinEvent -FilterHashtable @{LogName='Security'; Id=5156; StartTime=$start} | ForEach-Object {
    $xml = [xml]$_.ToXml(); $fields = @{}
    foreach ($item in $xml.Event.EventData.Data) { $fields[$item.Name] = $item.'#text' }
    if ($fields.Application -match '(?i)(alhangeul|msedgewebview2)\.exe$') {
      [ordered]@{ time=$_.TimeCreated.ToUniversalTime().ToString('o'); process=[IO.Path]::GetFileName($fields.Application); pid=$fields.ProcessID; destination=$fields.DestAddress; port=$fields.DestPort; protocol=$fields.Protocol; direction=$fields.Direction }
    }
  })
  $events | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $out 'connections.json')
  Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^(Alhangeul|msedgewebview2)\.exe$' } | Select-Object Name,ProcessId,ParentProcessId | ConvertTo-Json | Set-Content (Join-Path $out 'processes.json')
  Resolve-DnsName postmelee.github.io | Select-Object Name,IPAddress,Type | ConvertTo-Json | Set-Content (Join-Path $out 'pages-dns-after.json')
  Get-ChildItem (Join-Path $env:LOCALAPPDATA 'io.github.postmelee.alhangeul') -Recurse -Filter '*.log*' -ErrorAction SilentlyContinue | Select-Object Name,Length | ConvertTo-Json | Set-Content (Join-Path $out 'log-inventory.json')
  if ($events.Count -eq 0) { throw 'no observed connections; cannot claim no network' }
} finally {
  Stop-Process -Id $app.Id -Force -ErrorAction SilentlyContinue
  auditpol /set /subcategory:'Filtering Platform Connection' /success:disable
}
