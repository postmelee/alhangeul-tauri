import assert from 'node:assert/strict';
import './windows-pdf-confirmation.test.mjs';
import './windows-pdf-tree-diagnostics.test.mjs';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeWindowsPdfs, validateEvidence } from './gui/windows-pdf/analyze.mjs';
import { assertDocumentIdentity } from './gui/support/document-identity.ts';

const workflow = await readFile(new URL('../.github/workflows/alhangeul-windows-pdf.yml', import.meta.url), 'utf8');
const spec = await readFile(new URL('./gui/specs/windows-pdf.e2e.ts', import.meta.url), 'utf8');
const dialog = await readFile(new URL('../scripts/windows-pdf-dialog.ps1', import.meta.url), 'utf8');
const tree = await readFile(new URL('../scripts/windows-pdf-tree-diagnostics.ps1', import.meta.url), 'utf8');
const native = await readFile(new URL('../scripts/windows-pdf-win32.ps1', import.meta.url), 'utf8');
const dispatcher = await readFile(new URL('../.github/workflows/alhangeul-desktop.yml', import.meta.url), 'utf8');
const observation = await readFile(new URL('../scripts/windows-pdf-dialog-observation.ps1', import.meta.url), 'utf8');
const policy = await readFile(new URL('../scripts/windows-pdf-dialog-policy.ps1', import.meta.url), 'utf8');
const dialogWorkflow = await readFile(new URL('../.github/workflows/alhangeul-windows-dialog.yml', import.meta.url), 'utf8');
const buildRef = 'a'.repeat(40);
const expected = { buildRef, fixture: 'biz-plan-hwp', phase: 'fresh' };
const valid = {
  schemaVersion: 2, documentIdentityVerified: true,
  openedTitle: 'source-biz-plan-hwp.hwp - Alhangeul',
  ...expected, status: 'passed', sourceUnchanged: true, dirtyPreserved: true,
  nativeDialogs: true, marker: 'PDF검증', sourceHash: 'a'.repeat(64),
  pdfSha256: 'b'.repeat(64), pageCount: 6, overwriteVerified: false,
};

test('Windows PDF workflow는 read-only dispatch와 기존 exact artifact만 사용한다', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /actions: read\n  contents: read/);
  assert.match(workflow, /ref: \$\{\{ github.workflow_sha \}\}/);
  assert.match(workflow, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(workflow, /--build-ref \$env:PDF_BUILD_REF/);
  assert.match(workflow, /--artifact-name alhangeul-desktop-windows-x64/);
  assert.match(workflow, /artifact-ids: \$\{\{ steps.handoff.outputs.artifact_id \}\}/);
  assert.match(workflow, /digest-mismatch: error/);
  assert.match(workflow, /--verify-inventory/);
  assert.doesNotMatch(workflow, /secrets\.|contents: write|build:desktop|tauri build|release create|publish_release/);
});

