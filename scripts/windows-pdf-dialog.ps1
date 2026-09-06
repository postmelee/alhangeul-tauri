param(
  [Parameter(Mandatory = $true)][string]$TargetPath,
  [Parameter(Mandatory = $true)][ValidateSet('Open', 'Save')][string]$Mode,
  [Parameter(Mandatory = $true)][string]$EvidencePath
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$scope = [System.Windows.Automation.TreeScope]::Descendants
$deadline = [DateTime]::UtcNow.AddSeconds(90)
$submitted = $false
$overwriteConfirmed = $false
$allowOverwrite = $Mode -eq 'Save' -and (Test-Path -LiteralPath $TargetPath -PathType Leaf)

function Find-Id($Root, $Id) {
  $condition = [System.Windows.Automation.PropertyCondition]::new(
    [System.Windows.Automation.AutomationElement]::AutomationIdProperty, $Id)
  return $Root.FindFirst($scope, $condition)
}

function Invoke-Button($Button) {
  $pattern = $Button.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $pattern.Invoke()
}

try {
  while ([DateTime]::UtcNow -lt $deadline) {
    $apps = @(Get-Process -Name Alhangeul -ErrorAction SilentlyContinue)
    if ($apps.Count -ne 1) { throw 'Exactly one acceptance app process is required.' }
    $condition = [System.Windows.Automation.AndCondition]::new(
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $apps[0].Id),
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770'))
    $dialogs = [System.Windows.Automation.AutomationElement]::RootElement.FindAll($scope, $condition)
    if ($submitted -and $dialogs.Count -eq 0) { break }
    foreach ($dialog in $dialogs) {
      if (-not $submitted) {
        $field = Find-Id $dialog '1148'
        if ($null -eq $field) { $field = Find-Id $dialog '1001' }
        if ($null -eq $field) { continue }
        $value = $null
        if (-not $field.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$value)) {
          $editCondition = [System.Windows.Automation.PropertyCondition]::new(
            [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
            [System.Windows.Automation.ControlType]::Edit)
          $field = $field.FindFirst($scope, $editCondition)
          if ($null -eq $field) { continue }
          $value = $field.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
        }
        $button = Find-Id $dialog '1'
        if ($null -eq $button) { continue }
        $value.SetValue($TargetPath)
        Invoke-Button $button
        $submitted = $true
      } elseif ($allowOverwrite -and -not $overwriteConfirmed) {
        # IDYES only, restricted to the app-owned dialog and an existing test target.
        $yes = Find-Id $dialog '6'
        if ($null -ne $yes) {
          Invoke-Button $yes
          $overwriteConfirmed = $true
        }
      }
    }
    Start-Sleep -Milliseconds 200
  }
  if (-not $submitted -or [DateTime]::UtcNow -ge $deadline) { throw 'Native file dialog timed out.' }
  if ($allowOverwrite -and -not $overwriteConfirmed) { throw 'Native overwrite confirmation was not observed.' }
  @{ mode = $Mode; submitted = $submitted; overwriteConfirmed = $overwriteConfirmed; status = 'passed' } |
    ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding utf8
} catch {
  @{ mode = $Mode; status = 'failed'; error = $_.Exception.Message } |
    ConvertTo-Json | Set-Content -LiteralPath $EvidencePath -Encoding utf8
  throw
}
