import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const tauriRoot = join(repoRoot, 'apps', 'desktop', 'src-tauri');
const [cargoManifest, tauriConfigSource, wixTemplate, nsisHooks] =
  await Promise.all([
    readFile(join(tauriRoot, 'Cargo.toml'), 'utf8'),
    readFile(join(tauriRoot, 'tauri.conf.json'), 'utf8'),
    readFile(join(tauriRoot, 'windows', 'main.wxs'), 'utf8'),
    readFile(join(tauriRoot, 'windows', 'nsis-hooks.nsh'), 'utf8'),
  ]);
const tauriConfig = JSON.parse(tauriConfigSource);

test('desktop binary와 registry-keyed Windows shortcut은 Alhangeul.exe로 정렬한다', () => {
  const binarySection = cargoManifest.match(
    /\[\[bin\]\]\s+name = "([^"]+)"\s+path = "src\/main\.rs"/,
  );

  assert.equal(binarySection?.[1], 'Alhangeul');
  assert.match(
    wixTemplate,
    /<File Id="Path" Source="\{\{main_binary_path\}\}" KeyPath="yes" Checksum="yes"\/>/,
  );
  assert.match(
    wixTemplate,
    /<DirectoryRef Id="DesktopFolder">[\s\S]+<Shortcut[^>]+Name="\{\{product_name\}\}"/,
  );
  assert.match(
    wixTemplate,
    /<DirectoryRef Id="ApplicationProgramsFolder">[\s\S]+<Shortcut[^>]+Name="\{\{product_name\}\}"/,
  );
  assert.match(wixTemplate, /Component Id="ApplicationShortcutDesktop"[^>]+Win64="\$\(var\.Win64\)"/);
  assert.match(wixTemplate, /Component Id="ApplicationShortcut"[^>]+Win64="\$\(var\.Win64\)"/);

  for (const shortcutId of [
    'ApplicationDesktopShortcut',
    'ApplicationStartMenuShortcut',
  ]) {
    const shortcut = wixTemplate.match(
      new RegExp(`<Shortcut Id="${shortcutId}"[\\s\\S]+?</Shortcut>`),
    )?.[0];

    assert.ok(shortcut, `${shortcutId} 계약이 필요합니다.`);
    assert.match(shortcut, /\bAdvertise="no"/);
    assert.match(shortcut, /\bIcon="ProductIcon\.exe"/);
    assert.match(shortcut, /\bTarget="\[#Path\]"/);
  }
  assert.match(wixTemplate, /Name="Desktop Shortcut"[^>]+KeyPath="yes"/);
  assert.match(wixTemplate, /Name="Start Menu Shortcut"[^>]+KeyPath="yes"/);
  assert.doesNotMatch(wixTemplate, /\bAdvertise="yes"/);
  assert.match(
    wixTemplate,
    /<Icon Id="ProductIcon\.exe" SourceFile="\{\{icon_path\}\}"\/>/,
  );
  assert.match(
    wixTemplate,
    /<Property Id="ARPPRODUCTICON" Value="ProductIcon\.exe" \/>/,
  );
});

test('MSI는 canonical handler를 Open With에만 등록한다', () => {
  for (const contract of [
    'Key="Software\\Classes"',
    'Key="{{protocol}}"',
    'Key="{{../../product_name}}.{{ext}}"',
    'Key=".{{ext}}\\OpenWithProgids"',
    'Name="{{../../product_name}}.{{ext}}" Type="string" Value=""',
    'Value="&quot;[#Path]&quot; &quot;%1&quot;"',
  ]) {
    assert.ok(wixTemplate.includes(contract), `WiX 계약이 필요합니다: ${contract}`);
  }

  assert.doesNotMatch(wixTemplate, /<ProgId\b/);
  assert.doesNotMatch(wixTemplate, /<Extension\b/);
  assert.doesNotMatch(
    wixTemplate,
    /Key="Software\\Classes\\\\\.\{\{ext\}\}">\s*<RegistryValue[^>]+Name=""/,
  );
  assert.doesNotMatch(
    wixTemplate,
    /Key="Software\\Classes\\+\{\{/,
    'Handlebars expression 바로 앞에는 registry separator를 둘 수 없습니다.',
  );
});

test('NSIS는 canonical handler와 제품명 Start Menu 폴더를 사용한다', () => {
  assert.deepEqual(
    tauriConfig.bundle.fileAssociations.map(({ ext, name }) => ({ ext, name })),
    [
      { ext: ['hwp'], name: 'Alhangeul.hwp' },
      { ext: ['hwpx'], name: 'Alhangeul.hwpx' },
    ],
  );
  assert.deepEqual(tauriConfig.bundle.windows.nsis, {
    startMenuFolder: 'Alhangeul',
    installerHooks: 'windows/nsis-hooks.nsh',
  });
});

test('NSIS hook은 설치·제거 중 extension 기본값을 보존한다', () => {
  for (const macro of [
    'NSIS_HOOK_PREINSTALL',
    'NSIS_HOOK_POSTINSTALL',
    'NSIS_HOOK_PREUNINSTALL',
    'NSIS_HOOK_POSTUNINSTALL',
  ]) {
    assert.match(nsisHooks, new RegExp(`!macro ${macro}\\b`));
  }

  assert.ok(
    nsisHooks.includes(
      'ReadRegDWORD $R1 SHELL_CONTEXT "Software\\Classes\\.${EXT}" "${PROGID}_default_present"',
    ),
  );
  assert.ok(
    nsisHooks.includes(
      'WriteRegStr SHELL_CONTEXT "Software\\Classes\\.${EXT}" "" "$R0"',
    ),
  );
  assert.ok(
    nsisHooks.includes(
      'WriteRegStr SHELL_CONTEXT "Software\\Classes\\.${EXT}\\OpenWithProgids" "${PROGID}" ""',
    ),
  );
  assert.ok(
    nsisHooks.includes(
      'ReadRegStr $R0 SHELL_CONTEXT "Software\\Classes\\.${EXT}" ""',
    ),
  );
  assert.ok(
    nsisHooks.includes(
      'WriteRegStr SHELL_CONTEXT "Software\\Classes\\.${EXT}" "${PROGID}_backup" "$R0"',
    ),
  );
  assert.ok(
    nsisHooks.includes(
      'DeleteRegValue SHELL_CONTEXT "Software\\Classes\\.${EXT}" ""',
    ),
    '원래 기본값이 없으면 빈 기본값을 남기지 않아야 합니다.',
  );
  assert.match(
    nsisHooks,
    /!macro NSIS_HOOK_PREINSTALL[\s\S]+ALHANGEUL_SNAPSHOT_EXTENSION_DEFAULT "hwp"/,
  );
  assert.match(
    nsisHooks,
    /!macro NSIS_HOOK_POSTUNINSTALL[\s\S]+ALHANGEUL_RESTORE_EXTENSION_DEFAULT "hwp"/,
  );
  assert.doesNotMatch(
    nsisHooks,
    /DeleteRegKey SHELL_CONTEXT "Software\\Classes\\\.\$\{EXT\}"/,
  );
});
