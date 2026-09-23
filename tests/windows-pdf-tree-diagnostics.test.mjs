import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { selectConfirmationCases } from './gui/support/confirmation-cases.ts';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [tree, helper, suite, workflow, dispatcher, spec, config] = await Promise.all([
  read('../scripts/windows-pdf-tree-diagnostics.ps1'), read('../scripts/windows-pdf-dialog.ps1'),
  read('./windows-pdf-tree-diagnostics.test.ps1'), read('../.github/workflows/alhangeul-windows-pdf.yml'),
  read('../.github/workflows/alhangeul-desktop.yml'), read('./gui/specs/windows-confirmation-verify.e2e.ts'),
  read('./gui/wdio.windows-pdf.conf.ts'),
]);

test('Confirm-only selection runs exactly one case and fails closed outside verification', () => {
  assert.deepEqual(selectConfirmationCases('confirmation-verify', 'confirm-only'), ['Confirm']);
  assert.deepEqual(selectConfirmationCases('confirmation-verify', 'all'), ['Decline', 'WrongTarget', 'Confirm']);
  for (const scenario of ['pdf', 'open-only', 'confirmation-probe', '']) {
    assert.throws(() => selectConfirmationCases(scenario, 'confirm-only'), /requires confirmation-verify/);
  }
  for (const selection of ['', 'Confirm', 'ALL', 'all\n', 'unknown']) {
    assert.throws(() => selectConfirmationCases('confirmation-verify', selection), /Invalid PDF_CONFIRMATION_CASES/);
  }
});

test('Auxiliary capture is dialog-scoped and bounds traversal before collecting children (static contract)', () => {
  assert.match(helper, /\$treeDiagnostic = Read-PdfDialogTree \$dialogs -Enabled:\$ConfirmationProbe/);
  assert.match(helper, /\$observedTree = @\(\$treeDiagnostic.nodes\)/);
  assert.match(helper, /treeDiagnostic = @\{ status = \$treeDiagnostic.status; reason = \$treeDiagnostic.reason \}/);
  assert.match(tree, /foreach \(\$dialog in \$Dialogs\)/);
  assert.match(tree, /\$queued -ge 100/);
  assert.match(tree, /\$queued -lt 100/);
  assert.match(tree, /RawViewWalker/);
  assert.doesNotMatch(tree, /RootElement|FindAll|\.Name|\.Value|\.Message|StackTrace|TargetPath/);
  assert.doesNotMatch(helper, /function Read-AppTree/);
});

test('Only optional typed stale-element capture is isolated; required discovery remains outside it', () => {
  assert.match(tree, /-is \[System.Windows.Automation.ElementNotAvailableException\]/);
  assert.match(tree, /\$depth -lt 8/);
  assert.match(tree, /status = 'unavailable'; reason = 'element-not-available'; nodes = @\(\)/);
  assert.match(tree, /\$exception = \$exception.InnerException\s+\}\s+throw/);
  assert.match(tree, /return Invoke-PdfTreeDiagnosticCapture \{ Get-PdfDialogTreeNodes \$Dialogs \} -Enabled:\$Enabled/);
  assert.match(helper, /\$dialogs = .*RootElement.FindAll\(\$scope, \$condition\)/);
  assert.doesNotMatch(tree, /Invoke-PdfConfirmation|ClickCommand|Find-PdfNativeButton|Start-Sleep/);
  assert.ok(workflow.indexOf('tests/windows-pdf-tree-diagnostics.test.ps1') < workflow.indexOf('name: Install NSIS product'));
  assert.match(suite, /windows-pdf-tree-diagnostics.ps1/);
  assert.match(suite, /TargetInvocationException/);
  assert.match(suite, /partial output/);
  assert.match(suite, /Assert-Rethrows \$null/);
  assert.match(suite, /productTested = \$false/);
});

test('Tree capture is opt-in and metadata is typed before serialization (static contract)', () => {
  assert.match(tree, /function Invoke-PdfTreeDiagnosticCapture\(\[scriptblock\]\$ReadNodes, \[switch\]\$Enabled\)/);
  assert.ok(tree.indexOf('if (-not $Enabled)') < tree.indexOf('@(& $ReadNodes)'));
  assert.match(tree, /status = 'disabled'; reason = 'diagnostic-mode-only'; nodes = @\(\)/);
  assert.match(tree, /\$ControlType -isnot \[System.Windows.Automation.ControlType\]/);
  assert.match(tree, /type = Get-PdfDiagnosticControlType \$info.ControlType/);
  assert.doesNotMatch(tree, /\$info.ControlType.ProgrammaticName/);
  assert.ok(helper.indexOf("status = 'collecting'") < helper.indexOf('$treeDiagnostic = Read-PdfDialogTree'));
  assert.match(suite, /disabled by default and never calls the collector/);
  assert.match(suite, /null ControlType is explicitly unavailable/);
  const preflight = workflow.split('- name: Check dialog PowerShell before installation')[1].split('- uses: actions/setup-node')[0];
  assert.doesNotMatch(preflight, /^\s*if:/m);
  assert.match(preflight, /tests\/windows-pdf-tree-diagnostics.test.ps1/);
});

test('Case selection is carried through dispatch, execution and post-cleanup evidence', () => {
  assert.match(dispatcher, /confirmation_cases: \$\{\{ inputs.confirmation_cases \|\| 'all' \}\}/);
  assert.match(workflow, /PDF_CONFIRMATION_CASES: \$\{\{ inputs.confirmation_cases \}\}/);
  assert.match(workflow, /Confirm-only requires confirmation-verify/);
  assert.match(config, /selectConfirmationCases\(scenario, confirmationCases\)/);
  assert.match(spec, /for \(const action of inputs.selectedCases\) await exercise\(action\)/);
  assert.match(spec, /confirmationCases: inputs.confirmationCases, selectedCases: inputs.selectedCases/);
  assert.match(workflow, /\$evidence.selectedCases -join ','/);
  assert.match(workflow, /\$evidence.cases.case -join ','/);
  assert.match(workflow, /Confirmation case evidence mismatch/);
  assert.match(workflow, /selectedCases = \$selected/);
});
