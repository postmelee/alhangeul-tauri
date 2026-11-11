param(
  [Parameter(Mandatory = $true)][ValidateSet('Cancel', 'Save')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$EvidencePath,
  [string]$TargetPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
. (Join-Path $PSScriptRoot 'windows-pdf-win32.ps1')
. (Join-Path $PSScriptRoot 'windows-pdf-dialog-observation.ps1')
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
      $controls += $window
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
function Write-PrintSaveObservation($Controls, $SubmittedHandle) {
  $nodes = @($Controls | ForEach-Object {
    @{ name = $_.Current.Name; id = $_.Current.AutomationId; class = $_.Current.ClassName
       type = $_.Current.ControlType.ProgrammaticName; processId = $_.Current.ProcessId }
  })
  @{ status = 'waiting'; submittedHandle = $SubmittedHandle; controls = $nodes } |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath "$EvidencePath.save.json" -Encoding UTF8
}
function Save-PrintedPdf {
  if (-not [System.IO.Path]::IsPathRooted($TargetPath) -or (Test-Path -LiteralPath $TargetPath)) {
    throw 'Print verification requires a new absolute PDF path'
  }
  $saveDeadline = (Get-Date).AddSeconds(60)
  $submittedHandle = 0
  $saveProcessId = 0
  while ((Get-Date) -lt $saveDeadline) {
    $saveControls = @(Get-PrintControls)
    Write-PrintSaveObservation $saveControls $submittedHandle
    $dialogs = @($saveControls | Where-Object { $_.Current.ClassName -eq '#32770' })
    if ($submittedHandle -ne 0) {
      $remaining = @($dialogs | Where-Object { $_.Current.NativeWindowHandle -eq $submittedHandle })
      if ($remaining.Count -eq 0 -and (Test-Path -LiteralPath $TargetPath -PathType Leaf)) {
        @{ status = 'passed'; processId = $saveProcessId; dialogHandle = $submittedHandle; path = $TargetPath } |
          ConvertTo-Json | Set-Content -LiteralPath "$EvidencePath.save.json" -Encoding UTF8
        return
      }
    } elseif ($dialogs.Count -eq 1) {
      $dialog = $dialogs[0]
      $condition = [System.Windows.Automation.AndCondition]::new(
        [System.Windows.Automation.PropertyCondition]::new(
          [System.Windows.Automation.AutomationElement]::AutomationIdProperty, '1001'),
        [System.Windows.Automation.PropertyCondition]::new(
          [System.Windows.Automation.AutomationElement]::ClassNameProperty, 'Edit'))
      $field = $dialog.FindFirst($scope, $condition)
      $saveProcessId = $dialog.Current.ProcessId
      $button = Find-PdfNativeButton $dialog '1' $saveProcessId
      if ($null -ne $field -and $null -ne $button) {
        Set-NativeFileNameFocus $dialog $field $saveProcessId 'Save'
        Set-NativeFileName $dialog $field $saveProcessId $TargetPath 'Save'
        Assert-PdfButtonCurrent $dialog $button $saveProcessId '1'
        $submittedHandle = $dialog.Current.NativeWindowHandle
        $invoke = $null
        if ($button.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) {
          $invoke.Invoke()
        } else {
          Invoke-NativeDialogButton $dialog $button $saveProcessId '1'
        }
      }
    }
    Start-Sleep -Milliseconds 200
  }
  throw 'Owned print PDF save dialog did not complete'
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
      $printer = @($controls | Where-Object {
        $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Group -and
        $_.Current.Name -in @('Printer', '프린터')
      })
      $pdf = @($printer | ForEach-Object { $_.FindAll($scope, $all) } | Where-Object {
        $_.Current.Name -eq 'Microsoft Print to PDF'
      })
      if ($pdf.Count -eq 1) {
        $print = @($controls | Where-Object {
          $_.Current.ProcessId -eq $pdf[0].Current.ProcessId -and
          $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
          $_.Current.Name -in @('Print', '인쇄')
        })
        if ($print.Count -eq 1) {
          Invoke-PrintControl $print[0]
          Save-PrintedPdf
          $completed = $true
        }
      }
    }
    if (-not $completed) { Start-Sleep -Milliseconds 500 }
  }
  if (-not $completed) { throw 'Windows print UI did not complete before deadline' }
} finally {
  @{ mode = $Mode; completed = $completed; controls = @($observations.ToArray()) } |
    ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $EvidencePath -Encoding UTF8
}
