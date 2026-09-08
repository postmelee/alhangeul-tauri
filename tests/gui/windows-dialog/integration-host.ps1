param(
  [Parameter(Mandatory = $true)][string]$CaseRoot,
  [Parameter(Mandatory = $true)][ValidateSet('Open', 'Fresh', 'Overwrite', 'Decline', 'WrongTarget')][string]$Scenario
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName System.Windows.Forms
if ([Threading.Thread]::CurrentThread.ApartmentState -ne 'STA') { throw 'STA required.' }
$targetName = if ($Scenario -eq 'Fresh') { 'dialog-probe-new.pdf' } else { 'dialog-probe-existing.pdf' }
$target = Join-Path $CaseRoot $targetName
if (-not (Test-Path -LiteralPath (Join-Path $CaseRoot 'source-control.txt'))) { throw 'Missing controlled fixture.' }
$owner = New-Object System.Windows.Forms.Form
$owner.Text = 'Alhangeul dialog integration fixture'
$owner.Width = 600
$owner.Height = 400
$owner.StartPosition = 'CenterScreen'
$dialog = if ($Scenario -eq 'Open') { New-Object System.Windows.Forms.OpenFileDialog }
  else { New-Object System.Windows.Forms.SaveFileDialog }
$dialog.AutoUpgradeEnabled = $true
if ($Scenario -ne 'Open') { $dialog.OverwritePrompt = $true }
$dialog.InitialDirectory = $CaseRoot
$dialog.FileName = $targetName
$dialog.Filter = 'PDF (*.pdf)|*.pdf'
$dialog.Title = 'Alhangeul integration fixture'
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 90000
$timer.Add_Tick({ [Environment]::Exit(2) })
$timer.Start()
$owner.Add_Shown({
  try {
    $result = $dialog.ShowDialog($owner)
    $selectedExpected = $result -eq [Windows.Forms.DialogResult]::OK -and $dialog.FileName -ceq $target
    if ($result -eq [Windows.Forms.DialogResult]::OK -and -not $selectedExpected) { throw 'Wrong selected target.' }
    if ($selectedExpected -and $Scenario -ne 'Open') {
      # Only this exact public fixture path may be written, after native dialog approval.
      [IO.File]::WriteAllText($target, 'Alhangeul dialog integration saved')
    }
    @{ result = $result.ToString(); selectedExpected = $selectedExpected; scenario = $Scenario } |
      ConvertTo-Json | Set-Content -LiteralPath (Join-Path $CaseRoot 'host-result.json') -Encoding UTF8
  } catch {
    @{ result = 'Error'; errorType = $_.Exception.GetType().Name } |
      ConvertTo-Json | Set-Content -LiteralPath (Join-Path $CaseRoot 'host-result.json') -Encoding UTF8
  } finally { $owner.Close() }
})
try { [Windows.Forms.Application]::Run($owner) }
finally { $timer.Dispose(); $dialog.Dispose(); $owner.Dispose() }
