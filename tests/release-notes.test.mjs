import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { GITHUB_RELEASE_HEADINGS, validateReleaseNotes } from '../scripts/releases/notes-schema.mjs';
import { releaseNotesFixture, issueFixture, pullRequestFixture } from './fixtures/release-note-fixtures.mjs';

test('정상 원문은 현재 source version과 독립적으로 읽기 전용 검사를 통과한다', () => {
  const value = releaseNotesFixture();
  const before = JSON.stringify(value);
  freezeDeep(value);
  assert.equal(validateReleaseNotes(value), value);
  assert.equal(JSON.stringify(value), before);
});

test('초안은 공개 시각을 null로 유지하고 첫 공개에는 이전 버전이 없다', () => {
  const value = releaseNotesFixture();
  value.metadata.status = 'draft';
  value.metadata.publishedAt = null;
  value.metadata.previous = null;
  value.content.rhwpChanges.status = 'initial';
  assert.equal(validateReleaseNotes(value), value);
});

test('실제 pin이 달라지면 updated 분류를 요구한다', () => {
  const value = releaseNotesFixture();
  value.metadata.rhwp = { tag: 'v0.8.7', commit: 'c'.repeat(40) };
  assert.throws(() => validateReleaseNotes(value), /rhwpChanges.status/);
  value.content.rhwpChanges.status = 'updated';
  assert.equal(validateReleaseNotes(value), value);
});

test('해결된 Issue는 CLOSED completed, 해결이 아닌 종료는 참고로 구분한다', () => {
  const value = releaseNotesFixture();
  value.content.references.resolvedIssues = [issueFixture(9, { state: 'CLOSED', resolution: 'completed' })];
  value.content.references.relatedIssues = [issueFixture(7, { state: 'CLOSED', resolution: 'not-planned' })];
  value.content.references.pullRequests.push(pullRequestFixture({
    number: 10, url: 'https://github.com/postmelee/alhangeul-tauri/pull/10',
    category: 'operations', summaryIncluded: false,
  }));
  assert.equal(validateReleaseNotes(value), value);
});

test('참조 항목이 없는 버전은 빈 배열을 명시할 수 있다', () => {
  const value = releaseNotesFixture();
  for (const key of ['pullRequests', 'resolvedIssues', 'relatedIssues']) value.content.references[key] = [];
  value.content.limitations = ['없음'];
  assert.equal(validateReleaseNotes(value), value);
});

