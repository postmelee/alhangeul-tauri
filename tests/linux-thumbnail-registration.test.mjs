import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const registration = await readFile(join(
  repoRoot,
  'apps/desktop/src-tauri/linux/alhangeul.thumbnailer',
), 'utf8');
const workflow = await readFile(join(
  repoRoot,
  '.github/workflows/alhangeul-linux-gui.yml',
), 'utf8');
const packageJson = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'));

test('Freedesktop registration은 제품 helper와 HWP HWPX MIME만 선언한다', () => {
  assert.equal(registration, [
    '[Thumbnailer Entry]',
    'TryExec=/usr/lib/alhangeul/alhangeul-thumbnailer',
    'Exec=/usr/lib/alhangeul/alhangeul-thumbnailer %i %o %s',
    'MimeType=application/x-hwp;application/x-hwpx;',
    '',
  ].join('\n'));
  assert.doesNotMatch(registration, /%u|sh -c|env |application\/octet-stream/);
});

test('GUI workflow는 같은 native run의 exact Linux helper artifact를 별도로 검증한다', () => {
  const handoff = stepContaining(workflow, 'Verify exact Linux thumbnailer artifact handoff');
  assert.match(handoff, /--artifact-name alhangeul-linux-x64-thumbnailer/);
  assert.match(handoff, /--workflow-path \.github\/workflows\/alhangeul-desktop\.yml/);
  assert.match(handoff, /--build-ref "\$BUILD_REF"/);
  assert.match(handoff, /--run-id "\$NATIVE_RUN_ID"/);
  const download = stepContaining(workflow, 'Download verified Linux thumbnailer artifact');
  assert.match(download, /artifact-ids: \$\{\{ steps\.thumbnailer-handoff\.outputs\.artifact_id \}\}/);
  assert.match(download, /run-id: \$\{\{ inputs\.native_run_id \}\}/);
  assert.match(download, /digest-mismatch: error/);
});

test('helper summary와 ELF identity를 검증한 경로만 manager probe에 전달한다', () => {
  const verify = stepContaining(workflow, 'Verify exact Linux thumbnailer binary');
  for (const marker of [
    'value.repositorySha !== sha',
    'value.target !== "x86_64-unknown-linux-gnu"',
    'value.architecture !== "x64"',
    'value.elfType !== 3',
    'value.elfMachine !== 62',
    'sha256sum "$helper"',
    'chmod 0755 "$helper"',
    "printf 'helper_path=%s\\n' \"$helper\"",
  ]) assert.ok(verify.includes(marker), `helper 검증 marker가 필요합니다: ${marker}`);
  const probe = stepContaining(workflow, 'Run Linux thumbnail manager contract probe');
  assert.match(probe, /scripts\/linux-thumbnail-manager-probe\.sh/);
  assert.match(probe, /steps\.verify-thumbnailer\.outputs\.helper_path/);
  assert.doesNotMatch(probe, /thumbnail-stub|SNAP_NAME|base64 --decode/);
  const record = stepContaining(workflow, 'step-outcomes.json');
  const gate = stepContaining(workflow, 'Require Linux GUI acceptance success');
  for (const marker of [
    'steps.thumbnailer-handoff.outcome',
    'steps.download-thumbnailer.outcome',
    'steps.verify-thumbnailer.outcome',
  ]) {
    assert.ok(record.includes(marker), `outcome 기록이 필요합니다: ${marker}`);
    assert.ok(gate.includes(marker), `최종 gate가 필요합니다: ${marker}`);
  }
});

test('registration contract가 automation inventory에 포함된다', () => {
  assert.match(packageJson.scripts['test:automation'], /tests\/linux-thumbnail-registration\.test\.mjs/);
});

function stepContaining(source, marker) {
  const lines = source.split(/\r?\n/);
  const markerLine = lines.findIndex((line) => line.includes(marker));
  assert.notEqual(markerLine, -1, `step marker가 필요합니다: ${marker}`);
  let start = markerLine;
  while (start >= 0 && !/^      - name: /.test(lines[start])) start -= 1;
  let end = lines.length;
  for (let index = markerLine + 1; index < lines.length; index += 1) {
    if (/^      - name: /.test(lines[index])) { end = index; break; }
  }
  return lines.slice(start, end).join('\n');
}
