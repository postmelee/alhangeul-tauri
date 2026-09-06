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
$startedAt = [DateTime]::UtcNow
$stage = 'waiting-dialog'
$observedTree = @()
$observedProcessId = $null
$dialogCount = 0

function Write-Evidence($Status, $ErrorText) {
  @{ mode = $Mode; status = $Status; error = $ErrorText; stage = $stage;
     startedAt = $startedAt.ToString('o'); finishedAt = [DateTime]::UtcNow.ToString('o');
     processId = $observedProcessId; dialogCount = $dialogCount; submitted = $submitted;
     overwriteConfirmed = $overwriteConfirmed; tree = $observedTree } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $EvidencePath -Encoding utf8
}

function Read-AppTree($AppCondition) {
  $nodes = [System.Windows.Automation.AutomationElement]::RootElement.FindAll($scope, $AppCondition)
  $result = @()
  foreach ($node in $nodes) {
    if ($result.Count -ge 100) { break }
    $info = $node.Current
    # No Name or Value: keep diagnostics free of document text or file names.
    $result += @{ id = $info.AutomationId; class = $info.ClassName;
      type = $info.ControlType.ProgrammaticName; enabled = $info.IsEnabled }
  }
  return $result
}

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
    $observedProcessId = $apps[0].Id
    $appCondition = [System.Windows.Automation.PropertyCondition]::new(
      [System.Windows.Automation.AutomationElement]::ProcessIdProperty, $apps[0].Id)
    $condition = [System.Windows.Automation.AndCondition]::new(
      $appCondition,
      [System.Windows.Automation.PropertyCondition]::new(
        [System.Windows.Automation.AutomationElement]::ClassNameProperty, '#32770'))
    $dialogs = [System.Windows.Automation.AutomationElement]::RootElement.FindAll($scope, $condition)
    if ($dialogCount -ne $dialogs.Count -or $observedTree.Count -eq 0) {
      $dialogCount = $dialogs.Count
      $observedTree = @(Read-AppTree $appCondition)
      Write-Evidence 'running' $null
    }
    if ($submitted -and $dialogs.Count -eq 0) { break }
    foreach ($dialog in $dialogs) {
      if (-not $submitted) {
        $stage = 'finding-filename-field'
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
        $stage = 'setting-filename'
        Write-Evidence 'running' $null
        $value.SetValue($TargetPath)
        $stage = 'invoking-submit'
        Write-Evidence 'running' $null
        Invoke-Button $button
        $submitted = $true
        $stage = 'waiting-dialog-close'
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
  Write-Evidence 'passed' $null
} catch {
  Write-Evidence 'failed' $_.Exception.Message
  throw
}
