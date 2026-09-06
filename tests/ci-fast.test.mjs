import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const source = readFileSync(new URL('../.github/workflows/alhangeul-ci-fast.yml', import.meta.url), 'utf8');
test('fast workflow has Windows/Linux contracts but no native build or secrets', () => {
  assert.match(source, /workflow_call:/);
  assert.match(source, /runs-on: windows-2025/);
  assert.match(source, /runs-on: ubuntu-24.04/);
  assert.match(source, /windows-tests\.ps1/);
  for (const command of ['test:automation', 'test:upstream', 'test:studio', 'build:studio', 'typecheck:gui']) assert.ok(source.includes(command));
  assert.doesNotMatch(source, /cargo |tauri build|apt-get|secrets\.|contents: write/);
});
test('Windows test runner parses tracked files and propagates isolated child status', () => {
  const runner = readFileSync(new URL('../scripts/ci/windows-tests.ps1', import.meta.url), 'utf8');
  const child = readFileSync(new URL('../scripts/ci/windows-test-process.ps1', import.meta.url), 'utf8');
  assert.match(runner, /Parser\]::ParseFile/);
  assert.match(runner, /\*\.test\.ps1/);
  assert.match(child, /\$child.ExitCode -ne 0/);
  assert.match(child, /throw/);
  assert.doesNotMatch(child, /continue-on-error|LASTEXITCODE = 0/);
});
