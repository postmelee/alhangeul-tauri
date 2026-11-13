# Called only by the protected SYSTEM task in a disposable evaluation guest.
function Install-GuestPrerequisites {
  $observed = @()
  foreach ($item in $inputData.prerequisites) {
    if ($item.name -cne 'vc' -or $item.file -cne 'vc-redist.exe') { throw 'unknown-fixed-prerequisite' }
    $path = Join-Path $root $item.file
    if ((Get-Item $path).Length -ne $item.bytes -or
        (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $item.sha256) { throw 'prerequisite-hash-mismatch' }
    $signature = Get-AuthenticodeSignature -LiteralPath $path
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch '(?:^|, )O=Microsoft Corporation(?:,|$)') { throw 'microsoft-signature-required' }
    $code = Run-Owned $path '/install /quiet /norestart' 300
    $observed += @{ name = $item.name; sha256 = $item.sha256; signatureStatus = [string]$signature.Status; signer = $signature.SignerCertificate.Subject; exitCode = $code }
    if ($code -ne 0) { throw ('prerequisite-install-exit-' + $code) }
  }
  return $observed
}
