import { basename } from 'node:path';
import { browser, $, $$, expect } from '@wdio/globals';
import {
  fixtureById,
  resolveDocumentFixtures,
  type DocumentFixture,
  type DocumentFixtureId,
} from '../support/document-fixture.ts';
import { runScenarioWithEvidence } from '../support/scenario-runner.ts';
import {
  centeredDelta,
  GUI_SELECTORS,
  parsePageIndicator,
} from '../support/document-ux.ts';
import { dismissLocalFontPrompt, readDomText } from '../support/webdriver-dom.ts';
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
const FILE_INPUT_ACCEPT_TIMEOUT_MS = 5_000;
let fixtures: DocumentFixture[] = [];

describe('Alhangeul document UX', () => {
  before(async () => {
    fixtures = await resolveDocumentFixtures(inputs.fixtureRoot);
  });

  for (const id of ['biz-plan-hwp', 'form-hwpx'] as const) {
    it(`${id} 파일 선택 open과 초기 화면 계약`, async () => {
      const fixture = fixtureById(fixtures, id);
      await runWithEvidence(id, fixture, async () => {
        await openFixture(fixture);
        await assertKoreanDesktopUi();
        await assertInitialToolbarState();
        await assertPageCount(fixture);
        await assertInitialCentering();
      });
    });
  }
});

async function openFixture(fixture: DocumentFixture): Promise<void> {
  const startedAt = Date.now();
  let accepted = false;
  for (let attempt = 0; attempt < 2 && !accepted; attempt += 1) {
    await setHiddenFileInput(fixture.absolutePath);
    accepted = await waitForFileInputAcceptance(fixture);
  }
  if (!accepted) throw new Error(`${fixture.id} file input이 앱에 전달되지 않았습니다`);
  const remainingTimeout = Math.max(5_000, inputs.timeoutMs - (Date.now() - startedAt));
  await browser.waitUntil(async () => {
    if (await dismissLocalFontPrompt()) return false;
    const canvas = await $(GUI_SELECTORS.documentCanvas);
    const status = await readDomText(GUI_SELECTORS.statusMessage);
    return await canvas.isExisting() && status.includes(basename(fixture.absolutePath));
  }, {
    timeout: remainingTimeout,
    timeoutMsg: `${fixture.id} 문서 렌더가 완료되지 않았습니다`,
  });
}

async function waitForFileInputAcceptance(fixture: DocumentFixture): Promise<boolean> {
  try {
    await browser.waitUntil(async () => {
      const status = await readDomText(GUI_SELECTORS.statusMessage);
      return status.startsWith('파일 로딩') || status.includes(basename(fixture.absolutePath));
    }, {
      timeout: Math.min(FILE_INPUT_ACCEPT_TIMEOUT_MS, inputs.timeoutMs),
      timeoutMsg: `${fixture.id} file input 전달을 확인하지 못했습니다`,
    });
    return true;
  } catch {
    return false;
  }
}

async function setHiddenFileInput(path: string): Promise<void> {
  const originalStyle = await browser.execute((selector) => {
    const input = document.querySelector<HTMLElement>(selector);
    if (!input) throw new Error(`file input이 없습니다: ${selector}`);
    const style = input.getAttribute('style');
    input.style.setProperty('display', 'block', 'important');
    input.style.setProperty('position', 'fixed', 'important');
    input.style.setProperty('inset', '0 auto auto 0', 'important');
    input.style.setProperty('width', '1px', 'important');
    input.style.setProperty('height', '1px', 'important');
    input.style.setProperty('opacity', '1', 'important');
    return style;
  }, GUI_SELECTORS.fileInput);
  try {
    const input = await $(GUI_SELECTORS.fileInput);
    await input.waitForDisplayed({ timeout: inputs.timeoutMs });
    await input.setValue(path);
  } finally {
    await browser.execute((selector, style) => {
      const input = document.querySelector<HTMLElement>(selector);
      if (!input) return;
      for (const property of ['display', 'position', 'inset', 'width', 'height', 'opacity']) {
        input.style.removeProperty(property);
      }
      input.removeAttribute('style');
      if (style !== null) input.setAttribute('style', style);
    }, GUI_SELECTORS.fileInput, originalStyle);
  }
}

async function assertKoreanDesktopUi(): Promise<void> {
  await expect($(GUI_SELECTORS.root)).toExist();
  const menuTitles = await $$(GUI_SELECTORS.menuTitles).map((element) => element.getText());
  expect(menuTitles).toEqual(['파일', '편집', '보기', '입력', '서식', '쪽', '표', '도구']);
  expect(await browser.getTitle()).toContain('Alhangeul');
  expect(await $('#style-name').getAttribute('title')).toBe('스타일');
}

async function assertInitialToolbarState(): Promise<void> {
  for (const selector of [
    GUI_SELECTORS.toolbarRotate,
    GUI_SELECTORS.toolbarHeaderFooter,
    GUI_SELECTORS.toolbarNote,
    GUI_SELECTORS.fileInput,
  ]) {
    expect(await $(selector).isDisplayed()).toBe(false);
  }
  expect(await $('html').getAttribute('class')).toContain('alhangeul-toolbar-ready');
}

async function assertPageCount(fixture: DocumentFixture): Promise<void> {
  const page = parsePageIndicator(await readDomText(GUI_SELECTORS.pageIndicator));
  expect(page.current).toBe(1);
  expect(page.total).toBeGreaterThanOrEqual(1);
  if (fixture.expectedPageCount !== null) expect(page.total).toBe(fixture.expectedPageCount);
}

async function assertInitialCentering(): Promise<void> {
  const geometry = await browser.execute((containerSelector, documentSelector) => {
    const container = document.querySelector<HTMLElement>(containerSelector);
    const page = document.querySelector<HTMLElement>(documentSelector);
    if (!container || !page) return null;
    const containerBounds = container.getBoundingClientRect();
    const pageBounds = page.getBoundingClientRect();
    return {
      containerRect: {
        x: containerBounds.x + container.clientLeft,
        y: containerBounds.y + container.clientTop,
        width: container.clientWidth,
        height: container.clientHeight,
      },
      documentRect: {
        x: pageBounds.x,
        y: pageBounds.y,
        width: pageBounds.width,
        height: pageBounds.height,
      },
    };
  }, GUI_SELECTORS.scrollContainer, GUI_SELECTORS.documentCanvas);
  if (!geometry) throw new Error('문서 중앙 정렬 geometry를 읽을 수 없습니다');
  const { containerRect, documentRect } = geometry;
  expect(centeredDelta(containerRect, documentRect)).toBeLessThanOrEqual(3);
}

async function runWithEvidence(
  scenario: DocumentFixtureId,
  fixture: DocumentFixture,
  action: () => Promise<void>,
): Promise<void> {
  await runScenarioWithEvidence({
    inputs,
    scenario,
    fixtures: [fixture],
    screenshotName: 'initial.png',
    captureScreenshot: (path) => browser.saveScreenshot(path),
  }, action);
}
