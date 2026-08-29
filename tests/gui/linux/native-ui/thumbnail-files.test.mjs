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

test('registration과 MIME cache는 disposable XDG에만 두고 두 manager를 실행한다', () => {
  for (const marker of [
    'mktemp -d "$runner_temp/alhangeul-thumbnail-manager.XXXXXX"',
    'XDG_DATA_HOME="$data_root" update-mime-database "$data_root/mime"',
    'cp "$registration_source" "$data_root/thumbnailers/alhangeul.thumbnailer"',
    'run_manager nautilus',
    'run_manager thunar',
    'source_hashes_before',
    'source_hashes_after',
    'unrelated.sentinel',
    'product-helper-no-bypass',
  ]) assert.ok(probe.includes(marker), `manager probe marker가 필요합니다: ${marker}`);
  assert.doesNotMatch(probe, /\/usr\/share\/thumbnailers|update-desktop-database|SNAP_NAME/);
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
    'run_phase "$manager" "$manager_root" "$data_root" first 20',
    'run_phase "$manager" "$manager_root" "$data_root" cached 8',
    'run_phase "$manager" "$manager_root" "$data_root" changed 20',
    '[[ "$cached_direct" -eq "$first_direct" && "$cached_preview" -eq "$first_preview" ]]',
    '[[ "$changed_direct" -gt "$cached_direct" && "$changed_preview" -gt "$cached_preview" ]]',
    'scrot "$screenshot"',
    "[[ \"$cache_pngs\" -ge 2 ]]",
    'execve(\\"$installed_helper\\"',
  ]) assert.ok(session.includes(marker), `manager session marker가 필요합니다: ${marker}`);
  assert.doesNotMatch(session, /SNAP_NAME|thumbnail-stub|pkill|killall|\.cache\/thumbnails/);
});

test('probe는 만든 /usr helper만 제거하고 기존 file-manager 자산을 건드리지 않는다', () => {
  assert.match(probe, /\[\[ ! -e "\$installed_helper" \]\]/);
  assert.match(probe, /sudo install -m 0755 "\$helper_source" "\$installed_helper"/);
  assert.match(probe, /sudo rm -f "\$installed_helper"/);
  assert.match(probe, /sudo rmdir "\$installed_dir" 2>\/dev\/null \|\| true/);
  assert.doesNotMatch(probe, /sudo rm -rf|\/usr\/share|mimeapps\.list/);
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
