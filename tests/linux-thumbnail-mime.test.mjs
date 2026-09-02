import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ALIASES, CANONICAL, assertMimeInstalled, assertMimeRestored } from '../scripts/linux-thumbnail-mime-contract.mjs';

const root = new URL('../', import.meta.url);
const xml = await readFile(new URL('apps/desktop/src-tauri/linux/alhangeul-hwpx.xml', root), 'utf8');
const hook = new URL('apps/desktop/src-tauri/linux/update-mime-database.sh', root);
const removeHook = new URL('apps/desktop/src-tauri/linux/update-mime-database-remove.sh', root);
const upstreamXml = await readFile(new URL('tests/fixtures/shared-mime-info-2.5-hwpx.xml', root), 'utf8');

test('제품 XML은 upstream canonical HWPX glob·ZIP signature·alias만 추가한다', () => {
  assert.equal((xml.match(/<mime-type /g) ?? []).length, 1);
  assert.match(xml, /<mime-type type="application\/x-hwpx">/);
  assert.match(xml, /<glob pattern="\*\.hwpx"\/>/);
  assert.match(xml, /<sub-class-of type="application\/zip"\/>/);
  for (const alias of ALIASES) assert.ok(xml.includes(`<alias type="${alias}"/>`));
  assert.ok(xml.includes('value="PK\\003\\004" offset="0"'));
  assert.match(xml, /value="mimetype" offset="30"[\s\S]*value="application\/hwp\+zip" offset="38"/);
  assert.doesNotMatch(xml, /glob-deleteall|magic-deleteall|<glob pattern="\*\.zip"/);
});

for (const [script, label, missingStatus] of [
  [hook, 'install', 127],
  [removeHook, 'remove', 0],
]) {
  for (const status of [0, 42, 'missing']) {
    test(
      `${label} refresh hook은 고정 root와 ${status} 정책을 지킨다`,
      { skip: process.platform === 'win32' },
      async () => {
        const bin = await mkdtemp(join(tmpdir(), 'alhangeul-mime-hook-'));
        try {
          if (status !== 'missing') {
            const executable = join(bin, 'update-mime-database');
            await writeFile(executable, `#!/bin/sh\nprintf '%s\\n' "$@"\nexit ${status}\n`);
            await chmod(executable, 0o755);
          }
          const result = spawnSync('/bin/sh', [
            fileURLToPath(script),
            '/untrusted-root',
          ], {
            encoding: 'utf8',
            env: {
              ...process.env,
              PATH: bin,
              XDG_DATA_HOME: '/untrusted-root',
              MIME_ROOT: '/untrusted-root',
            },
          });
          assert.equal(
            result.status,
            status === 'missing' ? missingStatus : status,
            result.stderr,
          );
          if (status !== 'missing') assert.equal(result.stdout, '/usr/share/mime\n');
        } finally {
          await rm(bin, { recursive: true, force: true });
        }
      },
    );
  }
}

test('new-generation fixture는 shared-mime-info 2.5 원본과 제품 정의를 독립 보존한다', () => {
  assert.notEqual(upstreamXml, xml);
  for (const marker of ['tag 2.5', 'application/x-hwpx', '*.hwpx', ...ALIASES]) {
    assert.ok(upstreamXml.includes(marker), `upstream fixture marker가 필요합니다: ${marker}`);
  }
});

test('MIME 의미 비교는 old/new 설치 전 상태·다른 정의·기본 앱을 보존한다', () => {
  for (const type of ['application/zip', CANONICAL]) {
    const baseline = { types: { glob: type, magic: type, generic: 'application/zip' },
      aliases: Object.fromEntries(ALIASES.map((alias) => [alias, type === CANONICAL ? CANONICAL : null])),
      defaults: { [CANONICAL]: 'third-party.desktop' }, defaultSettingsSha256: 'original-settings',
      otherDefinitions: { 'other.xml': 'original' }, xmlSha256: null };
    const installed = { ...structuredClone(baseline), xmlSha256: 'product',
      types: { glob: CANONICAL, magic: CANONICAL, generic: 'application/zip' },
      aliases: Object.fromEntries(ALIASES.map((alias) => [alias, CANONICAL])) };
    assertMimeInstalled(installed, baseline, 'product');
    assertMimeRestored(structuredClone(baseline), baseline);
    for (const mutation of [
      (s) => { s.types.generic = CANONICAL; },
      (s) => { delete s.types.magic; },
      (s) => { s.defaults[CANONICAL] = 'alhangeul.desktop'; },
      (s) => { s.defaultSettingsSha256 = 'modified-settings'; },
      (s) => { delete s.otherDefinitions['other.xml']; },
      (s) => { s.aliases[ALIASES[0]] = 'application/zip'; },
    ]) {
      const changed = structuredClone(installed); mutation(changed);
      assert.throws(() => assertMimeInstalled(changed, baseline, 'product'));
    }
    assert.throws(() => assertMimeRestored(installed, baseline));
  }
});

test('Linux canary와 MIME 테스트가 필수 automation·native gate에 연결된다', async () => {
  const config = JSON.parse(await readFile(new URL('apps/desktop/src-tauri/tauri.conf.json', root), 'utf8'));
  for (const format of ['deb', 'rpm']) {
    assert.deepEqual(config.bundle.linux[format].depends, ['shared-mime-info']);
    assert.equal(config.bundle.linux[format].postInstallScript, 'linux/update-mime-database.sh');
    assert.equal(config.bundle.linux[format].postRemoveScript, 'linux/update-mime-database-remove.sh');
  }
  const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.match(pkg.scripts['test:automation'], /tests\/linux-thumbnail-mime.test.mjs/);
});
