import type { ThumbnailDiagnosticsDialog } from '../src/ui/thumbnail-diagnostics-dialog';

type Check = (condition: unknown, message: string) => void;
type Open = () => { dialog: ThumbnailDiagnosticsDialog };
async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function copyButton() { return document.querySelector<HTMLButtonElement>('.thumbnail-copy-button')!; }
function status() { return document.querySelector<HTMLElement>('.thumbnail-copy-status')!; }

export function mockClipboard(writeText: (text: string) => Promise<void>): () => void {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return () => {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  };
}
async function start(open: Open) {
  const sample = open(); await settle();
  [...document.querySelectorAll<HTMLButtonElement>('dialog button')]
    .find((button) => button.textContent === '동의하고 검사')!.click();
  await settle(); return sample.dialog;
}

export async function checkCopyFeedback(open: Open, assert: Check): Promise<void> {
  let resolve!: () => void;
  let writes = 0;
  const restore = mockClipboard(async (text) => {
    writes++;
    assert(JSON.parse(text).schemaVersion === 1, '복사 내용은 기존 정제 진단 요약');
    await new Promise<void>((done) => { resolve = done; });
  });
  const dialog = await start(open);
  try {
    const node = document.querySelector('dialog')!;
    const before = node.getBoundingClientRect();
    const buttonBefore = copyButton().getBoundingClientRect();
    const body = document.querySelector<HTMLElement>('.thumbnail-diagnostics-body')!;
    const scrollBefore = body.scrollTop;
    const feedback = status();
    assert(feedback.closest('.thumbnail-diagnostics-actions') && feedback.getAttribute('aria-live') === 'polite'
      && feedback.getAttribute('aria-atomic') === 'true', '하단 복사 피드백과 스크린리더 알림');
    copyButton().click(); copyButton().click();
    assert(writes === 1 && copyButton().disabled && feedback.textContent === '복사 중…', '복사 완료 전 성공 표시 없음·중복 복사 차단');
    resolve(); await settle();
    assert(feedback.textContent?.includes('복사했어요') && copyButton().textContent === '✓ 복사됨', '복사 성공은 하단 문구와 버튼으로 표시');
    const after = node.getBoundingClientRect();
    const buttonAfter = copyButton().getBoundingClientRect();
    assert(before.x === after.x && before.y === after.y && before.height === after.height
      && buttonBefore.x === buttonAfter.x && buttonBefore.width === buttonAfter.width
      && body.scrollTop === scrollBefore, '복사 성공 후 모달·버튼 위치·스크롤 유지');
    await new Promise((done) => window.setTimeout(done, 3100));
    assert(copyButton().textContent === '진단 요약 복사' && feedback.textContent?.includes('복사했어요'), '3초 후 버튼 복원·완료 안내 유지');
    copyButton().click(); resolve(); await settle();
    dialog.hide();
    await new Promise((done) => window.setTimeout(done, 3100));
    assert(node.querySelector('.thumbnail-copy-button')?.textContent === '✓ 복사됨', '닫을 때 복사 버튼 복원 타이머 정리');
  } finally { dialog.hide(); restore(); }
  await checkCopyRetry(open, assert);
  await checkLateCopy(open, assert);
}

async function checkCopyRetry(open: Open, assert: Check) {
  let denied = true;
  const restore = mockClipboard(async () => { if (denied) throw new Error('denied'); });
  const dialog = await start(open);
  try {
    copyButton().click(); await settle();
    const fallback = document.querySelector<HTMLTextAreaElement>('dialog textarea')!;
    assert(status().textContent === '복사하지 못했어요' && !fallback.hidden
      && document.activeElement === fallback, '복사 실패 안내·수동 복사 유지');
    denied = false; copyButton().click(); await settle();
    assert(fallback.hidden && fallback.value === '' && status().textContent?.includes('복사했어요'), '재시도 성공 시 실패 안내와 수동 복사 정리');
  } finally { dialog.hide(); restore(); }
}

async function checkLateCopy(open: Open, assert: Check) {
  for (const rejected of [false, true]) {
    let finish!: () => void;
    const restore = mockClipboard(() => new Promise<void>((resolve, reject) => {
      finish = () => rejected ? reject(new Error('denied')) : resolve();
    }));
    const dialog = await start(open);
    const feedback = status();
    try {
      copyButton().click(); dialog.hide(); finish(); await settle();
      assert(!document.querySelector('dialog') && feedback.textContent === '복사 중…', `닫힌 창의 늦은 복사 ${rejected ? '실패' : '성공'} 응답 무시`);
    } finally { dialog.hide(); restore(); }
  }
}