for (const [name, mutate, error] of [
  ['지원하지 않는 schema', (v) => { v.schemaVersion = 2; }, /schemaVersion/],
  ['top-level 미지의 key', (v) => { v.extra = true; }, /release notes key/],
  ['필수 content 누락', (v) => { delete v.content.installation; }, /content key/],
  ['필수 metadata 누락', (v) => { delete v.metadata.sourceSha; }, /metadata key/],
  ['잘못된 저장소', (v) => { v.metadata.repository = 'other/repo'; }, /repository/],
  ['prerelease version', (v) => { v.metadata.version = '0.2.0-beta.1'; }, /version/],
  ['앞자리 0 version', (v) => { v.metadata.version = '00.2.0'; }, /version/],
  ['version-tag 불일치', (v) => { v.metadata.tag = 'v0.1.0'; }, /metadata.tag/],
  ['source SHA 축약', (v) => { v.metadata.sourceSha = 'a'.repeat(8); }, /sourceSha/],
  ['source SHA 끝 줄바꿈', (v) => { v.metadata.sourceSha += '\n'; }, /sourceSha/],
  ['알 수 없는 공개 상태', (v) => { v.metadata.status = 'latest'; }, /metadata.status/],
  ['공개일 없음', (v) => { v.metadata.publishedAt = null; }, /publishedAt/],
  ['불가능한 공개일', (v) => { v.metadata.publishedAt = '2026-02-30T00:00:00Z'; }, /publishedAt/],
  ['UTC 외 공개 시각', (v) => { v.metadata.publishedAt = '2026-08-27T09:00:00+09:00'; }, /publishedAt/],
  ['초안의 가짜 공개일', (v) => { v.metadata.status = 'draft'; }, /draft metadata.publishedAt/],
  ['upstream branch pin', (v) => { v.metadata.rhwp.tag = 'main'; }, /rhwp.tag/],
  ['upstream commit 축약', (v) => { v.metadata.rhwp.commit = 'f1f9'; }, /rhwp.commit/],
  ['upstream tag 끝 줄바꿈', (v) => { v.metadata.rhwp.tag += '\n'; }, /rhwp.tag/],
  ['같은 이전 버전', (v) => { v.metadata.previous.version = '0.2.0'; v.metadata.previous.tag = 'v0.2.0'; }, /previous.version/],
  ['숫자 비교상 높은 이전 버전', (v) => { v.metadata.previous.version = '0.10.0'; v.metadata.previous.tag = 'v0.10.0'; }, /previous.version/],
  ['변경 없는 rhwp의 새 기능 표시', (v) => { v.content.rhwpChanges.status = 'updated'; }, /rhwpChanges.status/],
  ['최초 pin의 unchanged 표시', (v) => { v.metadata.previous = null; }, /rhwpChanges.status/],
  ['설치 형식 누락', (v) => { delete v.metadata.assets['linux-aarch64-deb']; }, /metadata.assets key/],
  ['임의 설치 형식 추가', (v) => { v.metadata.assets.mac = {}; }, /metadata.assets key/],
  ['동일 파일을 다른 target에 중복', (v) => { v.metadata.assets['windows-x86_64-msi'] = v.metadata.assets['windows-x86_64-nsis']; }, /msi.name/],
  ['arm64/x64 혼동', (v) => { v.metadata.assets['linux-aarch64-deb'].name = 'Alhangeul_0.2.0_amd64.deb'; }, /aarch64-deb.name/],
  ['0 byte 설치 파일', (v) => { v.metadata.assets['linux-x86_64-deb'].size = 0; }, /deb.size/],
  ['잘못된 SHA-256', (v) => { v.metadata.assets['linux-x86_64-rpm'].sha256 = 'bad'; }, /rpm.sha256/],
  ['SHA-256 끝 줄바꿈', (v) => { v.metadata.assets['linux-x86_64-rpm'].sha256 += '\n'; }, /rpm.sha256/],
  ['공개키 fingerprint 끝 줄바꿈', (v) => { v.metadata.updaterInventory.keyFingerprint += '\n'; }, /key fingerprint/],
  ['updater source 불일치', (v) => { v.metadata.updaterInventory.sourceSha = 'b'.repeat(40); }, /updaterInventory.sourceSha/],
  ['updater hash와 공개 asset 불일치', (v) => { v.metadata.assets['windows-x86_64-nsis'].sha256 = 'd'.repeat(64); }, /targets.windows-x86_64-nsis.sha256/],
  ['updater 크기 불일치', (v) => { v.metadata.assets['linux-x86_64-appimage'].size += 1; }, /targets.linux-x86_64-appimage.size/],
  ['updater target 누락', (v) => { delete v.metadata.updaterInventory.targets['windows-x86_64-msi']; }, /inventory targets/],
  ['서명 인코딩 오류', (v) => { v.metadata.updaterInventory.targets['windows-x86_64-msi'].signature = 'bad'; }, /signature|base64|서명/],
  ['비밀 field 추가', (v) => { v.metadata.privateKey = 'do-not-store'; }, /metadata key/],
  ['빈 요약', (v) => { v.content.summary = []; }, /content.summary/],
  ['sparse 문단', (v) => { v.content.summary = Array(1); }, /content.summary/],
  ['문구 앞뒤 공백', (v) => { v.content.summary[0] = ' 요약 '; }, /content.summary/],
  ['문단 줄바꿈', (v) => { v.content.summary[0] = '첫 문단\n둘째 문단'; }, /줄바꿈/],
  ['미정 문구', (v) => { v.content.summary[0] = '미정'; }, /placeholder/],
  ['TODO 문구', (v) => { v.content.summary[0] = 'TODO 다음 내용을 작성'; }, /placeholder/],
  ['template token', (v) => { v.content.updaterSummary = '버전 {{version}} 개선'; }, /placeholder/],
  ['heading 주입', (v) => { v.content.summary[0] = '## 다운로드 및 설치'; }, /heading/],
  ['HTML 주입', (v) => { v.content.summary[0] = '<script>alert(1)</script>'; }, /HTML/],
  ['code fence 주입', (v) => { v.content.summary[0] = '```'; }, /code fence/],
  ['문구 제어문자', (v) => { v.content.summary[0] = '설명\u0000끝'; }, /제어문자/],
  ['updater 요약 4000자 초과', (v) => { v.content.updaterSummary = '가'.repeat(4001); }, /4000자/],
  ['참조 확인 시각 누락', (v) => { v.content.references.checkedAt = null; }, /checkedAt/],
  ['공개 이전 참조 조회', (v) => { v.content.references.checkedAt = '2026-08-26T00:00:00Z'; }, /checkedAt/],
  ['sparse PR 목록', (v) => { v.content.references.pullRequests = Array(1); }, /pullRequests/],
  ['실제 제목 없음', (v) => { v.content.references.pullRequests[0].title = ''; }, /title/],
  ['PR 링크가 Issue인 오류', (v) => { v.content.references.pullRequests[0].url = 'https://github.com/postmelee/alhangeul-tauri/issues/8'; }, /url/],
  ['PR 중복', (v) => { v.content.references.pullRequests.push(v.content.references.pullRequests[0]); }, /number가 중복/],
  ['운영 PR을 주요 앱 변화로 표시', (v) => { v.content.references.pullRequests[0].category = 'operations'; }, /운영·문서/],
  ['문서 PR을 주요 앱 변화로 표시', (v) => { v.content.references.pullRequests[0].category = 'documentation'; }, /운영·문서/],
  ['의미 없는 PR 분류', (v) => { v.content.references.pullRequests[0].category = 'other'; }, /category/],
  ['불명확한 포함 flag', (v) => { v.content.references.pullRequests[0].summaryIncluded = 'true'; }, /summaryIncluded/],
  ['OPEN Issue를 해결로 표시', (v) => { v.content.references.resolvedIssues = [issueFixture(9)]; }, /해결 Issue/],
  ['not-planned 종료를 해결로 표시', (v) => { v.content.references.resolvedIssues = [issueFixture(9, { state: 'CLOSED', resolution: 'not-planned' })]; }, /해결 Issue/],
  ['OPEN인데 completed snapshot', (v) => { v.content.references.relatedIssues[0].resolution = 'completed'; }, /resolution/],
  ['근거 없는 종료 snapshot', (v) => { v.content.references.relatedIssues[0].state = 'CLOSED'; }, /resolution/],
  ['해결·참고 Issue 중복', (v) => {
    const issue = issueFixture(9, { state: 'CLOSED', resolution: 'completed' });
    v.content.references.resolvedIssues = [issue]; v.content.references.relatedIssues = [issue];
  }, /해결·참고/],
  ['참고 Issue 중복', (v) => { v.content.references.relatedIssues.push(issueFixture()); }, /number가 중복/],
  ['근거 링크 없음', (v) => { v.content.references.pullRequests[0].evidence = []; }, /evidence/],
  ['sparse 근거 배열', (v) => { v.content.references.pullRequests[0].evidence = Array(1); }, /evidence/],
  ['다른 저장소 근거', (v) => { v.content.references.pullRequests[0].evidence = ['https://github.com/other/repo/pull/8']; }, /canonical HTTPS/],
  ['근거 URL credential', (v) => { v.content.references.pullRequests[0].evidence = ['https://user@github.com/postmelee/alhangeul-tauri/pull/8']; }, /canonical HTTPS/],
]) {
  test(`${name}를 거부한다`, () => {
    const value = releaseNotesFixture();
    mutate(value);
    assert.throws(() => validateReleaseNotes(value), error);
  });
}

