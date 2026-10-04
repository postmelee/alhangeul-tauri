import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { buildPackageDownloads } from '../../scripts/pages/package-downloads.mjs';
import { publishedManifestFixture } from './pages-release-fixtures.mjs';
import { releaseNotesFixture } from './release-note-fixtures.mjs';

const source = `${await readFile(new URL('../../site/package-downloads.js', import.meta.url), 'utf8')}\n${await readFile(new URL('../../site/script.js', import.meta.url), 'utf8')}`;

export function pairedUiData() {
  const release = publishedManifestFixture();
  const notes = releaseNotesFixture(release);
  notes.content.updaterSummary = release.notes;
  return { release, downloads: buildPackageDownloads(release, notes) };
}

function matches(element, selector) {
  if (selector.startsWith('.')) return element.className.split(' ').includes(selector.slice(1));
  return false;
}

export function uiElement(tagName = 'DIV') {
  return {
    tagName, className: '', dataset: {}, children: [], handlers: {}, attributes: {}, hidden: false,
    append(...children) { for (const child of children) { child.parent = this; this.children.push(child); } },
    querySelector(selector) {
      for (const child of this.children) {
        if (matches(child, selector)) return child;
        const nested = child.querySelector(selector);
        if (nested) return nested;
      }
      return null;
    },
    contains(element) { return element === this || this.children.some(child => child.contains(element)); },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.handlers[name] = handler; },
    dispatchEvent(event) { this.handlers[event.type]?.(event); },
    replaceWith(replacement) { this.replacement = replacement; },
    remove() { this.removed = true; },
  };
}

export async function runUi(options = {}) {
  const data = pairedUiData();
  const lists = ['windows', 'linux'].map(platform => {
    const list = uiElement(); list.dataset.packagePlatform = platform; return list;
  });
  const panels = lists.map(list => {
    const panel = uiElement(); panel.dataset.downloadPlatformPanel = list.dataset.packagePlatform;
    panel.append(list); return panel;
  });
  const button = uiElement('BUTTON');
  const panel = uiElement('SECTION'); panel.hidden = true; panel.append(...panels);
  const message = uiElement();
  const placeholder = uiElement();
  const radios = ['windows', 'linux'].map(value => {
    const radio = uiElement('INPUT'); radio.value = value;
    let checked = value === 'windows';
    Object.defineProperty(radio, 'checked', { get: () => checked, set(value) {
      checked = value;
      if (value) for (const other of radios) if (other !== radio) other.checked = false;
    } });
    return radio;
  });
  const document = createUiDocument({ lists, panels, button, panel, message, placeholder, radios });
  const calls = [];
  const window = { location: { hash: options.hash ?? '' }, handlers: {}, setTimeout,
    addEventListener(name, handler) { this.handlers[name] = handler; } };
  const context = { document, window, Event, navigator: { userAgent: options.userAgent ?? '' }, fetch: async url => {
    calls.push(url);
    const downloads = url.endsWith('downloads.json');
    if (downloads && options.offline) throw new Error('offline');
    return { ok: !(downloads && options.missing), json: async () => downloads
      ? (options.downloads ?? data.downloads) : (options.release ?? data.release) };
  } };
  runInNewContext(source, context);
  await new Promise(resolve => setImmediate(resolve));
  return { ...data, lists, panels, button, panel, radios, window, document, calls, placeholder, message,
    actions: document.querySelectorAll('[data-download-target]'),
    compatible: (downloads, release) => {
      context.testDownloads = downloads; context.testRelease = release;
      return runInNewContext('packageDownloads.isCompatible(testDownloads, testRelease)', context);
    } };
}

function createUiDocument(state) {
  const { lists, panels, button, panel, message, placeholder, radios } = state;
  const document = {
    body: { dataset: { siteRoot: '../' } }, activeElement: null,
    createElement: tag => uiElement(tag.toUpperCase()),
    querySelector(selector) {
      if (selector === '[data-download-toggle]') return button;
      if (selector === '#download-panel') return panel;
      if (selector === '#download-platform-linux') return radios[1];
      if (selector === '[data-package-platform]') return lists[0];
      if (selector === '[data-release-note]') return placeholder;
      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-package-platform]') return lists;
      if (selector === '[data-download-platform-panel]') return panels;
      if (selector === 'input[name="download-platform"]') return radios;
      if (selector === '[data-release-message]') return [message];
      if (selector === '[data-download-target]') return lists.flatMap(list => list.children.map(row => row.children[1]));
      return [];
    },
  };
  for (const node of [button, ...radios]) node.focus = () => { document.activeElement = node; };
  return document;
}