test('등록된 dispatcher는 PDF 전용 reusable workflow에 기존 artifact identity만 전달한다', () => {
  assert.match(workflow, /workflow_call:\n    inputs:\n      open_only:/);
  const job = dispatcher.split('\n  windows-pdf-acceptance:\n')[1].split('\n  updater-linux-window-probe:')[0];
  assert.match(job, /if: \$\{\{ inputs.mode == 'windows-pdf-acceptance' \|\| inputs.mode == 'windows-pdf-open-probe' \|\| inputs.mode == 'windows-pdf-dialog-probe' \|\| inputs.mode == 'windows-pdf-dialog-verify' \}\}/);
  assert.match(job, /uses: \.\/.github\/workflows\/alhangeul-windows-pdf.yml/);
  assert.match(job, /build_ref: \$\{\{ inputs.acceptance_candidate_sha \}\}/);
  assert.match(job, /native_run_id: \$\{\{ inputs.acceptance_d1_run_id \}\}/);
  assert.doesNotMatch(job, /write|secrets|publish_release/);
  for (const name of ['artifact', 'build-updater', 'build-updater-acceptance', 'publish-updater']) {
    const block = dispatcher.split(`\n  ${name}:\n`)[1].split(/\n  [a-z][\w-]*:\n/)[0];
    assert.doesNotMatch(block.split('steps:')[0], /windows-pdf-acceptance/);
    assert.match(block, /if: \$\{\{ inputs.mode == '(artifact|updater|updater-acceptance)'/);
  }
});

test('Windows PDF workflow는 두 실제 앱 실행과 실패 증거 및 cleanup을 유지한다', () => {
  assert.match(workflow, /runs-on: windows-2025/);
  assert.match(workflow, /@\('fresh', 'restart'\)/);
  assert.match(workflow, /\$LASTEXITCODE -ne 0.*PDF \$phase failed/);
  assert.match(workflow, /-Phase Cleanup -Kind nsis/);
  assert.match(workflow, /windows-webview2-automation-policy.ps1 -Phase Cleanup/);
  assert.match(workflow, /Upload raw evidence\n        if: \$\{\{ always\(\) \}\}/);
  assert.match(workflow, /needs: windows-pdf/);
  assert.match(workflow, /node tests\/gui\/windows-pdf\/analyze.mjs/);
  assert.doesNotMatch(workflow, /continue-on-error/);
});

test('PDF smoke는 source hash·dirty·overwrite를 단언하고 native dialogs를 우회하지 않는다', () => {
  assert.match(spec, /expect\(sourceHash\).toBe\(fixture.sha256\)/);
  assert.match(spec, /expect\(await hash\(source\)\).toBe\(sourceHash\)/);
  assert.match(spec, /expect\(await browser.getTitle\(\)\).toBe\(beforeTitle\)/);
  assert.match(spec, /output.mtimeMs\).toBeGreaterThan\(previousPdf.mtimeMs\)/);
  assert.match(spec, /concurrentEditTested: false/);
  assert.doesNotMatch(spec, /__TAURI_INTERNALS__|mock.*dialog/i);
  assert.match(dialog, /ProcessIdProperty, \$apps\[0\].Id/);
  assert.match(dialog, /\$allowOverwrite.*Test-Path/);
  assert.match(dialog, /Native overwrite confirmation was not observed/);
});

test('native helper budget begins after menu click and records bounded content-free diagnostics', () => {
  const helper = spec.slice(spec.indexOf('async function nativeDialog'));
  assert.ok(helper.indexOf('data-cmd=') < helper.indexOf("run('powershell.exe'"));
  assert.match(tree, /\$queued -ge 100/);
  assert.match(dialog, /Write-Evidence 'failed' \$_\.Exception.Message/);
  assert.match(dialog, /stage = \$stage/);
  assert.doesNotMatch(dialog, /\$info\.(Name|Value)/);
  assert.doesNotMatch(tree, /\$info\.(Name|Value)/);
});

test('Win32 fallback restricts control identity and verifies bounded filename readback', () => {
  assert.match(dialog, /ClassNameProperty, 'Edit'/);
  assert.match(dialog, /AutomationIdProperty, \$fileNameId/);
  assert.match(dialog, /\$fileNameId = if \(\$Mode -eq 'Open'\) \{ '1148' \} else \{ '1001' \}/);
  assert.match(dialog, /Set-NativeFileName \$dialog \$field \$observedProcessId \$TargetPath/);
  assert.match(native, /dialogPid != expectedPid \|\| controlPid != expectedPid/);
  assert.match(native, /!IsChild\(dialog, control\)/);
  assert.match(native, /GetDlgCtrlID\(control\) != id/);
  assert.match(native, /ClassName\(control\) != cls/);
  assert.match(native, /mode != "Open" && mode != "Save"/);
  assert.match(native, /int id = mode == "Open" \? 1148 : 1001/);
  assert.match(native, /Validate\(dialog, edit, pid, id, "Edit"\)/);
  assert.match(native, /id != 1 && id != 2 && id != 6/);
  assert.match(native, /readback.ToString\(\) != text/);
  assert.match(native, /2, 2000, out result/);
  assert.doesNotMatch(native, /SendKeys|SendInput|mouse_event|SetCursorPos/);
});

test('Both dialog modes use select-all and native edit replacement before verified readback', () => {
  const save = native.split('public static void SetFileName')[1].split('public static void Click')[0];
  assert.match(save, /ControlMessage\(edit, 0x00B1, UIntPtr.Zero, new IntPtr\(-1\), 2, 2000, out result\)/);
  assert.match(save, /SetTextMessage\(edit, 0x00C2, UIntPtr.Zero, text, 2, 2000, out result\)/);
  assert.ok(save.indexOf('ControlMessage(') < save.indexOf('SetTextMessage('));
  assert.ok(save.indexOf('SetTextMessage(') < save.indexOf('VerifyFileName(edit, text)'));
  assert.doesNotMatch(save, /result == UIntPtr.Zero|0x000C/);
  assert.ok(native.indexOf('Validate(dialog, edit') < native.indexOf('if (ControlMessage'));
  assert.ok(native.indexOf('var readback') > native.indexOf('0x00C2'));
  assert.doesNotMatch(dialog, /ValuePattern|\.SetValue\(/);
  assert.match(dialog, /filenameMethod = 'Win32-EditReplaceSelection'/);
  assert.match(dialog, /buttonMethod = 'UIA-InvokePattern'/);
  assert.match(dialog, /buttonMethod = 'Win32-BM_CLICK'/);
  assert.match(dialog, /if \(-not \$allowOverwrite\) \{\s+throw 'Unexpected additional dialog/);
});

test('Filename readback has suffix room and actual Windows negative coverage (static wiring)', async () => {
  assert.match(native, /static void VerifyFileName\(IntPtr edit, string text\)/);
  assert.match(native, /new StringBuilder\(text.Length \+ 2\)/);
  const suite = await readFile(new URL('./windows-pdf-native-diagnostics.test.ps1', import.meta.url), 'utf8');
  const fixture = await readFile(new URL('./gui/windows-dialog/filename-readback.ps1', import.meta.url), 'utf8');
  assert.match(suite, /gui\/windows-dialog\/filename-readback.ps1/);
  assert.match(suite, /\$readbackCaseCount -ne 9/);
  assert.match(dialogWorkflow, /windows-pdf-native-diagnostics.test.ps1 -EvidencePath/);
  assert.match(fixture, /CreateWindowEx\(0, "Edit"/);
  assert.match(fixture, /\[PdfDialogNative\]::SetFileName/);
  assert.match(fixture, /GetMethod\('VerifyFileName'/);
  for (const name of ['one extra character', 'long suffix', 'Korean suffix', 'shorter value', 'same-length mismatch']) {
    assert.ok(fixture.includes(name));
  }
  assert.match(fixture, /Assert-Equal \$rejection 'Filename readback mismatch'/);
  assert.match(fixture, /finally \{ \$fixture.Dispose\(\) \}/);
});

test('PDF requests avoid SVG Debug output and policy avoids the automatic Matches variable', async () => {
  const commands = await readFile(new URL('../apps/desktop/src-tauri/src/commands.rs', import.meta.url), 'utf8');
  assert.match(commands, /#\[derive\(Deserialize\)\]\s+#\[serde\(rename_all = "camelCase"\)\]\s+pub struct AppendPdfPageRequest/);
  assert.doesNotMatch(policy, /\$matches\b/i);
});

test('Document identity rejects wrong fixture, dirty document, generic status and partial names', () => {
  assertDocumentIdentity('source-form-hwpx.hwpx - Alhangeul', 'source-form-hwpx.hwpx');
  for (const title of ['source-biz-plan-hwp.hwp - Alhangeul', '파일 열기 완료',
    '• source-form-hwpx.hwpx - Alhangeul', 'source-form-hwpx.hwpx.bak - Alhangeul', '']) {
    assert.throws(() => assertDocumentIdentity(title, 'source-form-hwpx.hwpx'), /identity mismatch/);
  }
  assert.throws(() => assertDocumentIdentity(' - Alhangeul', ''));
  assert.ok(spec.indexOf('assertDocumentIdentity(openedTitle') < spec.indexOf('await insertMarker()'));
});

test('Open submission uses validated native click before optional UIA path', () => {
  const invoke = dialog.split('function Invoke-Button')[1].split('\ntry {')[0];
  const open = invoke.split('  $pattern = $null')[0];
  assert.match(open, /\$Mode -eq 'Open' -and \$Id -eq '1'/);
  assert.match(open, /Invoke-NativeDialogButton \$Dialog \$Button \$observedProcessId \$Id\s+return/);
  assert.doesNotMatch(open, /\.Invoke\(/);
  assert.match(native, /Validate\(dialog, button, pid, id, "Button"\)/);
});

test('Native helper wires the actual policy and live revalidation (static contract, not PS execution)', () => {
  assert.match(dialog, /windows-pdf-dialog-observation.ps1/);
  assert.match(observation, /windows-pdf-dialog-policy.ps1/);
  assert.match(observation, /Select-PdfDialogButton \$candidates \$expected/);
  assert.match(observation, /RawViewWalker.GetParent/);
  assert.match(observation, /Automation\]::Compare\(\$current, \$Button\)/);
  assert.match(observation, /\[PdfDialogNative\]::ValidateButton/);
  assert.match(dialog, /Assert-PdfButtonCurrent \$Dialog \$Button \$observedProcessId \$Id/);
  assert.match(dialog, /\$button = Find-PdfNativeButton \$dialog '1' \$observedProcessId/);
  assert.match(dialog, /Invoke-PdfConfirmation/);
  assert.doesNotMatch(dialog, /Invoke-Button \$dialog \$yes/);
  assert.doesNotMatch(dialog, /Find-Id \$dialog '[16]'/);
  assert.doesNotMatch(policy, /Get-Process|Test-Path|Add-Type|\.Invoke\(|PostMessage|FindAll|SendKeys/);
});

test('Small Windows job runs real PS5.1 assertions then controlled observation without product builds', async () => {
  assert.match(dialogWorkflow, /workflow_call:/);
  assert.match(dialogWorkflow, /contents: read/);
  assert.match(dialogWorkflow, /runs-on: windows-2025/);
  assert.match(dialogWorkflow, /timeout-minutes: 8/);
  assert.match(dialogWorkflow, /shell: powershell/);
  assert.match(dialogWorkflow, /Parser\]::ParseFile/);
  assert.match(dialogWorkflow, /windows-pdf-dialog-policy.test.ps1 -EvidencePath/);
  assert.match(dialogWorkflow, /probe.ps1 -EvidencePath/);
  assert.match(dialogWorkflow, /Clean only owned fixture resources\n        if: \$\{\{ always\(\) \}\}/);
  assert.match(dialogWorkflow, /Upload sanitized evidence\n        if: \$\{\{ always\(\) \}\}/);
  assert.doesNotMatch(dialogWorkflow, /secrets\.|contents: write|submodules: true|cargo |pnpm install|retry|continue-on-error/);
  const job = dispatcher.split('\n  windows-dialog-probe:\n')[1].split('\n  windows-pdf-acceptance:')[0];
  assert.match(job, /inputs.mode == 'windows-dialog-probe'/);
  assert.match(job, /uses: \.\/.github\/workflows\/alhangeul-windows-dialog.yml/);
  const suite = await readFile(new URL('./windows-pdf-dialog-policy.test.ps1', import.meta.url), 'utf8');
  assert.match(suite, /windows-pdf-dialog-policy.ps1/);
  assert.match(suite, /Select-PdfDialogButton/);
  assert.match(suite, /Get-PdfOverwriteDecision/);
  assert.match(suite, /exit 1/);
  assert.match(suite, /exit 0/);
  const probe = await readFile(new URL('./gui/windows-dialog/probe.ps1', import.meta.url), 'utf8');
  assert.match(probe, /Assert-PdfButtonCurrent/);
  assert.match(probe, /Invoke-NativeDialogButton \$save \$parts.Button \$child.Id '1'/);
  assert.doesNotMatch(probe, /Invoke-NativeDialogButton[^\n]*'6'|\.Invoke\(|SendKeys|TDM_CLICK_BUTTON/);
  assert.match(probe, /fixtureUnchanged/);
});

test('Open probe is distinct from PDF acceptance and focuses filename before editing', () => {
  assert.match(dispatcher, /open_only: \$\{\{ inputs.mode == 'windows-pdf-open-probe' \}\}/);
  assert.match(workflow, /if: \$\{\{ !inputs.open_only && !inputs.confirmation_probe && !inputs.confirmation_verify \}\}/);
  assert.match(workflow, /\$phases = if \(\$env:PDF_SCENARIO -ne 'pdf'\) \{ @\('fresh'\) \}/);
  assert.match(spec, /pdfTested: false/);
  const probe = spec.slice(spec.indexOf("if (inputs.scenario === 'open-only')"), spec.indexOf('await insertMarker()'));
  assert.match(probe, /continue;/);
  assert.match(spec, /evidence.status === 'passed' && inputs.scenario === 'pdf'/);
  assert.match(dialog, /Set-NativeFileNameFocus \$dialog \$field \$observedProcessId \$Mode/);
  assert.doesNotMatch(dialog, /\.SetFocus\(|HasKeyboardFocus/);
  assert.ok(dialog.indexOf('Set-NativeFileNameFocus $dialog') < dialog.indexOf('Set-NativeFileName $dialog'));
  assert.match(native, /PostMessage\(dialog, 0x0028, edit, new IntPtr\(1\)\)/);
  assert.match(native, /info.cbSize = \(uint\)Marshal.SizeOf\(typeof\(GuiThreadInfo\)\)/);
  assert.match(native, /GetGUIThreadInfo\(threadId, ref info\)/);
  assert.match(native, /if \(info.hwndFocus == edit\) return/);
  assert.match(native, /deadline.ElapsedMilliseconds < 2000/);
  assert.doesNotMatch(native, /AttachThreadInput/);
});

test('Controlled observation preserves its provenance and differs from product control types', async () => {
  const fixture = JSON.parse(await readFile(new URL('./fixtures/windows-dialog-controls.json', import.meta.url), 'utf8'));
  const probe = fixture.controlledProbe;
  assert.match(probe.runUrl, /actions\/runs\/34047467032$/);
  assert.match(probe.harnessSha, /^[0-9a-f]{40}$/);
  assert.equal(probe.productTested, false);
  assert.equal(probe.overwriteInvoked, false);
  assert.equal(probe.fixtureUnchanged, true);
  assert.equal(probe.confirmationOwnedBySave, true);
  assert.equal(probe.buttons.length, 2);
  for (const button of probe.buttons) {
    assert.equal(button.type, 'ControlType.Button');
    assert.deepEqual(button.patterns, [10000]);
  }
  assert.ok(fixture.confirmation.every((button) => button.Type === 'ControlType.Pane'));
});

test('Actual app confirmation probe is observation only, isolated from complete PDF acceptance (static contract)', async () => {
  const probe = await readFile(new URL('../scripts/windows-pdf-confirmation-probe.ps1', import.meta.url), 'utf8');
  const probeSpec = await readFile(new URL('./gui/specs/windows-confirmation-probe.e2e.ts', import.meta.url), 'utf8');
  const config = await readFile(new URL('./gui/wdio.windows-pdf.conf.ts', import.meta.url), 'utf8');
  assert.match(dispatcher, /confirmation_probe: \$\{\{ inputs.mode == 'windows-pdf-dialog-probe' \}\}/);
  assert.match(workflow, /Probe modes are mutually exclusive/);
  assert.match(workflow, /Parser\]::ParseFile/);
  assert.match(workflow, /windows-pdf-native-diagnostics.test.ps1 -EvidencePath/);
  assert.match(workflow, /Verify probe files after app cleanup/);
  assert.match(workflow, /if \(\$source -ne \$evidence.sourceHash -or \$target -ne \$evidence.targetHash\)/);
  assert.match(config, /inputs.scenario === 'confirmation-probe'\s+\? 'specs\/windows-confirmation-probe.e2e.ts'/);
  assert.match(config, /scenario !== 'pdf' && phase !== 'fresh'/);
  assert.match(probeSpec, /item.id === 'biz-plan-hwp'/);
  assert.match(probeSpec, /flag: 'wx'/);
  assert.match(probeSpec, /expect\(await hash\(target\)\).toBe\(evidence.targetHash\)/);
  assert.match(probeSpec, /expect\(await hash\(source\)\).toBe\(evidence.sourceHash\)/);
  assert.doesNotMatch(probeSpec, /reloadSession|insertMarker|InputEvent|__TAURI_INTERNALS__/);
  assert.match(probe, /Get-PdfConfirmationObservation/);
  assert.match(probe, /Assert-PdfCandidateIdentity/);
  assert.match(probe, /ReadCommandProbe/);
  assert.match(probe, /GetSupportedPatterns/);
  assert.match(probe, /commandInvoked = \$false; pdfTested = \$false/);
  assert.doesNotMatch(probe, /\.Invoke\(|::Click\(|Invoke-PdfConfirmation|PostMessage|SendKeys|\.Name\b|TargetPath/);
  const branch = dialog.split('if ($ConfirmationProbe) {')[1].split("$buttonMethod = Invoke-PdfConfirmation")[0];
  assert.match(branch, /Read-PdfConfirmationProbe/);
  assert.match(branch, /Write-Evidence 'observed' \$null\s+return/);
  assert.match(dialog, /\$ConfirmationProbe -and -not \$allowOverwrite/);
  const nativeProbe = native.split('public static Dictionary<string, object> ReadCommandProbe')[1].split('public static void RequireCommandPairChecks')[0];
  assert.match(nativeProbe, /ReadCommandChecks/);
  assert.match(nativeProbe, /GetDlgCtrlID\(button\)/);
  assert.match(nativeProbe, /info.hwndActive == confirm/);
  assert.doesNotMatch(nativeProbe, /PostMessage|ControlMessage|SetTextMessage|RequireCommandChecks/);
});

test('Actual app command verification is one-HWP, isolated, and checks decline/confirm file postconditions', async () => {
  const verify = await readFile(new URL('./gui/specs/windows-confirmation-verify.e2e.ts', import.meta.url), 'utf8');
  const decline = await readFile(new URL('../scripts/windows-pdf-confirmation-verify.ps1', import.meta.url), 'utf8');
  assert.match(dispatcher, /confirmation_verify: \$\{\{ inputs.mode == 'windows-pdf-dialog-verify' \}\}/);
  assert.match(workflow, /inputs.confirmation_verify && \(inputs.open_only \|\| inputs.confirmation_probe\)/);
  assert.match(workflow, /Verify confirmation files after app cleanup/);
  assert.match(workflow, /targetMatchesConfirmed = \$true/);
  assert.match(verify, /for \(const action of inputs.selectedCases\) await exercise\(action\)/);
  assert.match(verify, /item.id === 'biz-plan-hwp'/);
  assert.match(verify, /fullPdfTested: false/);
  assert.match(verify, /flag: 'wx'/);
  for (const file of ['source', 'other']) assert.ok(verify.includes(`expect(await hash(${file})).toBe(evidence.${file}Hash)`));
  assert.match(verify, /expect\(await hash\(target\)\).toBe\(evidence.initialTargetHash\)/);
  assert.match(verify, /expect\(await hash\(target\)\).not.toBe\(evidence.initialTargetHash\)/);
  assert.match(verify, /pdfEnvelopeVerified: true/);
  assert.doesNotMatch(verify, /reloadSession|insertMarker|InputEvent|__TAURI_INTERNALS__/);
  assert.match(decline, /Invoke-PdfConfirmation \$Dialog \$wrong 'Confirm'/);
  assert.match(decline, /Overwrite intent rejected: unknown-prompt\./);
  assert.match(decline, /Invoke-PdfConfirmation \$Dialog \$Intent 'Decline'/);
  assert.match(decline, /returnedToSave = \$true/);
  assert.match(decline, /Close-PdfFileDialog \$remaining\[0\]/);
  assert.match(decline, /Wait-PdfAppDialogs \$Intent.ProcessId 0/);
  assert.match(dialog, /\$ConfirmationCase -and \(\$ConfirmationProbe -or -not \$allowOverwrite\)/);
  assert.match(dialog, /Write-Evidence 'cancelled' \$null/);
});

test('PDF evidence validator rejects missing, failed, wrong SHA and incomplete overwrite results', () => {
  validateEvidence(valid, expected);
  for (const mutation of [
    { status: 'failed' }, { buildRef: 'b'.repeat(40) }, { sourceUnchanged: false },
    { dirtyPreserved: false }, { nativeDialogs: false }, { pageCount: 5 },
    { pageCount: 0 }, { pdfSha256: null }, { marker: '' }, { overwriteVerified: true },
    { schemaVersion: undefined }, { documentIdentityVerified: false },
    { openedTitle: 'source-form-hwpx.hwpx - Alhangeul' },
  ]) assert.throws(() => validateEvidence({ ...valid, ...mutation }, expected));
  assert.throws(() => validateEvidence({ ...valid, phase: 'restart' }, { ...expected, phase: 'restart' }));
});

test('PDF analysis fails closed when required evidence is missing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'windows-pdf-contract-'));
  try {
    await assert.rejects(analyzeWindowsPdfs(root, buildRef), /ENOENT/);
    await assert.rejects(analyzeWindowsPdfs(root, 'short'), /Invalid buildRef/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('PDF analysis requires all four exact outputs and rejects tampered PDF bytes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'windows-pdf-contract-'));
  const bytes = Buffer.from('contract-only-pdf');
  const digest = createHash('sha256').update(bytes).digest('hex');
  const calls = [];
  const analyze = async (options) => { calls.push(options); return { summary: {} }; };
  try {
    for (const fixture of ['biz-plan-hwp', 'form-hwpx']) {
      for (const phase of ['fresh', 'restart']) {
        const label = `${fixture}-${phase}`;
        await writeFile(join(root, `${label}.json`), JSON.stringify({
          ...valid, fixture, phase, pdfSha256: digest,
          openedTitle: `source-${fixture}.${fixture === 'biz-plan-hwp' ? 'hwp' : 'hwpx'} - Alhangeul`,
          overwriteVerified: phase === 'restart',
        }));
        await writeFile(join(root, `${label}.pdf`), bytes);
      }
    }
    await analyzeWindowsPdfs(root, buildRef, analyze);
    assert.equal(calls.length, 4);
    assert.equal(calls[0].expectedTitle, 'PDF검증');
    const summary = JSON.parse(await readFile(join(root, 'windows-pdf-summary.json'), 'utf8'));
    assert.equal(summary.results.length, 4);
    assert.equal(summary.visualReadbackRequired, true);
    await writeFile(join(root, 'form-hwpx-restart.pdf'), 'tampered');
    await assert.rejects(analyzeWindowsPdfs(root, buildRef, analyze), /digest mismatch/);
    await assert.rejects(readFile(join(root, 'windows-pdf-summary.json')), /ENOENT/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
