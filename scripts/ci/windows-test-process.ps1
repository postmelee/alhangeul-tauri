function Invoke-CiPowerShellTest {
    param([string]$Path, [string[]]$Arguments = @())
    $engine = Join-Path $PSHOME 'powershell.exe'
    $childArguments = @('-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', ('"' + $Path + '"')) + $Arguments
    $child = Start-Process -FilePath $engine -ArgumentList $childArguments -Wait -PassThru -NoNewWindow
    try {
        if ($child.ExitCode -ne 0) { throw "PowerShell test failed (exit $($child.ExitCode)): $Path" }
    } finally { $child.Dispose() }
}

function Invoke-CiPowerShellRegression {
    param([string]$Path, [string]$EvidenceDirectory)
    $arguments = @()
    if ((Get-Command -Name $Path).Parameters.ContainsKey('EvidencePath')) {
        New-Item -ItemType Directory -Path $EvidenceDirectory -Force | Out-Null
        $evidence = Join-Path $EvidenceDirectory ((Split-Path $Path -Leaf) + '.json')
        $arguments = @('-EvidencePath', ('"' + $evidence + '"'))
    }
    Invoke-CiPowerShellTest -Path $Path -Arguments $arguments
}
