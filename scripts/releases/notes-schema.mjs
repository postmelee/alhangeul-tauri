import { validateNotesMetadata, RELEASE_REPOSITORY } from './notes-metadata.mjs';
import {
  assertEqual, assertOneOf, assertParagraphs, assertPositiveInteger, assertRecord,
  assertRepositoryUrl, assertText, assertTimestamp,
} from './notes-fields.mjs';

export const NOTES_SCHEMA_VERSION = 1;
export const GITHUB_RELEASE_HEADINGS = Object.freeze([
  '## 이번 버전의 주요 변경 사항', '### 변경 요약', '### 포함된 rhwp 변화', '### 알한글 앱 변화',
  '## 다운로드 및 설치', '### 다운로드', '### 지원 환경', '### 설치 후 첫 실행', '### 업데이트 확인',
  '## 알려진 제한 사항', '## 이번 릴리즈 관련 PR과 Issue', '### 릴리즈 요약에 반영된 PR',
  '### 해결된 Issue', '### 참고/연관 Issue', '## 상세 기록', '### Release metadata',
]);
const CONTENT_KEYS = [
  'summary', 'rhwpChanges', 'appChanges', 'supportedEnvironments', 'installation',
  'updateInstructions', 'limitations', 'updaterSummary', 'references',
];
const PR_KEYS = ['number', 'title', 'url', 'category', 'summaryIncluded', 'evidence'];
const ISSUE_KEYS = ['number', 'title', 'url', 'state', 'resolution', 'evidence'];

// 읽기 전용 구조 검사이며 공개 승인·원격 bytes·Issue 해결의 증명이 아니다.
export function validateReleaseNotes(value) {
  assertRecord(value, ['schemaVersion', 'metadata', 'content'], 'release notes');
  assertEqual(value.schemaVersion, NOTES_SCHEMA_VERSION, 'schemaVersion');
  validateNotesMetadata(value.metadata);
  assertRecord(value.content, CONTENT_KEYS, 'content');
  for (const field of [
    'summary', 'appChanges', 'supportedEnvironments', 'installation', 'updateInstructions', 'limitations',
  ]) assertParagraphs(value.content[field], `content.${field}`);
  assertText(value.content.updaterSummary, 'content.updaterSummary', { maxLength: 4000, multiline: true });
  assertRhwpChanges(value.content.rhwpChanges, value.metadata);
  assertReferences(value.content.references, value.metadata.publishedAt);
  return value;
}

function assertRhwpChanges(value, metadata) {
  assertRecord(value, ['status', 'paragraphs'], 'content.rhwpChanges');
  assertParagraphs(value.paragraphs, 'content.rhwpChanges.paragraphs');
  const previous = metadata.previous?.rhwp;
  const unchanged = previous && previous.tag === metadata.rhwp.tag && previous.commit === metadata.rhwp.commit;
  const expected = !previous ? 'initial' : unchanged ? 'unchanged' : 'updated';
  assertEqual(value.status, expected, 'content.rhwpChanges.status');
}

function assertReferences(value, publishedAt) {
  assertRecord(value, ['checkedAt', 'pullRequests', 'resolvedIssues', 'relatedIssues'], 'content.references');
  assertTimestamp(value.checkedAt, 'content.references.checkedAt');
  if (publishedAt && Date.parse(value.checkedAt) < Date.parse(publishedAt)) {
    throw new Error('content.references.checkedAt이 공개 시각보다 이릅니다.');
  }
  assertReferenceList(value.pullRequests, 'pullRequests', assertPullRequest);
  assertReferenceList(value.resolvedIssues, 'resolvedIssues', (entry, field) => assertIssue(entry, field, true));
  assertReferenceList(value.relatedIssues, 'relatedIssues', (entry, field) => assertIssue(entry, field, false));
  const resolved = new Set(value.resolvedIssues.map((entry) => entry.number));
  if (value.relatedIssues.some((entry) => resolved.has(entry.number))) {
    throw new Error('동일 Issue를 해결·참고 목록에 중복할 수 없습니다.');
  }
}

function assertReferenceList(entries, field, validate) {
  if (!Array.isArray(entries) || entries.length > 100) {
    throw new Error(`content.references.${field}는 100개 이하 배열이어야 합니다.`);
  }
  const seen = new Set();
  for (const [index, entry] of entries.entries()) {
    const label = `content.references.${field}[${index}]`;
    validate(entry, label);
    if (seen.has(entry.number)) throw new Error(`${label} number가 중복되었습니다.`);
    seen.add(entry.number);
  }
}

function assertLinkIdentity(entry, route, field) {
  assertPositiveInteger(entry.number, `${field}.number`);
  assertText(entry.title, `${field}.title`, { maxLength: 300 });
  assertEqual(entry.url, `https://github.com/${RELEASE_REPOSITORY}/${route}/${entry.number}`, `${field}.url`);
  if (!Array.isArray(entry.evidence) || !entry.evidence.length || entry.evidence.length > 10) {
    throw new Error(`${field}.evidence는 1~10개 근거 URL 배열이어야 합니다.`);
  }
  for (const url of entry.evidence) assertRepositoryUrl(url, RELEASE_REPOSITORY, `${field}.evidence`);
}

function assertPullRequest(entry, field) {
  assertRecord(entry, PR_KEYS, field);
  assertLinkIdentity(entry, 'pull', field);
  assertOneOf(entry.category, ['app', 'upstream', 'operations', 'documentation'], `${field}.category`);
  assertOneOf(entry.summaryIncluded, [true, false], `${field}.summaryIncluded`);
  if (entry.summaryIncluded && ['operations', 'documentation'].includes(entry.category)) {
    throw new Error(`${field}: 운영·문서 PR을 주요 앱 변화로 표시할 수 없습니다.`);
  }
}

function assertIssue(entry, field, resolved) {
  assertRecord(entry, ISSUE_KEYS, field);
  assertLinkIdentity(entry, 'issues', field);
  assertOneOf(entry.state, ['OPEN', 'CLOSED'], `${field}.state`);
  if (entry.state === 'OPEN') assertEqual(entry.resolution, null, `${field}.resolution`);
  else assertOneOf(entry.resolution, ['completed', 'not-planned'], `${field}.resolution`);
  if (resolved && (entry.state !== 'CLOSED' || entry.resolution !== 'completed')) {
    throw new Error(`${field}: 해결 Issue는 CLOSED·completed 근거가 필요합니다.`);
  }
}
