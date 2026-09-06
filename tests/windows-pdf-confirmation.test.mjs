import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const [adapter, helper, native, workflow, support, host, integration] = await Promise.all([
  read('../scripts/windows-pdf-confirmation.ps1'), read('../scripts/windows-pdf-dialog.ps1'),
  read('../scripts/windows-pdf-win32.ps1'), read('../.github/workflows/alhangeul-windows-dialog.yml'),
  read('./gui/windows-dialog/integration-support.ps1'), read('./gui/windows-dialog/integration-host.ps1'),
  read('./gui/windows-dialog/integration.ps1'),
]);

test('Actual PDF helper and controlled integration share the guarded confirmation adapter', () => {
  assert.match(helper, /windows-pdf-confirmation.ps1/);
  assert.match(integration, /windows-pdf-confirmation.ps1/);
  assert.match(helper, /Invoke-PdfConfirmation \$extraDialogs\[0\] \$intent 'Confirm'/);
  assert.match(support, /Invoke-PdfConfirmation \$extra\[0\] \$Intent \$action/);
  assert.match(adapter, /Get-PdfOverwriteDecision \$context/);
  assert.match(adapter, /Test-PdfReplacePrompt/);
  assert.match(adapter, /Select-PdfConfirmationButton/);
  assert.match(adapter, /Automation\]::Compare\(\$button, \$current\)/);
  assert.match(adapter, /ValidateCommand/);
  assert.match(adapter, /TryGetCurrentPattern/);
  assert.match(adapter, /Confirmation InvokePattern unsupported/);
  assert.doesNotMatch(adapter, /TDM_CLICK_BUTTON|LegacyIAccessible|SendKeys|SendInput/);
  const invoke = adapter.split('function Invoke-PdfConfirmation')[1].split('function Close-PdfFileDialog')[0];
  assert.doesNotMatch(invoke, /Invoke-NativeDialogButton/);
  assert.match(native, /GetWindow\(confirm, 4\) == save/);
  assert.match(native, /"saveDisabled", !IsWindowEnabled\(save\)/);
  assert.match(native, /"confirmationEnabled", IsWindowEnabled\(confirm\)/);
  assert.match(native, /checks\["buttonIsChild"\] = IsChild\(confirm, button\)/);
});

test('Native diagnostics preserve the guard and share a filtered exception extractor', async () => {
  const diagnostics = await read('../scripts/windows-pdf-native-diagnostics.ps1');
  const suite = await read('./windows-pdf-native-diagnostics.test.ps1');
  assert.match(native, /checks\["buttonClassMatches"\] = buttonClass == "CCPushButton"/);
  assert.match(native, /RequireCommandChecks\(checks\)/);
  assert.match(native, /ChecksPass\(ReadConfirmationChecks\(save, confirm, pid\), OwnerChecks\)/);
  assert.match(native, /ChecksPass\(checks, OwnerChecks\) && ChecksPass\(checks, ButtonChecks\)/);
  assert.match(native, /error.Data\["PdfConfirmationNative"\] = checks/);
  assert.match(diagnostics, /Dictionary\[string, object\]/);
  assert.match(diagnostics, /-is \[bool\]/);
  assert.match(diagnostics, /failedChecks/);
  assert.doesNotMatch(diagnostics, /\.Message|\.StackTrace|TargetPath/);
  assert.match(adapter, /windows-pdf-native-diagnostics.ps1/);
  for (const source of [helper, integration]) {
    assert.match(source, /nativeFailure = Get-PdfNativeFailure \$_/);
  }
  assert.match(workflow, /windows-pdf-native-diagnostics.test.ps1 -EvidencePath/);
  assert.ok(workflow.indexOf('name: Verify native guard diagnostics') < workflow.indexOf('name: Verify controlled dialog postconditions'));
  assert.match(suite, /\[PdfDialogNative\]::RequireCommandChecks/);
  assert.match(suite, /\[PdfDialogNative\]::ValidateCommand\(\[IntPtr\]::Zero/);
  assert.doesNotMatch(suite, /::Click\(|\.Invoke\(|SendKeys|SendInput/);
});

test('Small verify mode is distinct from observation and checks actual file/cancel postconditions', () => {
  assert.match(workflow, /verify:\n        type: boolean\n        default: false/);
  assert.match(workflow, /if: \$\{\{ !inputs.verify \}\}/);
  assert.match(workflow, /if: \$\{\{ inputs.verify \}\}/);
  assert.match(workflow, /integration.ps1 -EvidencePath/);
  assert.match(integration, /@\('Open', 'Fresh', 'Overwrite', 'Decline', 'WrongTarget'\)/);
  assert.match(support, /wrongTargetRejected = \$true/);
  assert.match(support, /returnedToSave = \$true/);
  assert.match(support, /Close-PdfFileDialog \$Save/);
  assert.match(support, /targetVerified.*ReadAllText/);
  assert.match(support, /sourceUnchanged.*ReadAllText/);
  assert.match(support, /otherTargetUnchanged.*ReadAllText/);
  assert.match(host, /dialog.FileName -ceq \$target/);
  assert.match(host, /if \(\$selectedExpected -and \$Scenario -ne 'Open'\)/);
  assert.match(integration, /cleanup.ps1/);
  assert.doesNotMatch(workflow, /continue-on-error|secrets\./);
});
