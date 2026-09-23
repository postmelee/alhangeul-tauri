param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('Setup', 'Cleanup')]
  [string]$Phase,

  [Parameter(Mandatory = $true)]
  [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$PolicyPath = 'HKLM:\SOFTWARE\Policies\Microsoft\Edge\WebView2\AdditionalBrowserArguments'
$AppIds = @('io.github.postmelee.alhangeul', 'Alhangeul.exe')
$AutomationArguments = '--remote-debugging-port=0'
$BeforePath = Join-Path $OutputDirectory 'webview2-policy-before.json'
$AppliedPath = Join-Path $OutputDirectory 'webview2-policy-applied.json'
$AfterPath = Join-Path $OutputDirectory 'webview2-policy-after.json'

function Get-PolicySnapshot {
  param([string]$Path, [string]$Name)

  $item = Get-ItemProperty -LiteralPath $Path -Name $Name -ErrorAction SilentlyContinue
  if ($null -eq $item) {
    return [ordered]@{ name = $Name; existed = $false; value = $null }
  }

  $property = $item.PSObject.Properties[$Name]
  if ($null -eq $property) {
    return [ordered]@{ name = $Name; existed = $false; value = $null }
  }

  return [ordered]@{ name = $Name; existed = $true; value = [string]$property.Value }
}

function Write-Json {
  param([object]$Value, [string]$Path)
  $Value | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Invoke-Setup {
  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  if (Test-Path -LiteralPath $BeforePath) {
    throw "WebView2 policy snapshot already exists: $BeforePath"
  }

  $keyExisted = Test-Path -LiteralPath $PolicyPath
  $entries = @($AppIds | ForEach-Object { Get-PolicySnapshot -Path $PolicyPath -Name $_ })
  Write-Json -Value ([ordered]@{
      policyPath = $PolicyPath
      keyExisted = $keyExisted
      entries = $entries
    }) -Path $BeforePath

  if (-not $keyExisted) {
    New-Item -Path $PolicyPath -Force | Out-Null
  }
  foreach ($appId in $AppIds) {
    New-ItemProperty -LiteralPath $PolicyPath -Name $appId -Value $AutomationArguments `
      -PropertyType String -Force | Out-Null
  }

  $applied = @($AppIds | ForEach-Object { Get-PolicySnapshot -Path $PolicyPath -Name $_ })
  foreach ($entry in $applied) {
    if (-not $entry.existed -or $entry.value -ne $AutomationArguments) {
      throw "WebView2 automation policy was not applied for $($entry.name)"
    }
  }

  Write-Json -Value ([ordered]@{
      policyPath = $PolicyPath
      arguments = $AutomationArguments
      entries = $applied
    }) -Path $AppliedPath
  Write-Host "WebView2 elevated automation policy applied for the Alhangeul test process."
}

function Invoke-Cleanup {
  New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
  if (-not (Test-Path -LiteralPath $BeforePath)) {
    Write-Json -Value ([ordered]@{ restored = $false; reason = 'setup-snapshot-missing' }) -Path $AfterPath
    Write-Host 'WebView2 policy setup snapshot was not created; cleanup is a no-op.'
    return
  }

  $before = Get-Content -LiteralPath $BeforePath -Raw | ConvertFrom-Json
  foreach ($entry in $before.entries) {
    if ([bool]$entry.existed) {
      New-ItemProperty -LiteralPath $PolicyPath -Name ([string]$entry.name) `
        -Value ([string]$entry.value) -PropertyType String -Force | Out-Null
    } else {
      Remove-ItemProperty -LiteralPath $PolicyPath -Name ([string]$entry.name) `
        -ErrorAction SilentlyContinue
    }
  }

  if (-not [bool]$before.keyExisted) {
    Remove-Item -LiteralPath $PolicyPath -Force -ErrorAction SilentlyContinue
  }

  $restored = $true
  if ([bool]$before.keyExisted) {
    foreach ($entry in $before.entries) {
      $actual = Get-PolicySnapshot -Path $PolicyPath -Name ([string]$entry.name)
      if ([bool]$entry.existed) {
        $restored = $restored -and $actual.existed -and ($actual.value -eq [string]$entry.value)
      } else {
        $restored = $restored -and (-not $actual.existed)
      }
    }
  } else {
    $restored = -not (Test-Path -LiteralPath $PolicyPath)
  }

  Write-Json -Value ([ordered]@{ restored = $restored; policyPath = $PolicyPath }) -Path $AfterPath
  if (-not $restored) {
    throw 'WebView2 automation policy did not return to its pre-test state.'
  }
  Write-Host 'WebView2 elevated automation policy restored to its pre-test state.'
}

if ($Phase -eq 'Setup') {
  Invoke-Setup
} else {
  Invoke-Cleanup
}
