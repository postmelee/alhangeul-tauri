# Disposable CI only. Never shipped to or called by the installed application.
function Open-AppDiagnosticDisplayKey {
  $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryView]::Registry64)
  try { return $base.OpenSubKey('Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced', $true) }
  finally { $base.Dispose() }
}

function Invoke-AppDiagnosticDisplay($Report, [scriptblock]$Body) {
  $Report.stage = 'display-guard'
  Assert-Condition ($env:GITHUB_ACTIONS -ceq 'true' -and $env:RUNNER_ENVIRONMENT -ceq 'github-hosted' -and $env:RUNNER_OS -ceq 'Windows') 'App display preparation requires disposable Windows CI.'
  $key = $null; $restore = $false; $existed = $false; $original = $null
  try {
    $Report.stage = 'display-read'
    $key = Open-AppDiagnosticDisplayKey
    Assert-Condition ($null -ne $key) 'Explorer Advanced key missing.'
    $existed = $key.GetValueNames() -contains 'IconsOnly'
    if ($existed) {
      Assert-Condition ($key.GetValueKind('IconsOnly') -eq [Microsoft.Win32.RegistryValueKind]::DWord) 'Unexpected IconsOnly type.'
      $original = $key.GetValue('IconsOnly')
    }
    $Report.display.originalExists = $existed; $Report.display.originalValue = $original
    $Report.stage = 'display-prepare'; $restore = $true
    $key.SetValue('IconsOnly', 0, [Microsoft.Win32.RegistryValueKind]::DWord)
    Assert-Condition ($key.GetValueKind('IconsOnly') -eq [Microsoft.Win32.RegistryValueKind]::DWord -and $key.GetValue('IconsOnly') -eq 0) 'IconsOnly preparation readback failed.'
    $Report.display.prepared = $true
    & $Body
  } catch {
    if ($null -eq $Report.failureStage) { $Report.failureStage = $Report.stage }
    throw
  } finally {
    try {
      if ($restore) {
        $Report.display.restored = $false
        if ($existed) { $key.SetValue('IconsOnly', $original, [Microsoft.Win32.RegistryValueKind]::DWord) }
        else { $key.DeleteValue('IconsOnly', $false) }
        $nowExists = $key.GetValueNames() -contains 'IconsOnly'
        Assert-Condition ($nowExists -eq $existed) 'IconsOnly restoration presence mismatch.'
        if ($existed) {
          Assert-Condition ($key.GetValueKind('IconsOnly') -eq [Microsoft.Win32.RegistryValueKind]::DWord -and $key.GetValue('IconsOnly') -eq $original) 'IconsOnly restoration value mismatch.'
        }
        $Report.display.restored = $true
      }
    } catch {
      if ($null -eq $Report.failureStage) { $Report.failureStage = 'display-restore' }
      throw
    } finally { if ($null -ne $key) { $key.Dispose() } }
  }
}
