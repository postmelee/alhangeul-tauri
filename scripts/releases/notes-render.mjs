import { validateReleaseNotes, GITHUB_RELEASE_HEADINGS } from './notes-schema.mjs';
import { INSTALLERS, RELEASE_REPOSITORY } from './notes-metadata.mjs';

export const GITHUB_TOKENS = Object.freeze([
  'tag', 'summary', 'rhwpChanges', 'appChanges', 'downloadTable', 'supportedEnvironments',
  'installation', 'updateInstructions', 'limitations', 'pullRequests', 'resolvedIssues',
  'relatedIssues', 'detailLinks', 'releaseMetadata',
]);

export function extractGithubTemplate(template) {
  const start = '<!-- release-body-template:start -->';
  const end = '<!-- release-body-template:end -->';
  if (template.split(start).length !== 2 || template.split(end).length !== 2) {
    throw new Error('GitHub template marker는 각각 하나여야 합니다.');
  }
  const body = template.slice(template.indexOf(start) + start.length, template.indexOf(end)).trim();
  if (!body) throw new Error('GitHub template body가 비어 있습니다.');
  assertGithubHeadings(body);
  return body;
}

export function renderTemplate(template, values) {
  const normalized = template.replaceAll('\r\n', '\n');
  const tokens = [...normalized.matchAll(/\{\{([a-zA-Z]+)\}\}/g)].map((match) => match[1]);
  const malformed = normalized.replace(/\{\{[a-zA-Z]+\}\}/g, '');
  if (malformed.includes('{{') || malformed.includes('}}')) throw new Error('잘못된 template token입니다.');
  const unknown = tokens.filter((name) => !Object.hasOwn(values, name));
  const missing = Object.keys(values).filter((name) => !tokens.includes(name));
  if (unknown.length || missing.length) {
    throw new Error(`template token 불일치: unknown=${unknown.join(',')}, missing=${missing.join(',')}`);
  }
  return `${normalized.replace(/\{\{([a-zA-Z]+)\}\}/g, (_, name) => values[name]).trim()}\n`;
}

export function markdownText(value) {
  return String(value).replace(/[\\`*_{}\[\]()<>!|#]/g, '\\$&');
}

export function recordUrl(version) {
  return `https://github.com/${RELEASE_REPOSITORY}/blob/devel/docs/releases/v${version}.md`;
}

export function renderGithubNotes(notes, template) {
  validateReleaseNotes(notes);
  const { metadata: meta, content } = notes;
  const paragraphs = (values) => values.map(markdownText).join('\n\n');
  const references = content.references;
  const values = {
    tag: meta.tag, summary: paragraphs(content.summary), rhwpChanges: paragraphs(content.rhwpChanges.paragraphs),
    appChanges: paragraphs(content.appChanges), downloadTable: downloadTable(meta),
    supportedEnvironments: paragraphs(content.supportedEnvironments), installation: paragraphs(content.installation),
    updateInstructions: paragraphs(content.updateInstructions), limitations: bullets(content.limitations),
    pullRequests: links(references.pullRequests.filter((entry) => entry.summaryIncluded)),
    resolvedIssues: links(references.resolvedIssues), relatedIssues: links(references.relatedIssues),
    detailLinks: `- [검증 환경과 상세 기록](${recordUrl(meta.version)})\n- [소스 기록](https://github.com/${RELEASE_REPOSITORY}/commit/${meta.sourceSha})`,
    releaseMetadata: metadataTable(meta),
  };
  const body = renderTemplate(extractGithubTemplate(template), values);
  if (body.split('\n')[0] !== `# Alhangeul ${meta.tag}`) throw new Error('GitHub Release 제목이 다릅니다.');
  return body;
}

export function assertGithubHeadings(body) {
  const headings = body.replaceAll('\r\n', '\n').split('\n').filter((line) => /^#{2,3} /.test(line));
  if (JSON.stringify(headings) !== JSON.stringify(GITHUB_RELEASE_HEADINGS)) {
    throw new Error('GitHub Release 필수 heading 순서가 다릅니다.');
  }
}

function bullets(values) {
  return values.map((value) => `- ${markdownText(value)}`).join('\n');
}

function links(entries) {
  return entries.length ? entries.map((entry) => `- [#${entry.number} ${markdownText(entry.title)}](${entry.url})`).join('\n') : '- 없음';
}

function downloadTable(meta) {
  const header = '| 환경·형식 | 다운로드 | bytes | SHA-256 |\n|---|---|---:|---|';
  const rows = Object.entries(INSTALLERS).map(([target, contract]) => {
    const asset = meta.assets[target];
    return `| ${contract.label} | [${markdownText(asset.name)}](${asset.url}) | ${asset.size} | ${asset.sha256} |`;
  });
  return [header, ...rows].join('\n');
}

function metadataTable(meta) {
  const entries = [
    ['Version / tag', `${meta.version} / ${meta.tag}`], ['Source SHA', meta.sourceSha],
    ['직전 공개', meta.previous?.tag ?? '첫 공개'], ['상태', meta.status],
    ['공개 시각 (UTC)', meta.publishedAt ?? '미게시'], ['rhwp tag', meta.rhwp.tag],
    ['rhwp resolved commit', meta.rhwp.commit],
  ];
  return ['| 항목 | 값 |', '|---|---|', ...entries.map(([key, value]) => `| ${key} | ${value} |`)].join('\n');
}
