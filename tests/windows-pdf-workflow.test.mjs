import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { analyzeWindowsPdfs, validateEvidence } from './gui/windows-pdf/analyze.mjs';

const workflow = await readFile(new URL('../.github/workflows/alhangeul-windows-pdf.yml', import.meta.url), 'utf8');
const spec = await readFile(new URL('./gui/specs/windows-pdf.e2e.ts', import.meta.url), 'utf8');
const dialog = await readFile(new URL('../scripts/windows-pdf-dialog.ps1', import.meta.url), 'utf8');
const native = await readFile(new URL('../scripts/windows-pdf-win32.ps1', import.meta.url), 'utf8');
const dispatcher = await readFile(new URL('../.github/workflows/alhangeul-desktop.yml', import.meta.url), 'utf8');
const buildRef = 'a'.repeat(40);
const expected = { buildRef, fixture: 'biz-plan-hwp', phase: 'fresh' };
const valid = {
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
  assert.match(workflow, /workflow_call:\n    inputs:\n      build_ref:/);
  const job = dispatcher.split('\n  windows-pdf-acceptance:\n')[1].split('\n  updater-linux-window-probe:')[0];
  assert.match(job, /if: \$\{\{ inputs.mode == 'windows-pdf-acceptance' \}\}/);
  assert.match(job, /uses: \.\/.github\/workflows\/alhangeul-windows-pdf.yml/);
  assert.match(job, /build_ref: \$\{\{ inputs.acceptance_candidate_sha \}\}/);
  assert.match(job, /native_run_id: \$\{\{ inputs.acceptance_d1_run_id \}\}/);
  assert.doesNotMatch(job, /write|secrets|publish_release/);
  for (const name of ['build', 'windows-installer-smoke', 'build-updater', 'build-updater-acceptance', 'publish-updater']) {
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
  assert.match(dialog, /\$result.Count -ge 100/);
  assert.match(dialog, /Write-Evidence 'failed' \$_\.Exception.Message/);
  assert.match(dialog, /stage = \$stage/);
  assert.doesNotMatch(dialog, /\$info\.(Name|Value)/);
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
  assert.match(native, /id != 1 && id != 6/);
  assert.match(native, /readback.ToString\(\) != text/);
  assert.match(native, /2, 2000, out result/);
  assert.doesNotMatch(native, /SendKeys|SendInput|mouse_event|SetCursorPos/);
});

test('PDF evidence validator rejects missing, failed, wrong SHA and incomplete overwrite results', () => {
  validateEvidence(valid, expected);
  for (const mutation of [
    { status: 'failed' }, { buildRef: 'b'.repeat(40) }, { sourceUnchanged: false },
    { dirtyPreserved: false }, { nativeDialogs: false }, { pageCount: 5 },
    { pageCount: 0 }, { pdfSha256: null }, { marker: '' }, { overwriteVerified: true },
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
