param(
  [Parameter(Mandatory = $true)][string]$ArtifactRoot,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion,
  [ValidateSet('nsis', 'msi')][string]$InstallerKind,
  [ValidateSet('lifecycle', 'forced-reinstall')][string]$Scenario
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'installer-process.ps1')

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
$exitPath = Join-Path $OutputDirectory 'smoke-process.json'
$parameters = [ordered]@{
  ArtifactRoot = $ArtifactRoot; OutputDirectory = $OutputDirectory; ExpectedVersion = $ExpectedVersion
  InstallerKind = $InstallerKind; Scenario = $Scenario
}
$code = Invoke-CiRecordedInstallerProcess @{
  ScriptPath = (Join-Path $PSScriptRoot '..\windows-installer-smoke.ps1')
  Parameters = $parameters
} $exitPath
# Preserve the raw process result exactly, including unexpected nonzero values.
exit $code
