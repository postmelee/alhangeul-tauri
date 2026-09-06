function Invoke-CiPowerShellTest {
    param([string]$Path, [string[]]$Arguments = @())
    $engine = Join-Path $PSHOME 'powershell.exe'
    $childArguments = @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $Path + '"')) + $Arguments
    $child = Start-Process -FilePath $engine -ArgumentList $childArguments -Wait -PassThru -NoNewWindow
    try {
        if ($child.ExitCode -ne 0) { throw "PowerShell test failed (exit $($child.ExitCode)): $Path" }
    } finally { $child.Dispose() }
}
