param([int]$Code = 0)
& cmd.exe /d /c "exit $Code"
Write-Output 'Fixture text is not evidence of process success.'
exit $LASTEXITCODE
