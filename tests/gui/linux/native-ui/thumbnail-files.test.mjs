import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const probe = await readFile(new URL('../../../../scripts/linux-thumbnail-manager-probe.sh', import.meta.url), 'utf8');
const session = await readFile(new URL('../../../../scripts/linux-thumbnail-manager-session.sh', import.meta.url), 'utf8');

test('제품 helper는 direct와 preview를 다섯 edge에서 RGBA PNG로 검증한다', () => {
  assert.match(probe, /for edge in 128 256 512 1024 333/);
  assert.match(probe, /for kind in direct preview/);
  assert.match(probe, /max\(width, height\) == int\(sys\.argv\[2\]\)/);
  assert.match(probe, /data\[24\] == 8 and data\[25\] == 6/);
  assert.match(probe, /Preview\/PrvImage\.png/);
  const encodedBlock = probe.match(/png = base64\.b64decode\(([\s\S]*?)\n\)/)?.[1] ?? '';
  const encoded = [...encodedBlock.matchAll(/"([A-Za-z0-9+/=]+)"/g)]
    .map((match) => match[1]).join('');
  assertPngCrc(Buffer.from(encoded, 'base64'));
});

test('공개 실사용 HWP HWPX는 고정 hash와 512px PNG evidence를 사용한다', () => {
  for (const marker of [
    'third_party/rhwp/samples/[2027] 온새미로 1 본교재.hwp',
    'third_party/rhwp/samples/hwpx/form-002.hwpx',
    'e8592e74c9a8425c4ee2c5824d012ebe45e9f6dd36880b784ba594b4fd0a31ce',
    '5ab8f7c368e02538f75f1cd2bd82bbd8de2f925a54ba7b38ec9395b2cdb804d4',
    'real-onsaemiro-512.png',
    'real-form-002-512.png',
    'validate_real_fixtures "$source_root" "$evidence_root/edge-matrix"',
  ]) assert.ok(probe.includes(marker), `실사용 fixture marker가 필요합니다: ${marker}`);
});

