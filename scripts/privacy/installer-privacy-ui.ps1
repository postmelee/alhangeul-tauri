param([string]$Installer, [ValidateSet('nsis','msi')][string]$Kind, [string]$Output)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes, System.Drawing, System.Windows.Forms
function Get-ProductWindow {
  $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
    [System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($window in $windows) {
    if ($window.Current.Name -match 'Alhangeul' -and -not $window.Current.IsOffscreen) { return $window }
  }
  return $null
}
function Read-Window($Window) {
  $nodes = $Window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  $rows = @()
  foreach ($node in $nodes) {
    $value = $node.Current.Name
    $pattern = $null
    if ($node.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$pattern)) {
      $value += "`n" + $pattern.DocumentRange.GetText(30000)
    }
    $rows += @{name=$node.Current.Name; text=$value; type=$node.Current.ControlType.ProgrammaticName; visible=(-not $node.Current.IsOffscreen)}
  }
  return @{nodes=$nodes; rows=$rows; text=(($rows | ForEach-Object {$_.text}) -join "`n")}
}
function Save-Screen($Path) {
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try { $graphics.CopyFromScreen($bounds.Location,[System.Drawing.Point]::Empty,$bounds.Size); $bitmap.Save($Path) }
  finally { $graphics.Dispose(); $bitmap.Dispose() }
}
function Get-SystemChangesVisibility($Nodes) {
  $observations = @()
  foreach ($node in $Nodes) {
    $pattern = $null
    if (-not $node.TryGetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern, [ref]$pattern)) { continue }
    $range = $pattern.DocumentRange.FindText('Windows:', $false, $false)
    if ($null -eq $range) { continue }
    # Managed UI Automation returns Rect[], not the native COM flat double array.
    $rectangles = @($range.GetBoundingRectangles())
    $bounds = $node.Current.BoundingRectangle
    $inside = @($rectangles | Where-Object {
      -not $_.IsEmpty -and $_.Width -gt 0 -and $_.Height -gt 0 -and
      $_.Left -ge $bounds.Left -and $_.Top -ge $bounds.Top -and
      $_.Right -le $bounds.Right -and $_.Bottom -le $bounds.Bottom
    })
    $observations += @{
      controlBounds=@{left=$bounds.Left; top=$bounds.Top; right=$bounds.Right; bottom=$bounds.Bottom}
      textRectangles=@($rectangles | ForEach-Object { @{left=$_.Left; top=$_.Top; right=$_.Right; bottom=$_.Bottom} })
    }
    if ($rectangles.Count -gt 0 -and $inside.Count -eq $rectangles.Count) {
      return @{visible=$true; marker='Windows:'; observations=$observations}
    }
  }
  return @{visible=$false; marker='Windows:'; observations=$observations}
}
if ($Kind -eq 'nsis') { $process = Start-Process $Installer -PassThru }
else { $process = Start-Process msiexec.exe -ArgumentList @('/i', "`"$Installer`"") -PassThru }
$deadline = (Get-Date).AddSeconds(60)
$found = $false
$advanced = $false
try {
  while ((Get-Date) -lt $deadline) {
    $window = Get-ProductWindow
    if ($null -eq $window) { Start-Sleep -Milliseconds 500; continue }
    $windowProcessId = $window.Current.ProcessId
    $state = Read-Window $window
    if ($state.text -match 'WebView2' -and $state.text -match '업데이트') {
      $state.rows | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $Output "$Kind-installer-ui.json")
      Save-Screen (Join-Path $Output "$Kind-installer-privacy.png")
      if ($state.text -match 'License Agreement|Please review the license terms') {
        throw 'Disclosure still displays a license agreement header'
      }
      $visibility = Get-SystemChangesVisibility $state.nodes
      $visibility | ConvertTo-Json -Depth 7 | Set-Content -Encoding utf8 (Join-Path $Output "$Kind-installer-visibility.json")
      if (-not $visibility.visible) {
        throw 'The first Windows system-change paragraph is not visible in the initial disclosure viewport'
      }
      $checkboxes = @($state.nodes | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::CheckBox -and -not $_.Current.IsOffscreen
      })
      if ($checkboxes.Count -ne 0) { throw 'Disclosure unexpectedly requires a license acceptance checkbox' }
      $buttonName = if ($Kind -eq 'nsis') { '^계속$' } else { '^Continue$' }
      $continueButtons = @($state.nodes | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
        $_.Current.Name -match $buttonName -and $_.Current.IsEnabled -and -not $_.Current.IsOffscreen
      })
      if ($continueButtons.Count -ne 1) { throw 'Expected disclosure Continue button was not observed' }
      $found = $true
      break
    }
    if (-not $advanced) {
      $next = @($state.nodes | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
        $_.Current.Name -match '^(Next|&Next|다음|&다음)' -and $_.Current.IsEnabled
      })
      if ($next.Count -eq 1) {
        $next[0].GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke()
        $advanced = $true
      }
    }
    Start-Sleep -Milliseconds 500
  }
  if (-not $found) {
    Save-Screen (Join-Path $Output "$Kind-installer-ui-failure.png")
    if ($state) { $state.rows | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $Output "$Kind-installer-ui-failure.json") }
    throw 'Actual installer privacy text was not observed; static source is not acceptance'
  }
} finally {
  # No installation button was pressed. End only this disposable UI process.
  foreach ($id in @($process.Id, $windowProcessId) | Where-Object { $_ } | Select-Object -Unique) {
    Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}
