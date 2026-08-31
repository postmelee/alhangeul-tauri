import { createHash } from 'node:crypto';

export const RHWP_SHA = '496333b27d21ddb9114ba9ae340bcb895870c9a7';
export const EDGES = Object.freeze([128, 256, 512, 1024]);
export const MODES = Object.freeze(['direct', 'preview']);
export const BUDGETS = Object.freeze({ wallMs: 1500, peakRssBytes: 268435456 });
export const VARIANT_SOURCE = '03-blank_hwpx.hwpx';
export const STALE_PREVIEW_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

// 기대값은 probe 관측 결과가 아니라 pinned saved/ 컨테이너 검사로 정한다.
// HWP 세 파일: /PrvImage에 PNG가 있다. HWPX 네 파일: 같은 68-byte PNG의
// IDAT CRC가 손상돼 있다. preview=false여도 정상 문서 direct는 반드시 true다.
const invalidPng = 'c1bf607dd7214cb64486934b72c335a64b31d7f5203c40afdea5a1b95c826cf8';
const originals = [
  ['03-blank_hwpx.hwpx', '725c6df06a3e98014ab546a6b1ef0201e18afdd1dd88de68b8a0037224b31184', 7026, false, invalidPng],
  ['111exam_social.hwp', 'cd3cba334b6e164e6030d48438133e72628a0df9498f750d657317dedd79b044', 426496, true, '5e7745bb38f3c1bb4c92c9a7aefa3c11aabe4579ff5bc25227b2b573b52c15a4'],
  ['blank2010.hwp', '43f472751fafefb8c66b0f831660ebed51e443a46bebe44c75bba918154ce4c9', 13824, true, '2103d51fb863769afce086d2aa45eda343808e1c478527a9d40b3dfbebe513c6'],
  ['blank_hwpx.hwpx', '42a10023dccae3041d8ca3b9ae13f38ee2dbc69097eecfa97380427584994c87', 6988, false, invalidPng],
  ['hwpx-01-saved.hwpx', '2d3bfa73ea759a1a9787aede7c76262623aef007acb7ab7cd41d0db4b4beda58', 11227, false, invalidPng],
  ['pr360-edward.hwp', 'ab59c95dde8cd42e490f7b9a3deb13a9142969706e784053237bf9dc625150e9', 304640, true, 'e07729c49f359d61998bbb24fc0901c5262065d3c37b587cf5e367cbb2984e9d'],
  ['s-hwpx-02.hwpx', '9e25f528bfb6a2801e50437360d7f9cf76f5ae0d69ff9ad1919985d107586a8b', 360564, false, invalidPng],
].map(([source, sha256, bytes, preview, previewSha256]) => ({
  source, sha256, bytes, format: source.split('.').at(-1),
  fixtureClass: `normal-${source.split('.').at(-1)}`,
  expected: { direct: true, preview }, previewSha256,
  previewState: preview ? 'png-present' : 'png-invalid-idat-crc',
}));

// 동일 source, 고정 PNG, UTC 1980-01-01 mtime, mode 0644, zip -X로 재현한다.
// truncated는 source 앞 128 bytes, oversize는 64 MiB + 1 zero bytes다.
const variants = [
  ['preview-absent', 'hwpx', '7227d6fae5dfaf11ccbfc7b2cc3fd2b319ae13fd0b951dbfe050e14bc11414a1', 6842, true, false],
  ['preview-stale', 'hwpx', '872db91e322b9592eed8712b62cecdb9eaa4e7e55354dd0d2eb75ea39e79d811', 7021, true, true],
  ['corrupt-truncated', 'hwpx', '5db1e500775531a9518dd6ff0029fdd841d9b72ba42bf054487045d0a634d3cb', 128, false, false],
  ['size-boundary-64mib-plus-one', 'hwp', '91990977345985aaf03af1358f4f989d7eaf985b58529efb72f613c588f6599a', 67108865, false, false],
].map(([fixtureClass, format, sha256, bytes, direct, preview]) => ({
  fixtureClass, format, sha256, bytes, expected: { direct, preview },
}));

export const FIXTURES = Object.freeze([...originals, ...variants].map((fixture) =>
  Object.freeze({ ...fixture, expected: Object.freeze(fixture.expected) })));
export const MANIFEST_ID = `sha256:${createHash('sha256')
  .update(JSON.stringify({ rhwpSha: RHWP_SHA, fixtures: FIXTURES, edges: EDGES, modes: MODES }))
  .digest('hex')}`;

export function expectedRecords() {
  return FIXTURES.flatMap((fixture) => EDGES.flatMap((edge) => MODES.map((mode) => ({
    fixture, edge, mode, expectedSuccess: fixture.expected[mode],
    key: `${fixture.sha256}:${mode}:${edge}`,
  }))));
}
