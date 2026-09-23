param([Parameter(Mandatory = $true)][string]$FixtureRoot)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Windows.Forms
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'STA required.' }
$target = Join-Path $FixtureRoot 'dialog-probe-existing.pdf'
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { throw 'Missing controlled fixture.' }
$owner = New-Object System.Windows.Forms.Form
$owner.Text = 'Alhangeul native dialog fixture'
$owner.Width = 600
$owner.Height = 400
$owner.StartPosition = 'CenterScreen'
$dialog = New-Object System.Windows.Forms.SaveFileDialog
$dialog.AutoUpgradeEnabled = $true
$dialog.OverwritePrompt = $true
$dialog.InitialDirectory = $FixtureRoot
$dialog.FileName = 'dialog-probe-existing.pdf'
$dialog.Filter = 'PDF (*.pdf)|*.pdf'
$dialog.Title = 'Alhangeul fixture save'
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 90000
$timer.Add_Tick({ [Environment]::Exit(2) })
$timer.Start()
$owner.Add_Shown({
  try { $null = $dialog.ShowDialog($owner) } finally { $owner.Close() }
})
try { [System.Windows.Forms.Application]::Run($owner) }
finally { $timer.Dispose(); $dialog.Dispose(); $owner.Dispose() }
# Deliberately no writes: choosing any dialog result cannot overwrite the fixture.
