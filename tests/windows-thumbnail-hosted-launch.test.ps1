param([string]$EvidencePath)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -Path (Join-Path $PSScriptRoot '..\scripts\ci\hosted-ui-window.cs')
$marker = 'alh-ui-test-' + [Guid]::NewGuid().ToString('N')
$form = [Windows.Forms.Form]::new()
try {
  $form.Text = $marker
  $form.Show()
  [Windows.Forms.Application]::DoEvents()
  if (-not [Alhangeul.HostedExplorer.Native]::IsWindow($form.Handle)) { throw 'live-window-rejected' }
  $windows = @([Alhangeul.HostedExplorer.Native]::Read($marker))
  if ($windows.Count -ne 1 -or $windows[0].processId -ne $PID -or $windows[0].handle -ne $form.Handle.ToInt64() -or -not $windows[0].visible) { throw 'owned-window-not-found' }
  if (@([Alhangeul.HostedExplorer.Native]::Read($marker + '-missing')).Count -ne 0) { throw 'unrelated-window-returned' }
  $rejected = $false
  try { [void][Alhangeul.HostedExplorer.Native]::Read('') } catch { $rejected = $true }
  if (-not $rejected) { throw 'empty-marker-accepted' }
} finally { $form.Dispose() }
if (@([Alhangeul.HostedExplorer.Native]::Read($marker)).Count -ne 0) { throw 'closed-window-returned' }
if ($EvidencePath) { @{ status = 'passed'; ownWindow = $true; unrelatedExcluded = $true; disposedAbsent = $true } | ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding UTF8 }
Write-Output 'Native owned-window enumeration passed with a real disposable Form; no Explorer launched.'
