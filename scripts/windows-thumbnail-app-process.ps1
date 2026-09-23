# .NET Framework creates StandardInput with Console.InputEncoding during Start,
# including an eager preamble when AutoFlush is enabled. Replacing the writer
# after Start is too late. The installer smoke invokes children sequentially.
function Start-AppDiagnosticProcess($Process, $Report) {
  $previous = [Console]::InputEncoding
  try {
    [Console]::InputEncoding = [Text.UTF8Encoding]::new($false, $true)
    $Report.processStarted = $Process.Start()
  } finally {
    [Console]::InputEncoding = $previous
  }
}
