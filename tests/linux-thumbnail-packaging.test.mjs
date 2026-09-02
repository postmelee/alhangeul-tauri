import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { assertArchivePaths, ownersFromInventory } from '../scripts/linux-thumbnail-package-contract.mjs';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const [configSource, workflow, wrapper, smoke, fixtures, contract, verifier] = await Promise.all([
  readFile(join(repoRoot, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'),
  readFile(join(repoRoot, '.github/workflows/alhangeul-desktop.yml'), 'utf8'),
  readFile(join(repoRoot, 'scripts/linux-thumbnail-package-smoke.sh'), 'utf8'),
  readFile(join(repoRoot, 'scripts/linux-thumbnail-package-smoke.mjs'), 'utf8'),
  readFile(join(repoRoot, 'scripts/linux-thumbnail-package-fixtures.mjs'), 'utf8'),
  readFile(join(repoRoot, 'scripts/linux-thumbnail-package-contract.mjs'), 'utf8'),
  readFile(join(repoRoot, 'scripts/verify-linux-thumbnail-package-evidence.mjs'), 'utf8'),
]);
const config = JSON.parse(configSource);
const helperPath = '/usr/lib/alhangeul/alhangeul-thumbnailer';
const registrationPath = '/usr/share/thumbnailers/alhangeul.thumbnailer';
const smokePath = join(repoRoot, 'scripts/linux-thumbnail-package-smoke.mjs');

test('Tauri DEB와 RPM만 동일한 제품 helper와 registration을 설치한다', () => {
  const expected = {
    [helperPath]: 'linux/thumbnail-resources/alhangeul-thumbnailer',
    [registrationPath]: 'linux/alhangeul.thumbnailer',
    '/usr/share/mime/packages/alhangeul-hwpx.xml': 'linux/alhangeul-hwpx.xml',
  };
  assert.deepEqual(config.bundle.linux.deb.files, expected);
  assert.deepEqual(config.bundle.linux.rpm.files, expected);
  assert.equal(config.bundle.linux.appimage?.files, undefined);
});

test('workflow는 exact helper를 bundle 전에 staging하고 package evidence 뒤 inventory를 만든다', () => {
  assertOrdered(workflow, [
    '- name: Build Linux thumbnailer',
    '- name: Require Linux thumbnailer build success',
    '- name: Stage Linux thumbnailer package resources',
    '- name: Build Tauri bundles',
    '- name: Run Linux thumbnail package lifecycle',
    '- name: Upload Linux thumbnail package evidence',
    '- name: Require Linux thumbnail package success',
    '- name: Verify bundle artifact',
  ]);
  assert.match(workflow, /install -D -m 0755[\s\S]*linux\/thumbnail-resources\/alhangeul-thumbnailer/);
  assert.match(workflow, /ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM: "1"/);
  assert.match(workflow, /--repository-sha "\$\(git rev-parse HEAD\)"/);
  assert.match(workflow, /verification\/linux-thumbnail-packages\.json/);
  assert.match(workflow, /alhangeul-\$\{\{ matrix\.name \}\}-thumbnail-package/);
});

test('lifecycle는 기존 설치를 거부하고 만든 package만 정리한다', () => {
  assert.match(wrapper, /exec node .*linux-thumbnail-package-smoke\.mjs/);
  assert.match(smoke, /GITHUB_ACTIONS !== 'true'/);
  assert.match(smoke, /ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM !== '1'/);
  assert.ok(
    smoke.indexOf('assertNoExistingPackages(context.platform)')
      < smoke.indexOf("run('sudo', ['install', '-D'"),
    '두 package DB의 기존 설치 preflight가 최초 system write보다 먼저여야 합니다',
  );
  assert.ok(smoke.indexOf('assertNoExistingPackages(context.platform)') < smoke.indexOf('await prepareSystemMime(context)'));
  assert.match(smoke, /if \(context\.owned\.deb\).*dpkg.*--remove/);
  assert.match(smoke, /if \(context\.owned\.rpm\).*rpm.*-e/);
  assert.doesNotMatch(smoke, /rmSync|rm\(|rm -rf|\/\.cache\/thumbnails|pkill|killall/);
});

test('package lifecycle executable은 opt-in GitHub runner 밖에서 명령 전에 중단한다', () => {
  const result = spawnSync(process.execPath, [smokePath], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_ACTIONS: 'false',
      ALHANGEUL_PACKAGE_SMOKE_ALLOW_SYSTEM: '1',
    },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /restricted to opted-in ephemeral GitHub Actions runners/);
  assert.doesNotMatch(result.stderr, /sudo|dpkg|rpm/);
});

test('MIME smoke wrapper는 CI에서 직접 실행할 수 있다', async () => {
  const result = spawnSync('git', [
    'ls-files', '--stage', '--', 'scripts/linux-thumbnail-mime-smoke.sh',
  ], { cwd: repoRoot, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^100755 /);
});

test('DEB와 RPM은 install reinstall stale refresh recovery update rollback uninstall을 검증한다', () => {
  const sources = `${smoke}\n${fixtures}\n${contract}`;
  for (const marker of [
    'clean-install',
    'same-version-reinstall',
    'update',
    'injected-failure-rollback', 'purge-without-update-mime-database',
    'uninstall',
    '0.0.0', '9999.0.0', '9998.0.0', 'refresh-failure-observed', 'explicit-recovery',
    '--replacepkgs', '--oldpackage', 'rollback hashes',
  ]) assert.ok(sources.includes(marker), `lifecycle marker가 필요합니다: ${marker}`);
  assert.ok(fixtures.includes("%pre\\nexit 42\\n"));
  assert.match(fixtures, /dpkg-deb.*--root-owner-group/);
  assert.match(fixtures, /rpmbuild.*-bb/);
  assert.match(smoke, /dpkgPathWithoutMimeRefresh/);
  assert.match(smoke, /PATH=\$\{path\}.*\/usr\/bin\/dpkg.*--purge/);
  assert.match(smoke, /dpkg.*--configure.*shared-mime-info/);
  assert.doesNotMatch(fixtures, /update-mime-database.*dpkg-without-mime-refresh/);
});

test('package 검증은 path mode SHA ELF owner registration과 보존 불변식을 고정한다', () => {
  const sources = `${smoke}\n${contract}`;
  for (const marker of [
    helperPath,
    registrationPath,
    '0755',
    '0644',
    'archiveSha256',
    'elfArchitecture',
    'singleOwner',
    'mimeDefaultsPreserved',
    'thirdPartyThumbnailerPreserved',
    'cacheSentinelPreserved',
    'productFilesRemovedAfterUninstall',
  ]) assert.ok(verifier.includes(marker), `evidence marker가 필요합니다: ${marker}`);
  assert.match(contract, /\['query', 'default', mime\]/);
  assert.match(contract, /'rpm', '-qa', '--qf'/);
  assert.match(contract, /'rpm', '-ql', name/);
  assert.doesNotMatch(contract, /'rpm', '-qf'/);
  assert.match(smoke, /run\('sudo', \['rpm', '-q', 'alhangeul'\]/);
  assert.match(contract, /output.length, 1/);
  assert.doesNotMatch(sources, /\['default',/);
  assert.doesNotMatch(sources, /update-desktop-database|gio set/);
});

test('DEB와 RPM archive 경로 표기 차이를 절대 경로로 정규화한다', () => {
  assert.doesNotThrow(() => assertArchivePaths([
    '-rwxr-xr-x root/root 123 2026-08-30 00:00 ./usr/lib/alhangeul/alhangeul-thumbnailer',
    '-rw-r--r-- root/root 456 2026-08-30 00:00 ./usr/share/thumbnailers/alhangeul.thumbnailer',
    '-rw-r--r-- root/root 456 2026-08-30 00:00 ./usr/share/mime/packages/alhangeul-hwpx.xml',
  ].join('\n')));
  assert.doesNotThrow(() => assertArchivePaths([
    '/usr/lib/alhangeul/alhangeul-thumbnailer',
    '/usr/share/thumbnailers/alhangeul.thumbnailer',
    '/usr/share/mime/packages/alhangeul-hwpx.xml',
  ].join('\n')));
  assert.throws(
    () => assertArchivePaths('/usr/lib/alhangeul/alhangeul-thumbnailer'),
    /archive path \/usr\/share\/thumbnailers\/alhangeul\.thumbnailer mismatch/,
  );
  for (const generatedPath of [
    '/usr/share/mime/mime.cache',
    '/usr/share/mime/generic-icons',
    '/usr/share/mime/text/x-hwpx.xml',
  ]) {
    assert.throws(
      () => assertArchivePaths([
        helperPath,
        registrationPath,
        '/usr/share/mime/packages/alhangeul-hwpx.xml',
        generatedPath,
      ].join('\n')),
      /archive must not own generated MIME cache/,
    );
  }
});

function assertOrdered(source, markers) {
  let previous = -1;
  for (const marker of markers) {
    const index = source.indexOf(marker);
    assert.ok(index > previous, `순서가 올바르지 않습니다: ${marker}`);
    previous = index;
  }
}

test('RPM inventory는 전체 DB의 중복 owner와 누락을 숨기지 않는다', () => {
  const inventory = [{ name: 'alhangeul', paths: [helperPath, registrationPath] }];
  assert.deepEqual(ownersFromInventory(inventory, helperPath), ['alhangeul']);
  assert.deepEqual(ownersFromInventory(inventory, '/missing'), []);
  inventory.push({ name: 'other', paths: [helperPath] });
  assert.deepEqual(ownersFromInventory(inventory, helperPath), ['alhangeul', 'other']);
  assert.deepEqual(ownersFromInventory([{ name: 'alhangeul', paths: [helperPath, helperPath] }], helperPath), ['alhangeul', 'alhangeul']);
});
