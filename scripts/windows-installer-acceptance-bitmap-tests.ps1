# Definition-only regressions. Native failed calls preserve null or false, never true.
function Test-AcceptanceBitmapTypes($Case, $Label) {
  $original = @($Case.summary.Installers[0].Probes | Where-Object { $_.Label -ceq $Label })[0].Result
  $failed = $original.status -ceq 'failed'
  foreach ($value in @($null, $false, $true, 'false', 'true', 0, 1, @{}, @($false))) {
    $copy = Copy-AcceptanceTestValue $Case
    $probe = @($copy.summary.Installers[0].Probes | Where-Object { $_.Label -ceq $Label })[0].Result
    $probe.bitmapPresent = $value
    $valid = if ($failed) { $null -eq $value -or ($value -is [bool] -and -not $value) }
      else { $value -is [bool] -and $value }
    $expected = if ($valid) { 'passed' } else { 'failed' }
    $null = Assert-AcceptanceCase $copy $expected "bitmap-type-$Label"
  }
  $copy = Copy-AcceptanceTestValue $Case
  $probe = @($copy.summary.Installers[0].Probes | Where-Object { $_.Label -ceq $Label })[0].Result
  $probe.PSObject.Properties.Remove('bitmapPresent')
  $null = Assert-AcceptanceCase $copy 'failed' "bitmap-missing-$Label"
}

function Test-AcceptanceBitmapCases {
  $normal = New-AcceptanceTestCase
  foreach ($label in @('initial-small-hwp-cache-only', 'initial-small-hwp-shell', 'initial-small-hwp-force-extract')) {
    Test-AcceptanceBitmapTypes $normal $label
  }
  $limited = New-AcceptanceTestCase 'nsis' 'hosted-nsis-diagnostic' $true
  foreach ($label in @('initial-small-hwp-shell', 'initial-small-hwp-force-extract')) {
    Test-AcceptanceBitmapTypes $limited $label
  }
  # Nullable bitmap does not excuse contradictory dimensions or unrelated errors.
  foreach ($mutation in @(
    { param($p) $p.width = 1 },
    { param($p) $p.height = 1 },
    { param($p) $p.hresult = '0x00000000' },
    { param($p) $p.hresult = '0x80004005' },
    { param($p) $p.phase = 'unrecognized-phase' }
  )) {
    $copy = Copy-AcceptanceTestValue $limited
    $probe = @($copy.summary.Installers[0].Probes | Where-Object { $_.Label -ceq 'initial-small-hwp-force-extract' })[0].Result
    & $mutation $probe
    $null = Assert-AcceptanceCase $copy 'failed' 'nullable-bitmap-counterexample'
  }
}
