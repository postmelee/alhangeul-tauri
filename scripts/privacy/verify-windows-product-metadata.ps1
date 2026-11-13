param([string]$Directory = 'apps/desktop/src-tauri/windows/thumbnail-resources')
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$version = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '../../package.json') -Raw | ConvertFrom-Json).version
$rows = foreach ($name in @('AlhangeulThumbnailHandler.dll', 'AlhangeulThumbnailWorker.exe')) {
    $file = Get-Item -LiteralPath (Join-Path $Directory $name)
    $info = $file.VersionInfo
    if ($info.ProductName -ne 'Alhangeul' -or $info.ProductVersion -ne $version -or $info.FileVersion -ne $version) {
        throw "Product/version resource mismatch: $name"
    }
    [ordered]@{ name = $name; productName = $info.ProductName; productVersion = $info.ProductVersion; fileVersion = $info.FileVersion; sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
$rows | ConvertTo-Json -Depth 4