test('package-installed system MIME만 사용해 두 manager를 실행한다', () => {
  for (const marker of [
    'mktemp -d "$runner_temp/alhangeul-thumbnail-manager.XXXXXX"',
    'readonly installed_registration=/usr/share/thumbnailers/alhangeul.thumbnailer',
    'readonly installed_mime_xml=/usr/share/mime/packages/alhangeul-hwpx.xml',
    'cmp "$registration_source" "$installed_registration"',
    'cmp "$mime_source" "$installed_mime_xml"',
    'record_private_mime_state "$data_root" before',
    'record_private_mime_state "$data_root" after',
    '[[ "$hwpx_type" == application/x-hwpx && "$real_hwpx_type" == application/x-hwpx ]]',
    'printf \'systemMimeRoot /usr/share/mime\\n\'',
    'run_manager nautilus',
    'run_manager thunar',
    'source_hashes_before',
    'source_hashes_after',
    'unrelated.sentinel',
    'product-helper-no-bypass',
  ]) assert.ok(probe.includes(marker), `manager probe marker가 필요합니다: ${marker}`);
  assert.doesNotMatch(probe, /update-(?:desktop|mime)-database|SNAP_NAME/);
  assert.doesNotMatch(probe, /alhangeul-probe\.xml|application\/vnd\.hancom\.hwpx/);
  assert.doesNotMatch(probe, /install -d[^\n]*\$data_root\/mime/);
  assert.doesNotMatch(probe, /cp "\$(?:registration|mime)_source"|sudo install/);
  assert.doesNotMatch(probe, /rm -rf "\$HOME|rm -rf ~\//);
});

test('실제 제품 경로의 execve와 visible screenshot으로 cache lifecycle을 판정한다', () => {
  for (const marker of [
    'strace -ff -qq -s 4096 -e trace=execve',
    'timeout --signal=TERM --kill-after=5s "${phase_timeout}s"',
    'phase_timeout=$((wait_seconds + 10))',
    '[[ "$trace_status" -eq 0 || "$trace_status" -eq 124 || "$trace_status" -eq 137 ]]',
    '[[ -s "$manager_root/$phase.png" ]]',
    'traceStatus=%s timeoutSeconds=%s',
    'window_manager_pid=',
    'run_phase "$manager" "$manager_root" "$data_root" first 20',
    'run_phase "$manager" "$manager_root" "$data_root" cached 8',
    'run_phase "$manager" "$manager_root" "$data_root" changed 20',
    '[[ "$cached_direct" -eq "$first_direct" && "$cached_preview" -eq "$first_preview" ]]',
    '[[ "$first_real_hwp" -ge 1 && "$first_real_hwpx" -ge 1 ]]',
    '[[ "$cached_real_hwp" -eq "$first_real_hwp" && "$cached_real_hwpx" -eq "$first_real_hwpx" ]]',
    '[[ "$changed_direct" -gt "$cached_direct" && "$changed_preview" -gt "$cached_preview" ]]',
    '[[ "$changed_real_hwp" -gt "$cached_real_hwp" && "$changed_real_hwpx" -gt "$cached_real_hwpx" ]]',
    '[[ "$failure_success_pngs" -eq 0 ]]',
    '"fail" not in path.relative_to(root).parts',
    '$manager-cache-metadata.txt',
    "grep -F 'real-onsaemiro.hwp'",
    "grep -F 'real-form-002.hwpx'",
    'scrot "$screenshot"',
    "[[ \"$cache_pngs\" -ge 4 ]]",
    'execve(\\"$installed_helper\\"',
  ]) assert.ok(session.includes(marker), `manager session marker가 필요합니다: ${marker}`);
  assert.match(
    session,
    /copy_evidence "\$manager" "\$manager_root" "\$evidence_root"\n  assert_lifecycle/,
    '실패 evidence는 lifecycle assertion 전에 보존해야 합니다',
  );
  assert.match(session, /> "\$manager_root\/invocations\.txt" \|\| true/);
  assert.doesNotMatch(session, /SNAP_NAME|thumbnail-stub|pkill|killall|\.cache\/thumbnails/);
  assert.doesNotMatch(session, /local window_manager_pid/);
});

test('probe는 package 소유 /usr 파일을 검증만 하고 설치하거나 제거하지 않는다', () => {
  assert.match(probe, /\[\[ -f "\$installed_helper" && -x "\$installed_helper" \]\]/);
  assert.match(probe, /\[\[ -f "\$installed_registration" && -f "\$installed_mime_xml" \]\]/);
  assert.match(probe, /sha256sum "\$helper_source"/);
  assert.doesNotMatch(probe, /sudo |rm -f "\$installed|rmdir "\$installed|mimeapps\.list/);
});

test('역할별 script와 함수가 저장소 크기 상한을 지킨다', () => {
  for (const [name, source] of [['probe', probe], ['session', session]]) {
    assert.ok(source.split(/\r?\n/).length <= 300, `${name} script가 300줄을 넘습니다`);
    for (const block of shellFunctions(source)) {
      assert.ok(block.lines <= 50, `${name} ${block.name} 함수가 ${block.lines}줄입니다`);
    }
  }
});

function shellFunctions(source) {
  const lines = source.split(/\r?\n/);
  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([a-z_]+)\(\) \{$/);
    if (!match) continue;
    let end = index + 1;
    while (end < lines.length && lines[end] !== '}') end += 1;
    blocks.push({ name: match[1], lines: end - index + 1 });
  }
  return blocks;
}

function assertPngCrc(png) {
  assert.deepEqual(png.subarray(0, 8), Buffer.from('89504e470d0a1a0a', 'hex'));
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const payload = png.subarray(offset + 4, offset + 8 + length);
    assert.equal(crc32(payload), png.readUInt32BE(offset + 8 + length));
    offset += 12 + length;
  }
  assert.equal(offset, png.length);
}

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
  }
  return (value ^ 0xffffffff) >>> 0;
}
