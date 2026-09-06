# CI-only artifact/fixture and protected-copy helpers.
function Assert-Context($Condition, $Code) { if (-not $Condition) { throw $Code } }

function Assert-ContextLocalPath($Path) {
  Assert-Context ($Path -match '^[A-Za-z]:\\' -and $Path -notmatch '^[A-Za-z]:\\\\') 'non-local-path'
  $item = Get-Item -LiteralPath $Path -Force
  while ($null -ne $item) {
    Assert-Context (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -eq 0) 'reparse-path'
    $item = if ($item -is [IO.DirectoryInfo]) { $item.Parent } else { $item.Directory }
  }
}

function Assert-ContextFile($Path, $Record) {
  Assert-Context (Test-Path -LiteralPath $Path -PathType Leaf) 'missing-file'
  Assert-ContextLocalPath $Path
  $file = Get-Item -LiteralPath $Path
  $size = if ($Record.PSObject.Properties.Name -contains 'size') { $Record.size } else { $Record.bytes }
  Assert-Context ($file.Length -eq $size -and (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ieq $Record.sha256) 'file-integrity-mismatch'
}

function Read-ContextBundle($Root, $SupportRoot, $SourceSha) {
  Assert-ContextLocalPath $Root; Assert-ContextLocalPath $SupportRoot
  $manifest = Get-Content -LiteralPath (Join-Path $SupportRoot 'support-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Context ($manifest.sourceSha -ceq $SourceSha -and $manifest.files.Count -eq 12) 'support-source-mismatch'
  foreach ($record in $manifest.files) {
    Assert-Context ($record.path -match '^[A-Za-z0-9_.-]+$') 'invalid-support-path'
    Assert-ContextFile (Join-Path $SupportRoot $record.path) $record
  }
  $inventoryPath = Join-Path $Root 'alhangeul-artifact-inventory.json'
  $supportInventory = Join-Path $SupportRoot 'alhangeul-artifact-inventory.json'
  Assert-Context ((Get-FileHash $inventoryPath).Hash -ceq (Get-FileHash $supportInventory).Hash) 'inventory-mismatch'
  $inventory = Get-Content -LiteralPath $inventoryPath -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Context ($inventory.schemaVersion -eq 1 -and $inventory.platform -ceq 'windows-x64' -and $inventory.files.Count -eq 4) 'invalid-inventory'
  $records = @{}; $paths = @{}
  $patterns = @{ nsis = '^nsis/Alhangeul_[0-9.]+_x64-setup\.exe$'; msi = '^msi/Alhangeul_[0-9.]+_x64_en-US\.msi$'; 'thumbnail-handler' = '^verification/AlhangeulThumbnailHandler\.dll$'; 'thumbnail-worker' = '^verification/AlhangeulThumbnailWorker\.exe$' }
  foreach ($record in $inventory.files) {
    Assert-Context ($record.kind -in @('nsis', 'msi', 'thumbnail-handler', 'thumbnail-worker') -and -not $records.ContainsKey($record.kind)) 'invalid-kind'
    Assert-Context ($record.path -match '^[A-Za-z0-9_./-]+$' -and $record.path -notmatch '(^/|\.\.|//)') 'invalid-inventory-path'
    Assert-Context ($record.path -cmatch $patterns[$record.kind] -and $record.sha256 -cmatch '^[a-f0-9]{64}$' -and $record.size -gt 0 -and $record.size -le 256MB) 'invalid-bundle-record'
    $file = [IO.Path]::GetFullPath((Join-Path $Root $record.path))
    Assert-ContextFile $file $record
    $records[$record.kind] = $record; $paths[$record.kind] = $file
  }
  Assert-ContextPe $paths['thumbnail-handler'] $true
  Assert-ContextPe $paths['thumbnail-worker'] $false
  return @{ records = $records; paths = $paths; sourceSha = $SourceSha }
}

function Assert-ContextPe($Path, $Dll) {
  $reader = [IO.BinaryReader]::new([IO.File]::OpenRead($Path))
  try {
    Assert-Context ($reader.BaseStream.Length -ge 64 -and $reader.ReadUInt16() -eq 0x5A4D) 'invalid-pe'
    [void]$reader.BaseStream.Seek(60, [IO.SeekOrigin]::Begin)
    $offset = $reader.ReadInt32()
    Assert-Context ($offset -ge 64 -and $offset + 24 -le $reader.BaseStream.Length) 'invalid-pe-offset'
    [void]$reader.BaseStream.Seek($offset, [IO.SeekOrigin]::Begin)
    Assert-Context ($reader.ReadUInt32() -eq 0x4550 -and $reader.ReadUInt16() -eq 0x8664) 'invalid-pe-machine'
    [void]$reader.BaseStream.Seek($offset + 22, [IO.SeekOrigin]::Begin)
    Assert-Context ((($reader.ReadUInt16() -band 0x2000) -ne 0) -eq $Dll) 'invalid-pe-kind'
  } finally { $reader.Dispose() }
}

function New-ContextProtectedDirectory {
  $root = [Environment]::GetFolderPath('ProgramFiles')
  Assert-ContextLocalPath $root
  $path = Join-Path $root ('Alhangeul-Context-' + [Guid]::NewGuid().ToString('N'))
  Assert-Context (-not (Test-Path -LiteralPath $path)) 'protected-path-exists'
  $acl = [Security.AccessControl.DirectorySecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
  foreach ($id in @('S-1-5-18', 'S-1-5-32-544', 'S-1-5-32-545')) {
    $rights = if ($id -eq 'S-1-5-32-545') { 'ReadAndExecute' } else { 'FullControl' }
    $rule = [Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($id), $rights, 'ContainerInherit,ObjectInherit', 'None', 'Allow')
    [void]$acl.AddAccessRule($rule)
  }
  [void][IO.Directory]::CreateDirectory($path, $acl)
  Assert-ContextProtectedDirectory $path
  return $path
}

function Assert-ContextProtectedDirectory($Path) {
  $root = [Environment]::GetFolderPath('ProgramFiles')
  Assert-Context ([IO.Path]::GetDirectoryName($Path) -ieq $root -and [IO.Path]::GetFileName($Path) -match '^Alhangeul-Context-[a-f0-9]{32}$') 'invalid-protected-directory'
  Assert-ContextLocalPath $Path
  $acl = Get-Acl -LiteralPath $Path
  Assert-Context ($acl.AreAccessRulesProtected -and $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -eq 'S-1-5-32-544') 'unsafe-owner-or-inheritance'
  $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  Assert-Context ($rules.Count -eq 3) 'unexpected-acl'
  foreach ($id in @('S-1-5-18', 'S-1-5-32-544', 'S-1-5-32-545')) {
    $matches = @($rules | Where-Object { $_.IdentityReference.Value -eq $id })
    Assert-Context ($matches.Count -eq 1) 'missing-acl'
    $rule = $matches[0]
    $rights = if ($id -eq 'S-1-5-32-545') { [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor [Security.AccessControl.FileSystemRights]::Synchronize } else { [Security.AccessControl.FileSystemRights]::FullControl }
    Assert-Context ($rule.AccessControlType -eq 'Allow' -and $rule.FileSystemRights -eq $rights -and $rule.InheritanceFlags -eq 'ContainerInherit,ObjectInherit' -and $rule.PropagationFlags -eq 'None') 'unsafe-acl'
  }
}

function Copy-ContextPayload($Bundle, $Destination) {
  Assert-ContextProtectedDirectory $Destination
  foreach ($pair in @(@('thumbnail-handler', 'AlhangeulThumbnailHandler.dll'), @('thumbnail-worker', 'AlhangeulThumbnailWorker.exe'))) {
    $path = Join-Path $Destination $pair[1]
    # Copy bytes, not a source security descriptor. Seal each file before COM registration.
    $inputStream = [IO.File]::OpenRead($Bundle.paths[$pair[0]])
    $outputStream = $null
    try { $outputStream = [IO.File]::Open($path, [IO.FileMode]::CreateNew); $inputStream.CopyTo($outputStream) }
    finally { if ($outputStream) { $outputStream.Dispose() }; $inputStream.Dispose() }
    Set-ContextProtectedFile $path
    Assert-ContextFile $path $Bundle.records[$pair[0]]
    Assert-ContextProtectedFile $path
  }
}

function Set-ContextProtectedFile($Path) {
  Assert-ContextProtectedDirectory ([IO.Path]::GetDirectoryName($Path))
  $acl = [Security.AccessControl.FileSecurity]::new()
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner([Security.Principal.SecurityIdentifier]::new('S-1-5-32-544'))
  foreach ($id in @('S-1-5-18', 'S-1-5-32-544', 'S-1-5-32-545')) {
    $rights = if ($id -eq 'S-1-5-32-545') { 'ReadAndExecute' } else { 'FullControl' }
    $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new([Security.Principal.SecurityIdentifier]::new($id), $rights, 'Allow'))
  }
  [IO.File]::SetAccessControl($Path, $acl)
}

function Assert-ContextProtectedFile($Path) {
  Assert-ContextLocalPath $Path
  Assert-Context ([IO.Path]::GetFileName($Path) -in @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) 'unexpected-payload'
  $acl = Get-Acl -LiteralPath $Path
  Assert-Context ($acl.AreAccessRulesProtected -and $acl.GetOwner([Security.Principal.SecurityIdentifier]).Value -eq 'S-1-5-32-544') 'payload-owner-mismatch'
  $rules = @($acl.GetAccessRules($true, $true, [Security.Principal.SecurityIdentifier]))
  Assert-Context ($rules.Count -eq 3) 'payload-acl-mismatch'
  foreach ($id in @('S-1-5-18', 'S-1-5-32-544', 'S-1-5-32-545')) {
    $matches = @($rules | Where-Object { $_.IdentityReference.Value -eq $id })
    Assert-Context ($matches.Count -eq 1) 'payload-acl-mismatch'
    $rights = if ($id -eq 'S-1-5-32-545') { [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor [Security.AccessControl.FileSystemRights]::Synchronize } else { [Security.AccessControl.FileSystemRights]::FullControl }
    Assert-Context ($matches[0].AccessControlType -eq 'Allow' -and $matches[0].FileSystemRights -eq $rights -and $matches[0].InheritanceFlags -eq 'None' -and $matches[0].PropagationFlags -eq 'None') 'payload-acl-mismatch'
  }
}

function Remove-ContextPayload($Path, $Bundle) {
  if (-not $Path) { return }
  Assert-ContextProtectedDirectory $Path
  foreach ($pair in @(@('thumbnail-handler', 'AlhangeulThumbnailHandler.dll'), @('thumbnail-worker', 'AlhangeulThumbnailWorker.exe'))) {
    $file = Join-Path $Path $pair[1]
    if (Test-Path -LiteralPath $file) { Assert-ContextFile $file $Bundle.records[$pair[0]]; [IO.File]::Delete($file) }
  }
  # Nonrecursive: unexpected files and DLL locks remain visible failures, never force-delete.
  [IO.Directory]::Delete($Path, $false)
}

function Get-ContextFixtures {
  $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'windows-thumbnail-fixtures.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  Assert-Context ($manifest.schemaVersion -eq 1 -and $manifest.fixtures.Count -eq 4 -and $manifest.edge -eq 256) 'invalid-fixtures'
  $repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  $pin = git -C (Join-Path $repo 'third_party/rhwp') rev-parse HEAD
  Assert-Context ($LASTEXITCODE -eq 0 -and $pin -ceq $manifest.rhwpSha) 'fixture-pin-mismatch'
  foreach ($fixture in $manifest.fixtures) {
    Assert-Context ($fixture.path -match '^third_party/rhwp/[A-Za-z0-9_./-]+$' -and $fixture.path -notmatch '\.\.' -and $fixture.id -match '^[a-z0-9-]+$') 'invalid-fixture-path'
    Assert-ContextFile (Join-Path $repo $fixture.path) $fixture
  }
  return $manifest.fixtures
}

function Write-ContextJson($Path, $Value) {
  $bytes = [Text.Encoding]::UTF8.GetBytes((ConvertTo-Json -InputObject $Value -Depth 32))
  $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew)
  try { $stream.Write($bytes, 0, $bytes.Length) } finally { $stream.Dispose() }
}
