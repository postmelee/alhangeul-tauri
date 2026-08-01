import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { verifyLinuxDesktopEntrySource } from '../scripts/check-release-metadata.mjs';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const templatePath = join(
  repositoryRoot,
  'apps/desktop/src-tauri/linux/main.desktop',
);
const validSource = await readFile(templatePath, 'utf8');

test('Linux desktop entry가 문서 인자와 MIME template 계약을 충족한다', () => {
  assert.doesNotThrow(() => verifyLinuxDesktopEntrySource(validSource));
});

for (const [name, mutate, expectedError] of [
  ['문서 field code 누락', (source) => source.replace(' %F', ''), /Exec 값이 다릅니다/],
  ['문서 field code 중복', (source) => source.replace('%F', '%F %F'), /Exec 값이 다릅니다/],
  ['URL field code 사용', (source) => source.replace('%F', '%U'), /Exec 값이 다릅니다/],
  ['MIME 출력 누락', (source) => source.replace('MimeType={{mime_type}}', ''), /MIME 조건부 출력이 필요합니다/],
]) {
  test(`${name}을 거부한다`, () => {
    assert.throws(
      () => verifyLinuxDesktopEntrySource(mutate(validSource)),
      expectedError,
    );
  });
}
