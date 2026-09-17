import '../src/style.css';
import { AboutDialog } from '../src/ui/about-dialog';
import { ThumbnailDiagnosticsDialog } from '../src/ui/thumbnail-diagnostics-dialog';
import { ThumbnailDiagnosticsController } from '../src/core/desktop-thumbnail-diagnostics';
import { completed, ready, running } from './thumbnail-diagnostics-fixtures';
import type { DiagnosticSnapshot } from '../src/core/desktop-thumbnail-diagnostics-model';

const report = document.querySelector('#report')!;
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
  report.textContent += `\nPASS: ${message}`;
}
async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
function button(text: string): HTMLButtonElement {
  const value = [...document.querySelectorAll('dialog button')].find((node) => node.textContent === text);
  if (!(value instanceof HTMLButtonElement)) throw new Error(`button missing: ${text}`);
  return value;
}
function setup(result = completed(true)) {
  const calls: string[] = [];
  const controller = new ThumbnailDiagnosticsController({
    inspect: async () => { calls.push('inspect'); return ready(); },
    start: async (consent) => { calls.push(`start:${consent}`); return result; },
    state: async () => result,
    cancel: async () => { calls.push('cancel'); },
    openInstructions: async () => { calls.push('instructions'); throw new Error('private/offline'); },
  });
  const dialog = new ThumbnailDiagnosticsDialog(controller);
  dialog.show();
  return { dialog, controller, calls };
}

async function resultsAndCopy() {
  const { dialog, calls } = setup();
  try {
    await settle();
    assert(calls.join() === 'inspect', '동의 전에 실제 검사를 시작하지 않음');
    assert(!button('동의하고 검사').disabled, '검사 준비 버튼 연결');
    assert(button('공식 설치 안내 열기').hidden, '검사 전 MSI 안내 없음');
    button('동의하고 검사').click(); button('동의하고 검사').click(); await settle();
    assert(calls.filter((value) => value.startsWith('start')).length === 1, '중복 클릭 차단');
    const text = document.querySelector('dialog')!.textContent!;
    assert(text.includes('HWP 실제 검사: 테스트 문서의 썸네일 검사 통과'), 'HWP 성공 표시');
    assert(text.includes('HWPX 실제 검사: 사용자별 처리기의 Shell 활성화가 실패'), 'HWPX 제한 별도 표시');
    assert(!button('공식 설치 안내 열기').hidden, '조건부 MSI 안내 연결');
    button('공식 설치 안내 열기').click(); await settle();
    assert(document.querySelector('dialog')!.textContent!.includes('안내 페이지를 열지 못했습니다'), '오프라인 로컬 안내');
    assert(!document.querySelector('dialog')!.textContent!.includes('private/offline'), '예외 원문 비노출');
    button('진단 요약 복사').click(); await settle();
    const fallback = document.querySelector('dialog textarea') as HTMLTextAreaElement;
    assert(!fallback.hidden && fallback.value.includes('0x80040154'), 'clipboard 실패 시 같은 정제 요약 수동 복사');
    assert(document.activeElement === fallback, '수동 복사 입력에 포커스');
    button('닫기').click();
    assert(!document.querySelector('dialog'), '닫기 버튼이 dialog 제거');
  } finally { dialog.hide(); }
}
async function cancellation() {
  let resolve!: (value: DiagnosticSnapshot) => void;
  const calls: string[] = [];
  const controller = new ThumbnailDiagnosticsController({
    inspect: async () => ready(), start: () => new Promise((done) => { resolve = done; }),
    state: async () => running('suite'), cancel: async () => { calls.push('cancel'); },
    openInstructions: async () => {},
  });
  const dialog = new ThumbnailDiagnosticsDialog(controller);
  dialog.show(); await settle(); button('동의하고 검사').click();
  button('검사 취소').click(); resolve(running('suite')); await settle();
  assert(calls.includes('cancel'), '실제 취소 버튼이 늦은 시작 응답도 취소');
  document.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
  assert(!document.querySelector('dialog'), 'Escape cancel 이벤트로 닫기');
}
function aboutExposure() {
  const platform = Object.getOwnPropertyDescriptor(navigator, 'platform');
  const userAgent = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
  try {
    for (const [native, os, visible] of [[false, 'Win32', false], [true, 'Linux', false], [true, 'Win32', true]] as const) {
      Object.defineProperty(navigator, 'platform', { configurable: true, value: os });
      Object.defineProperty(navigator, 'userAgent', { configurable: true, value: os });
      if (native) Object.defineProperty(window, '__TAURI_INTERNALS__', { configurable: true, value: {} });
      else Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
      const about = new AboutDialog(); about.show();
      assert(Boolean(document.querySelector('.about-thumbnail-diagnostics-button')) === visible, `${native ? 'native' : 'browser'} ${os} 제품 정보 노출`);
      assert(Boolean(document.querySelector('.about-alhangeul-version')), '기존 제품 버전 표시 유지');
      about.hide();
    }
  } finally {
    Reflect.deleteProperty(window, '__TAURI_INTERNALS__');
    if (platform) Object.defineProperty(navigator, 'platform', platform); else Reflect.deleteProperty(navigator, 'platform');
    if (userAgent) Object.defineProperty(navigator, 'userAgent', userAgent); else Reflect.deleteProperty(navigator, 'userAgent');
  }
}
document.querySelector('#tests')!.addEventListener('click', () => {
  void (async () => {
    report.textContent = '실행 중';
    const clipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('denied'); } } });
    try {
      aboutExposure(); await resultsAndCopy(); await cancellation();
      const { dialog } = setup(completed()); await settle(); button('동의하고 검사').click(); await settle();
      assert(button('공식 설치 안내 열기').hidden, '전체 성공이면 MSI 안내 없음'); dialog.hide();
      report.textContent += '\nALL PASSED (synthetic bridge / real DOM)';
    } catch (error) { report.textContent += `\nFAILED: ${String(error)}`; }
    finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else Reflect.deleteProperty(navigator, 'clipboard');
    }
  })();
});
document.querySelector('#sample')!.addEventListener('click', () => { setup(); });
