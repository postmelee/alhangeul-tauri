import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../apps/studio-host/index.html', import.meta.url), 'utf8');
const hostStyles = readFileSync(new URL('../apps/studio-host/src/style.css', import.meta.url), 'utf8');

function styleBarMarkup() {
  const start = html.indexOf('<div id="style-bar">');
  const end = html.indexOf('<!-- 에디터 영역', start);
  assert.ok(start >= 0, 'missing #style-bar');
  assert.ok(end > start, 'missing editor boundary after #style-bar');
  return html.slice(start, end);
}

test('Alhangeul host uses the grouped ribbon structure expected by upstream styles', () => {
  const styleBar = styleBarMarkup();
  const fields = styleBar.indexOf('class="sb-field-grid"');
  const characters = styleBar.indexOf('class="sb-command-band sb-character-band"');
  const paragraphs = styleBar.indexOf('class="sb-command-band sb-paragraph-band"');

  assert.ok(fields >= 0);
  assert.ok(characters > fields);
  assert.ok(paragraphs > characters);
  for (const className of [
    'sb-ribbon-group sb-field-ribbon-group',
    'sb-ribbon-group sb-character-ribbon-group',
    'sb-ribbon-group sb-color-ribbon-group',
    'sb-ribbon-group sb-paragraph-ribbon-group',
  ]) {
    assert.match(styleBar, new RegExp(`class="${className}"`));
  }

  const fieldGrid = styleBar.slice(fields, characters);
  for (const id of ['style-name', 'font-lang', 'font-name', 'font-size', 'linespacing-select']) {
    assert.match(fieldGrid, new RegExp(`id="${id}"`));
  }
  assert.match(
    fieldGrid,
    /<select id="style-name"[^>]*>\s*<option value="0">바탕글<\/option>\s*<\/select>/,
  );

  for (const label of ['글꼴 및 간격', '글자 모양', '색', '문단']) {
    assert.match(styleBar, new RegExp(`<span class="sb-ribbon-label">${label}<\\/span>`));
  }
});

test('Alhangeul host form controls inherit the bundled UI font', () => {
  assert.match(
    hostStyles,
    /button,\s*input,\s*select,\s*textarea\s*\{[^}]*font-family:\s*inherit;/s,
  );
});
