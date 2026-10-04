import assert from 'node:assert/strict';
import test from 'node:test';
import { pairedUiData, runUi } from './fixtures/pages-ui-dom.mjs';

for (const active of [true, false]) {
  test(`공통 UI는 유효한 6종을 모두 활성화한다: manifest=${active}`, async () => {
    const { release, downloads } = pairedUiData();
    if (!active) release.updater = { ...release.updater, manifestPublished: false, inventory: null };
    const result = await runUi({ release, downloads });
    assert.deepEqual(result.calls, ['../release.json', '../downloads.json']);
    assert.equal(result.actions.length, 6);
    for (const action of result.actions) {
      const entry = downloads.packages.find(entry => entry.target === action.dataset.downloadTarget);
      assert.equal(action.href, entry.url);
      assert.equal(action.dataset.downloadReady, 'true');
      assert.equal(action.textContent, '다운로드');
      assert.match(action.attributes['aria-label'], /0\.2\.0 다운로드/);
    }
    const linux = result.lists[1].children;
    assert.equal(linux.length, 4);
    assert.equal(linux[0].children[0].children[2].textContent, '앱 내 업데이트 지원');
    assert.deepEqual(linux.slice(1).map(row => row.children[0].children[2].textContent), ['수동 업데이트', '수동 업데이트', '수동 업데이트']);
  });
}

for (const [name, mutate] of [
  ['다른 버전', d => { d.version = '0.3.0'; d.tag = 'v0.3.0'; }],
  ['다른 상태', d => { d.status = 'unreleased'; }],
  ['새 schema', d => { d.schemaVersion = 2; }],
  ['manual 누락', d => { d.packages.pop(); }],
  ['중복 target', d => { d.packages[5] = d.packages[4]; }],
  ['외부 URL', d => { d.packages[4].url = 'https://example.com/file.rpm'; }],
  ['redirect query', d => { d.packages[3].url += '?download=1'; }],
  ['잘못된 파일명', d => { d.packages[5].name = 'wrong.deb'; }],
  ['잘못된 architecture', d => { d.packages[5].architecture = 'x64'; }],
  ['잘못된 format', d => { d.packages[4].format = 'DEB'; }],
  ['수동 업데이트 오표기', d => { d.packages[3].updateMode = 'app'; }],
  ['잘못된 크기', d => { d.packages[4].size = -1; }],
  ['잘못된 hash', d => { d.packages[5].sha256 = 'bad'; }],
  ['잘못된 source', d => { d.sourceSha = 'c'.repeat(40); }],
  ['잘못된 app hash', d => { d.packages[0].sha256 = 'd'.repeat(64); }],
  ['null entry', d => { d.packages[4] = null; }],
]) {
  test(`${name} 한 항목이라도 있으면 전체 직접 다운로드를 활성화하지 않는다`, async () => {
    const { downloads } = pairedUiData(); mutate(downloads);
    const result = await runUi({ downloads });
    for (const action of result.actions) {
      assert.equal(action.dataset.downloadReady, undefined);
      assert.equal(action.href, 'https://github.com/postmelee/alhangeul-tauri/releases');
      assert.equal(action.textContent, '다운로드 안내');
    }
  });
}

for (const options of [{ offline: true }, { missing: true }, { release: { status: 'unreleased' } }]) {
  test(`목록 실패·미공개에서는 GitHub 안내 경로를 유지한다: ${JSON.stringify(options)}`, async () => {
    const result = await runUi(options);
    assert.ok(result.actions.every(action => !action.dataset.downloadReady && action.href.endsWith('/releases')));
  });
}

test('활성 updater의 URL·source·버전은 목록과 일치해야 한다', async () => {
  const result = await runUi();
  for (const field of ['sourceSha', 'version', 'tag']) {
    const release = structuredClone(result.release);
    release.updater.inventory[field] = 'other';
    assert.equal(result.compatible(result.downloads, release), false);
  }
  const release = structuredClone(result.release);
  release.downloads['windows-x86_64-nsis'] += '?redirect';
  assert.equal(result.compatible(result.downloads, release), false);
});

test('펼침·닫힘·hash 진입은 문서 패널 상태와 aria 관계를 유지한다', async () => {
  const result = await runUi();
  assert.equal(result.panel.hidden, true);
  result.button.handlers.click();
  assert.equal(result.panel.hidden, false);
  assert.equal(result.button.attributes['aria-expanded'], 'true');
  result.document.activeElement = result.actions[0];
  result.button.handlers.click();
  assert.equal(result.panel.hidden, true);
  assert.equal(result.document.activeElement, result.button);
  result.window.location.hash = '#latest-download'; result.window.handlers.hashchange();
  assert.equal(result.panel.hidden, false);
  const linked = await runUi({ hash: '#latest-download' });
  assert.equal(linked.panel.hidden, false);
});

test('Linux 기본 선택과 방향키 전환은 패널·초점을 함께 바꾼다', async () => {
  const result = await runUi({ userAgent: 'Linux x86_64' });
  assert.equal(result.radios[1].checked, true);
  assert.equal(result.panels[0].hidden, true);
  assert.equal(result.panels[1].hidden, false);
  let prevented = false;
  result.radios[1].handlers.keydown({ key: 'ArrowRight', preventDefault() { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(result.radios[0].checked, true);
  assert.equal(result.panels[1].hidden, true);
  assert.equal(result.document.activeElement, result.radios[0]);
  result.document.activeElement = result.actions[0];
  result.radios[1].checked = true; result.radios[1].handlers.change();
  assert.equal(result.document.activeElement, result.radios[1]);
});

test('판별 불가 OS에서도 Windows 기본 선택과 Linux 선택을 제공한다', async () => {
  const result = await runUi();
  assert.equal(result.radios[0].checked, true);
  assert.equal(result.radios.length, 2);
  assert.equal(result.panels[0].hidden, false);
});

test('모바일 UA의 Linux 문자열을 desktop Linux 기본 선택으로 간주하지 않는다', async () => {
  const result = await runUi({ userAgent: 'Linux; Android 15' });
  assert.equal(result.radios[0].checked, true);
  assert.equal(result.panels[0].hidden, false);
});
