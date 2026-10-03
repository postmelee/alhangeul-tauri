// 릴리즈 원문의 공통 필드 검사. 원격 상태나 파일의 서명 검증은 수행하지 않는다.
export const STABLE_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const SOURCE_SHA = /^[0-9a-f]{40}$/;
export const SHA256 = /^[0-9a-f]{64}$/;
const PLACEHOLDER = /\b(?:TODO|TBD|FIXME|placeholder|changeme)\b|\{\{|\}\}|\{(?:version|tag|issue|sha|path)\}|^(?:미정|확인 필요|작성 예정)$/i;

export function assertRecord(value, keys, field) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 object여야 합니다.`);
  }
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) {
    throw new Error(`${field}는 plain object여야 합니다.`);
  }
  const actual = Object.keys(value).sort();
  if (JSON.stringify(actual) !== JSON.stringify([...keys].sort())) {
    throw new Error(`${field} key가 계약과 다릅니다.`);
  }
}

export function assertEqual(value, expected, field) {
  if (value !== expected) throw new Error(`${field}가 기대값과 다릅니다.`);
}

export function assertOneOf(value, choices, field) {
  if (!choices.includes(value)) throw new Error(`${field} 값이 계약과 다릅니다.`);
}

export function assertPattern(value, pattern, field) {
  if (typeof value !== 'string' || pattern.exec(value)?.[0] !== value) {
    throw new Error(`${field} 형식이 올바르지 않습니다.`);
  }
}

export function assertPositiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${field}는 양의 안전한 정수여야 합니다.`);
  }
}

export function assertText(value, field, options = {}) {
  const limit = options.maxLength ?? 8000;
  if (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > limit) {
    throw new Error(`${field}는 비어 있지 않은 ${limit}자 이하 문구여야 합니다.`);
  }
  if (PLACEHOLDER.test(value)) throw new Error(`${field}에 placeholder를 허용하지 않습니다.`);
  if (/[\u0000-\u0009\u000b-\u001f\u007f]/u.test(value) || (!options.multiline && value.includes('\n'))) {
    throw new Error(`${field}에 허용되지 않은 제어문자나 줄바꿈이 있습니다.`);
  }
  if (/<\/?[a-z][^>]*>|^\s{0,3}#{1,6}\s|```|~~~/im.test(value)) {
    throw new Error(`${field}에 HTML·heading·code fence를 허용하지 않습니다.`);
  }
}

export function assertParagraphs(value, field) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    throw new Error(`${field}는 1~30개 문단 배열이어야 합니다.`);
  }
  for (const [index, text] of value.entries()) {
    assertText(text, `${field}[${index}]`, { maxLength: 2000 });
  }
}

export function assertTimestamp(value, field) {
  assertPattern(value, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/, field);
  const canonical = value.replace(/(?<!\.\d{3})Z$/, '.000Z');
  if (Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== canonical) {
    throw new Error(`${field}는 실제 UTC ISO 시각이어야 합니다.`);
  }
}

export function assertRepositoryUrl(value, repository, field) {
  if (typeof value !== 'string') throw new Error(`${field}는 HTTPS repository URL이어야 합니다.`);
  let url;
  try { url = new URL(value); } catch { throw new Error(`${field} URL 형식이 올바르지 않습니다.`); }
  if (
    url.origin !== 'https://github.com' || url.username || url.password || url.search || url.hash
    || url.href !== value || !url.pathname.startsWith(`/${repository}/`)
    || /%|\\|\/\//.test(url.pathname)
  ) {
    throw new Error(`${field}는 canonical HTTPS repository URL이어야 합니다.`);
  }
}

export function compareVersions(left, right) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] > b[index] ? 1 : -1;
  }
  return 0;
}
