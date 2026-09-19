import '@upstream/styles/base.css';
import '../src/style.css';
import { AboutDialog } from '../src/ui/about-dialog';
import { ThumbnailDiagnosticsDialog } from '../src/ui/thumbnail-diagnostics-dialog';
import { ThumbnailDiagnosticsController } from '../src/core/desktop-thumbnail-diagnostics';
import { completed, ready, running } from './thumbnail-diagnostics-fixtures';
import type { DiagnosticSnapshot } from '../src/core/desktop-thumbnail-diagnostics-model';
import { assertDialogLayout } from './thumbnail-diagnostics-layout';

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
    assertDialogLayout(assert, '검사 준비');
    assert(calls.join() === 'inspect', '동의 전에 실제 검사를 시작하지 않음');
    assert(!button('동의하고 검사').disabled, '검사 준비 버튼 연결');
    assert(button('공식 설치 안내 열기').hidden, '검사 전 MSI 안내 없음');
    button('동의하고 검사').focus();
    button('동의하고 검사').click(); button('동의하고 검사').click(); await settle();
    assert(calls.filter((value) => value.startsWith('start')).length === 1, '중복 클릭 차단');
    const text = document.querySelector('dialog')!.textContent!;
    const cards = document.querySelectorAll('.thumbnail-format-card');
    assert(cards[0]?.textContent?.includes('HWP✓ 검사 통과'), 'HWP 성공 표시');
    assert(cards[1]?.textContent?.includes('HWPX！확인 필요'), 'HWPX 제한 별도 표시');
    assert(text.includes('일부 형식에서 확인이 필요해요'), '부분 성공 제목');
    assertDialogLayout(assert, '부분 성공');
    assert(button('동의하고 검사').hidden && button('검사 취소').hidden, '완료 후 불필요한 동작 숨김');
    assert((document.querySelector('.thumbnail-privacy') as HTMLElement).hidden, '완료 후 동의 안내 숨김');
    assert([...document.querySelectorAll('dialog details')].every((node) => !(node as HTMLDetailsElement).open), '기술 정보와 상세 설치 절차는 기본 접힘');
    const focused = document.activeElement;
    assert(focused instanceof HTMLButtonElement && !focused.hidden && !focused.disabled, '상태 전환 후 포커스 유지');
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
async function interruptedDiagnostics() {
  const result = completed(); result.status = 'failed';
  if (result.result?.kind !== 'suite') throw new Error('suite fixture missing');
  result.result.value.status = 'failed';
  for (const format of result.result.value.formats) {
    format.input.integrity = false; format.input.registrationStable = false;
    format.assessment = { finding: 'diagnostic-invalid', recommendedAction: 'check-diagnostics', evidenceValid: false, thumbnailPassed: false };
  }
  result.result.value.formats[0].input.probes[0].Result = {
    mode: 'shell', phase: 'SHCreateItemFromParsingName.imageFactory', status: 'failed', hresult: '0x80070057', bitmapPresent: null,
  };
  result.result.value.formats[1].input.probes = [];
  const sample = setup(result);
  try {
    await settle(); button('동의하고 검사').click(); await settle();
    const cards = document.querySelectorAll('.thumbnail-format-card');
    assert(cards[0]?.textContent?.includes('진단 미완료'), '중단된 HWP 진단을 썸네일 실패와 구분');
    assert(cards[1]?.textContent?.includes('미검사'), '시작하지 않은 HWPX는 미검사 표시');
    assert(document.querySelector('dialog')!.textContent!.includes('진단을 완료하지 못했어요'), '중단된 진단의 제목을 기능 실패와 구분');
    assert(document.querySelector('dialog')!.textContent!.includes('SHCreateItemFromParsingName.imageFactory'), '정제한 API 실패 단계 표시');
    assert(button('공식 설치 안내 열기').hidden, '진단 중단에는 MSI 전환 권고 없음');
    button('진단 요약 복사').click(); await settle();
    const summary = JSON.parse((document.querySelector('dialog textarea') as HTMLTextAreaElement).value);
    assert(summary.formats[0].integrity === null && summary.formats[1].registrationStable === null, '중단 후 미확인 상태를 무결성 실패로 복사하지 않음');
  } finally { sample.dialog.hide(); }
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
      aboutExposure(); await resultsAndCopy(); await cancellation(); await interruptedDiagnostics();
      const { dialog } = setup(completed()); await settle(); button('동의하고 검사').click(); await settle();
      assert(button('공식 설치 안내 열기').hidden, '전체 성공이면 MSI 안내 없음');
      assertDialogLayout(assert, '전체 성공');
      for (const details of document.querySelectorAll('dialog details')) (details as HTMLDetailsElement).open = true;
      assertDialogLayout(assert, '상세 펼침');
      dialog.hide();
      for (const status of ['cancelled', 'timed-out', 'failed'] as const) {
        const result = completed(); result.status = status;
        if (result.result?.kind === 'suite') { result.result.value.status = status; result.result.value.cleanup = false; }
        const sample = setup(result); await settle(); button('동의하고 검사').click(); await settle();
        assert(!document.querySelector('.thumbnail-format-card[data-tone="success"]'), `${status}: 미완료 결과를 성공으로 표시하지 않음`);
        assert(Boolean(document.querySelector('.thumbnail-cleanup-warning')), `${status}: 정리 실패 경고를 상세 밖에 표시`);
        assert(button('공식 설치 안내 열기').hidden, `${status}: MSI 권고 없음`);
        sample.dialog.hide();
      }
      report.textContent += '\nALL PASSED (synthetic bridge / real DOM)';
    } catch (error) { report.textContent += `\nFAILED: ${String(error)}`; }
    finally {
      if (clipboard) Object.defineProperty(navigator, 'clipboard', clipboard); else Reflect.deleteProperty(navigator, 'clipboard');
    }
  })();
});
document.querySelector('#sample')!.addEventListener('click', () => { setup(); });
document.querySelector('#success')!.addEventListener('click', () => { setup(completed()); });
