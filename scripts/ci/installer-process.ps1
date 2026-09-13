# Definition-only child process boundary, shared by the fixed smoke entry and tests.
function Invoke-CiInstallerProcess($Invocation) {
  $engine = Join-Path $PSHOME 'powershell.exe'
  if (-not (Test-Path -LiteralPath $engine -PathType Leaf)) { throw 'windows-powershell-required' }
  $arguments = @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File')
  $values = @($Invocation.ScriptPath)
  foreach ($key in $Invocation.Parameters.Keys) {
    if ($key -cnotmatch '^[A-Za-z][A-Za-z0-9]*$') { throw 'invalid-installer-parameter' }
    $values += "-$key"; $values += [string]$Invocation.Parameters[$key]
  }
  foreach ($value in $values) {
    if ([string]::IsNullOrWhiteSpace($value) -or $value -match '["\r\n]' -or $value.EndsWith('\')) {
      throw 'invalid-installer-argument'
    }
    $arguments += '"' + $value + '"'
  }
  $child = Start-Process -FilePath $engine -ArgumentList $arguments -Wait -PassThru -NoNewWindow
  try {
    if ($null -eq $child.ExitCode -or $child.ExitCode -isnot [int]) { throw 'missing-installer-exit-code' }
    return [int]$child.ExitCode
  } finally { $child.Dispose() }
}

function Invoke-CiRecordedInstallerProcess($Invocation, $ExitPath) {
  $observation = [ordered]@{ schemaVersion = 1; status = 'not-started'; exitCode = $null }
  $observation | ConvertTo-Json | Set-Content -LiteralPath $ExitPath -Encoding UTF8
  $code = Invoke-CiInstallerProcess $Invocation
  $observation.status = 'completed'; $observation.exitCode = $code
  $observation | ConvertTo-Json | Set-Content -LiteralPath $ExitPath -Encoding UTF8
  return $code
}
