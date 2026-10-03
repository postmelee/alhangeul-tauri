import { validateReleaseNotes } from './notes-schema.mjs';
import { INSTALLERS, RELEASE_REPOSITORY } from './notes-metadata.mjs';
import { recordUrl, renderTemplate } from './notes-render.mjs';

export const WEBSITE_TOKENS = Object.freeze([
  'pageTitle', 'description', 'canonicalUrl', 'version', 'publicationStatus', 'publicationDate',
  'heroSummary', 'releaseUrl', 'summaryParagraphs', 'rhwpParagraphs', 'appParagraphs',
  'limitationsList', 'supportedParagraphs', 'installationParagraphs', 'updateParagraphs',
  'downloadLinks', 'recordUrl',
]);

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
}

export function extractWebsiteTemplate(template) {
  const normalized = template.replaceAll('\r\n', '\n');
  const output = normalized.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
  if (!output.startsWith('<!doctype html>')) throw new Error('웹 template doctype이 필요합니다.');
  const headings = [...output.matchAll(/<h2\b[^>]*>(.*?)<\/h2>/g)].map((match) => match[1]);
  const expected = ['변경 요약', '포함된 rhwp 변화', '알한글 앱 변화', '알려진 한계', '설치와 업데이트'];
  if (JSON.stringify(headings) !== JSON.stringify(expected)) throw new Error('웹 필수 heading 순서가 다릅니다.');
  return output;
}

export function renderWebsiteNotes(notes, template) {
  validateReleaseNotes(notes);
  const { metadata: meta, content } = notes;
  const paragraphs = (values) => values.map((value) => `<p>${escapeHtml(value)}</p>`).join('\n                    ');
  const releaseUrl = `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${meta.tag}`;
  const values = {
    pageTitle: `알한글 ${meta.tag} 릴리즈 안내`, description: escapeHtml(content.summary.join(' ')),
    canonicalUrl: `https://postmelee.github.io/alhangeul-tauri/updates/${meta.tag}.html`,
    version: meta.version, publicationStatus: meta.status, publicationDate: publicationDate(meta),
    heroSummary: escapeHtml(content.summary[0]), releaseUrl,
    summaryParagraphs: paragraphs(content.summary), rhwpParagraphs: paragraphs(content.rhwpChanges.paragraphs),
    appParagraphs: paragraphs(content.appChanges),
    limitationsList: `<ul>${content.limitations.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`,
    supportedParagraphs: paragraphs(content.supportedEnvironments), installationParagraphs: paragraphs(content.installation),
    updateParagraphs: paragraphs(content.updateInstructions), downloadLinks: downloadLinks(meta), recordUrl: recordUrl(meta.version),
  };
  return renderTemplate(extractWebsiteTemplate(template), values);
}

function publicationDate(meta) {
  if (meta.status === 'draft') return '<p>공개 전 검토용 안내입니다.</p>';
  const date = new Date(Date.parse(meta.publishedAt) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `<p>공개일: <time datetime="${meta.publishedAt}">${date} KST</time></p>`;
}

function downloadLinks(meta) {
  const links = Object.entries(INSTALLERS).map(([target, contract]) =>
    `<li><a href="${meta.assets[target].url}">${contract.label}</a></li>`);
  return `<ul>${links.join('')}</ul>`;
}