for (const suffix of ['?download=1', '#asset', '/extra', '%2fother']) {
  test(`다운로드 URL의 추가 경로/인자 ${suffix}를 거부한다`, () => {
    const value = releaseNotesFixture();
    value.metadata.assets['linux-x86_64-deb'].url += suffix;
    assert.throws(() => validateReleaseNotes(value), /deb.url/);
  });
}

test('updater 요약의 정확한 4000자 경계를 허용한다', () => {
  const value = releaseNotesFixture();
  value.content.updaterSummary = '가'.repeat(4000);
  assert.equal(validateReleaseNotes(value), value);
});

test('GitHub 템플릿은 주요 변경을 먼저 두고 필수 heading 순서를 유지한다', async () => {
  const source = await readFile(new URL('../mydocs/_templates/release_notes.md', import.meta.url), 'utf8');
  const body = source.split('<!-- release-body-template:start -->')[1].split('<!-- release-body-template:end -->')[0];
  const headings = body.split('\n').filter((line) => /^#{2,3} /.test(line));
  assert.deepEqual(headings, GITHUB_RELEASE_HEADINGS);
  assert.ok(source.startsWith('# 릴리즈 본문 작성 템플릿'));
});

test('웹 템플릿은 공통 원문의 짧은 안내와 버전 고정 다운로드를 구분한다', async () => {
  const source = await readFile(new URL('../mydocs/_templates/website_release_note.html', import.meta.url), 'utf8');
  const headings = [...source.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((match) => match[1]);
  assert.deepEqual(headings, ['변경 요약', '포함된 rhwp 변화', '알한글 앱 변화', '알려진 한계', '설치와 업데이트']);
  assert.match(source, /href="\{\{releaseUrl\}\}">이 버전 다운로드/);
  assert.match(source, /href="\.\/#latest-download">최신 버전 다운로드/);
  assert.doesNotMatch(source, /\.dmg|Sparkle|appcast|Homebrew/);
});

function freezeDeep(value) {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') freezeDeep(child);
  }
  return Object.freeze(value);
}
