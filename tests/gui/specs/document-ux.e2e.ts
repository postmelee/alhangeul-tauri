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
import { readGuiHarnessInputs } from '../wdio.shared.conf.ts';

const inputs = readGuiHarnessInputs();
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
  const input = await $(GUI_SELECTORS.fileInput);
  await input.waitForExist({ timeout: inputs.timeoutMs });
  await input.addValue(fixture.absolutePath);
  await resolveDocumentLoadDialog(fixture);
  await browser.waitUntil(async () => {
    const canvas = await $(GUI_SELECTORS.documentCanvas);
    const status = await $(GUI_SELECTORS.statusMessage).getText();
    return await canvas.isExisting() && status.includes(basename(fixture.absolutePath));
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${fixture.id} 문서 렌더가 완료되지 않았습니다`,
  });
}

async function resolveDocumentLoadDialog(fixture: DocumentFixture): Promise<void> {
  const displayName = basename(fixture.absolutePath);
  await browser.waitUntil(async () => {
    const status = await $(GUI_SELECTORS.statusMessage).getText();
    const overlay = await $(GUI_SELECTORS.modalOverlay);
    return status.includes(displayName) || await overlay.isExisting();
  }, {
    timeout: inputs.timeoutMs,
    timeoutMsg: `${fixture.id} 문서 로드 선택 화면이 준비되지 않았습니다`,
  });

  const overlay = await $(GUI_SELECTORS.modalOverlay);
  if (!await overlay.isExisting()) return;
  const title = (await overlay.$(GUI_SELECTORS.modalTitle).getText())
    .replace(/\s*×\s*$/, '');
  if (title !== '로컬 글꼴 감지') {
    throw new Error(`${fixture.id} 예상하지 않은 문서 로드 모달: ${title}`);
  }
  const buttons = await overlay.$$(GUI_SELECTORS.modalButtons);
  for (const button of buttons) {
    if (await button.getText() === '대체 글꼴로 보기') {
      await button.click();
      return;
    }
  }
  throw new Error(`${fixture.id} 대체 글꼴 선택 버튼을 찾을 수 없습니다`);
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
  const page = parsePageIndicator(await $(GUI_SELECTORS.pageIndicator).getText());
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
