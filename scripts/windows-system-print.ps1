param(
  [Parameter(Mandatory = $true)][ValidateSet('Cancel', 'Save')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$EvidencePath,
  [string]$TargetPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$root = [System.Windows.Automation.AutomationElement]::RootElement
$scope = [System.Windows.Automation.TreeScope]::Descendants
$all = [System.Windows.Automation.Condition]::TrueCondition
$deadline = (Get-Date).AddSeconds(75)
$observations = [System.Collections.Generic.List[object]]::new()
$completed = $false

function Get-PrintControls {
  $processes = @(Get-CimInstance Win32_Process)
  $owned = @($processes | Where-Object { $_.Name -eq 'Alhangeul.exe' } | ForEach-Object { [int]$_.ProcessId })
  for ($i = 0; $i -lt 4; $i++) {
    $owned += @($processes | Where-Object { $owned -contains [int]$_.ParentProcessId } | ForEach-Object { [int]$_.ProcessId })
    $owned = @($owned | Select-Object -Unique)
  }
  $controls = @()
  foreach ($window in $root.FindAll([System.Windows.Automation.TreeScope]::Children, $all)) {
    if ($owned -contains $window.Current.ProcessId) {
      foreach ($control in $window.FindAll($scope, $all)) {
        if (-not $control.Current.IsOffscreen) { $controls += $control }
      }
    }
  }
  return $controls
}
function Invoke-PrintControl($Control) {
  $pattern = $Control.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $pattern.Invoke()
}
try {
  while ((Get-Date) -lt $deadline -and -not $completed) {
    $controls = @(Get-PrintControls)
    $observations.Clear()
    foreach ($control in $controls) {
      $observations.Add(@{ name = $control.Current.Name; id = $control.Current.AutomationId
        type = $control.Current.ControlType.ProgrammaticName; processId = $control.Current.ProcessId })
    }
    $cancel = @($controls | Where-Object {
      $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
      $_.Current.Name -in @('Cancel', '취소')
    })
    if ($cancel.Count -eq 1 -and $Mode -eq 'Cancel') {
      Invoke-PrintControl $cancel[0]
      $completed = $true
      break
    }
    if ($cancel.Count -eq 1 -and $Mode -eq 'Save') {
      $destination = @($controls | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::ComboBox -and
        $_.Current.Name -match 'Printer|Destination|프린터|대상'
      })
      if ($destination.Count -eq 1) {
        $destination[0].GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand()
        Start-Sleep -Milliseconds 250
        $choices = @(Get-PrintControls | Where-Object { $_.Current.Name -in @('Save as PDF', 'PDF로 저장') })
        foreach ($choice in $choices) {
          $selection = $null
          if ($choice.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) {
            $selection.Select()
            break
          }
        }
      }
      $save = @(Get-PrintControls | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
        $_.Current.Name -in @('Save', '저장')
      })
      if ($save.Count -eq 1) {
        Invoke-PrintControl $save[0]
        & "$PSScriptRoot/windows-pdf-dialog.ps1" -Mode Save -TargetPath $TargetPath -EvidencePath "$EvidencePath.save.json"
        if ($LASTEXITCODE -ne 0) { throw 'Print PDF save dialog failed' }
        $completed = $true
      }
    }
    if (-not $completed) { Start-Sleep -Milliseconds 500 }
  }
  if (-not $completed) { throw 'Windows print UI did not complete before deadline' }
} finally {
  @{ mode = $Mode; completed = $completed; controls = @($observations.ToArray()) } |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
}
