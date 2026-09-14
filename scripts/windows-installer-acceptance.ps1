# Definition-only entry. IO/provenance verification and workflow gates belong to Stage 6.1.2.
. (Join-Path $PSScriptRoot 'windows-thumbnail-assessment.ps1')
. (Join-Path $PSScriptRoot 'windows-installer-reboot.ps1')
. (Join-Path $PSScriptRoot 'windows-installer-acceptance-evidence.ps1')
. (Join-Path $PSScriptRoot 'windows-installer-acceptance-policy.ps1')

function Get-InstallerAcceptance($InputEvidence) {
  Set-StrictMode -Version Latest
  $answer = [ordered]@{
    schemaVersion = 1; policyVersion = 1; contractStatus = 'failed'; contract = 'unverified'
    thumbnailStatus = 'unverified'; lifecycleStatus = 'unverified'; reasonCodes = @('invalid-contract')
    productAcceptance = 'unverified'; releaseAcceptance = 'unverified'; reuseEligible = $false
    provenanceStatus = 'requires-io-verification'; rawSmoke = $null
  }
  try {
    $c = $InputEvidence.context; $contract = $c.contract
    Assert-Acceptance ($contract -cin @('strict-product', 'hosted-nsis-diagnostic', 'msi-forced-reinstall-reboot'))
    Assert-Acceptance ($c.installerKind -cin @('nsis', 'msi') -and $c.scenario -cin @('lifecycle', 'forced-reinstall'))
    if ($contract -ceq 'strict-product') { Assert-Acceptance ($c.scenario -ceq 'lifecycle') }
    if ($contract -ceq 'hosted-nsis-diagnostic') { Assert-Acceptance ($c.installerKind -ceq 'nsis' -and $c.scenario -ceq 'lifecycle') }
    if ($contract -ceq 'msi-forced-reinstall-reboot') { Assert-Acceptance ($c.installerKind -ceq 'msi' -and $c.scenario -ceq 'forced-reinstall') }
    $answer.contract = $contract; $answer.reasonCodes = @('invalid-identity')
    Assert-AcceptanceIdentity $InputEvidence
    $answer.reasonCodes = @('invalid-common-evidence'); Assert-AcceptanceCommon $InputEvidence
    $answer.reasonCodes = @('invalid-lifecycle-evidence')
    $lifecycle = Get-AcceptanceLifecycle $InputEvidence
    Assert-AcceptanceLaunchRollback $InputEvidence.summary.Installers[0]
    $phases = @('initial', $(if ($lifecycle -ceq 'reboot-required') { 'pre-reboot-observation' } else { 'reinstalled' }))
    $answer.reasonCodes = @('invalid-thumbnail-evidence')
    $findings = @(Get-AcceptanceFindings $InputEvidence $phases $lifecycle)
    $answer.reasonCodes = @('unexpected-product-failure')
    $policy = Get-AcceptancePolicy $InputEvidence $findings $lifecycle
    $answer.reasonCodes = @('invalid-step-evidence'); Assert-AcceptanceSteps $InputEvidence $policy.failureCount
    $answer.contractStatus = 'passed'; $answer.lifecycleStatus = $lifecycle
    $answer.thumbnailStatus = if ($policy.limited) { 'not-accepted' } else { 'passed' }
    $answer.productAcceptance = if ($policy.limited -or $policy.reboot) { 'limited-observation' } else { 'scenario-only' }
    # Wrap the whole conditional: an inner single-item array is pipeline-unrolled.
    $answer.reasonCodes = @(if ($policy.limited) { 'nsis-per-user-shell-activation-failed' }
      elseif ($policy.reboot) { 'msi-reboot-required'; 'post-reboot-unverified' }
      elseif ($contract -ceq 'hosted-nsis-diagnostic') { 'known-limitation-not-reproduced' } else { 'scenario-observed' })
    $answer.rawSmoke = [ordered]@{ status = $InputEvidence.summary.Status; outcome = $InputEvidence.steps.smoke; exitCode = $InputEvidence.smokeExitCode; failureCount = $policy.failureCount }
  } catch { <# Deliberately omit untrusted exception text, raw paths and failure messages. #> }
  return $answer
}
