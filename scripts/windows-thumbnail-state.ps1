# Read-only, allowlisted environment/registration data. Never emit arbitrary registry strings.
function Read-ThumbnailRegistry($Hive, $Path, $Name) {
  $base = $null; $key = $null
  try {
    $base = [Microsoft.Win32.RegistryKey]::OpenBaseKey($Hive, [Microsoft.Win32.RegistryView]::Registry64)
    $key = $base.OpenSubKey($Path, $false)
    if ($null -eq $key -or $key.GetValueNames() -notcontains $Name) {
      return [ordered]@{ status = 'missing'; value = $null }
    }
    return [ordered]@{ status = 'ok'; value = $key.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames) }
  } catch { return [ordered]@{ status = 'unreadable'; value = $null } }
  finally { if ($null -ne $key) { $key.Dispose() }; if ($null -ne $base) { $base.Dispose() } }
}

function ConvertTo-ThumbnailSafeValue($Record, $Kind) {
  if ($Record.status -ne 'ok') { return $Record }
  $value = $Record.value; $valid = $false
  if ($Kind -eq 'integer') { $valid = $value -is [int] -or $value -is [long] }
  elseif ($value -is [string]) {
    if ($Kind -eq 'guid') { $valid = $value -match '^\{[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\}$' }
    elseif ($Kind -eq 'threading') { $valid = $value -in @('Apartment', 'Both', 'Free', 'Neutral') }
    elseif ($Kind -eq 'progid') { $valid = $value -match '^[A-Za-z][A-Za-z0-9_.]{0,127}$' }
    elseif ($Kind -eq 'version') { $valid = $value -match '^[0-9][0-9.]{0,63}$' }
  }
  if (-not $valid) { return [ordered]@{ status = 'invalid'; value = $null } }
  return [ordered]@{ status = 'ok'; value = $value }
}

function Get-ThumbnailFileState($Path, $ExpectedName) {
  try {
    if ([IO.Path]::GetFileName($Path) -ine $ExpectedName) { return [ordered]@{ status = 'invalid' } }
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return [ordered]@{ status = 'missing' } }
    $file = Get-Item -LiteralPath $Path
    if ($file.Length -gt 256MB) { return [ordered]@{ status = 'invalid'; reason = 'file-size-limit' } }
    return [ordered]@{ status = 'ok'; bytes = $file.Length; sha256 = (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash }
  } catch { return [ordered]@{ status = 'unreadable' } }
}

function Get-ThumbnailInprocState($Record) {
  if ($Record.status -ne 'ok') { return $Record }
  try {
    $path = $Record.value
    # Do not follow registry paths to network shares or device namespaces during state collection.
    if ($path -isnot [string] -or $path -notmatch '^[A-Za-z]:\\') { return [ordered]@{ status = 'invalid' } }
    $path = [IO.Path]::GetFullPath($path); $label = '<external-path>'
    foreach ($root in @('LOCALAPPDATA', 'ProgramFiles')) {
      $base = [Environment]::GetEnvironmentVariable($root)
      if ([string]::IsNullOrWhiteSpace($base)) { continue }
      $expected = Join-Path $base 'Alhangeul\AlhangeulThumbnailHandler.dll'
      if ($path -ieq $expected) { $label = "<$root>\Alhangeul\AlhangeulThumbnailHandler.dll" }
    }
    $worker = Join-Path ([IO.Path]::GetDirectoryName($path)) 'AlhangeulThumbnailWorker.exe'
    return [ordered]@{ status = 'ok'; path = $label; handler = Get-ThumbnailFileState $path 'AlhangeulThumbnailHandler.dll'; worker = Get-ThumbnailFileState $worker 'AlhangeulThumbnailWorker.exe' }
  } catch { return [ordered]@{ status = 'unreadable' } }
}

function Get-ThumbnailRegistrationSnapshot($Hive) {
  $category = '{E357FCCD-A995-4576-B01F-234630154E96}'
  $classPath = 'Software\Classes\CLSID\{C1DCF316-0771-49DD-BFEA-C85F69B1674B}\InprocServer32'
  $extensions = @()
  foreach ($extension in @('.hwp', '.hwpx')) {
    $basePath = "Software\Classes\$extension"
    $extensions += [ordered]@{
      extension = $extension
      progId = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $Hive $basePath '') 'progid'
      handler = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $Hive "$basePath\ShellEx\$category" '') 'guid'
    }
  }
  return [ordered]@{
    hive = $Hive.ToString(); view = 'Registry64'; extensions = $extensions
    inproc = Get-ThumbnailInprocState (Read-ThumbnailRegistry $Hive $classPath '')
    threadingModel = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $Hive $classPath 'ThreadingModel') 'threading'
  }
}

function Get-ThumbnailPolicySnapshot {
  $policies = @()
  foreach ($hive in @([Microsoft.Win32.RegistryHive]::CurrentUser, [Microsoft.Win32.RegistryHive]::LocalMachine)) {
    foreach ($path in @('Software\Microsoft\Windows\CurrentVersion\Policies\Explorer', 'Software\Policies\Microsoft\Windows\Explorer')) {
      $policies += [ordered]@{ hive = $hive.ToString(); path = $path; disableThumbnails = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $hive $path 'DisableThumbnails') 'integer' }
    }
  }
  return $policies
}

function Get-ThumbnailEnvironmentState {
  $machine = [Microsoft.Win32.RegistryHive]::LocalMachine; $user = [Microsoft.Win32.RegistryHive]::CurrentUser
  $system = 'Software\Microsoft\Windows\CurrentVersion\Policies\System'
  $windows = 'Software\Microsoft\Windows NT\CurrentVersion'
  $imageVersion = [Environment]::GetEnvironmentVariable('ImageVersion')
  $image = [ordered]@{ status = 'missing'; value = $null }
  if ($null -ne $imageVersion) { $image = ConvertTo-ThumbnailSafeValue ([ordered]@{ status = 'ok'; value = $imageVersion }) 'version' }
  $process = [Diagnostics.Process]::GetCurrentProcess()
  try { $session = $process.SessionId } finally { $process.Dispose() }
  return [ordered]@{
    osBuild = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $machine $windows 'CurrentBuildNumber') 'version'
    osRevision = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $machine $windows 'UBR') 'integer'
    imageVersion = $image; is64BitProcess = [Environment]::Is64BitProcess
    apartment = [Threading.Thread]::CurrentThread.GetApartmentState().ToString(); sessionId = $session
    token = [Alhangeul.ThumbnailDiagnostics.TokenProbe]::Read()
    enableLUA = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $machine $system 'EnableLUA') 'integer'
    iconsOnly = ConvertTo-ThumbnailSafeValue (Read-ThumbnailRegistry $user 'Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced' 'IconsOnly') 'integer'
    policies = @(Get-ThumbnailPolicySnapshot)
    registrations = @((Get-ThumbnailRegistrationSnapshot $user), (Get-ThumbnailRegistrationSnapshot $machine))
  }
}
