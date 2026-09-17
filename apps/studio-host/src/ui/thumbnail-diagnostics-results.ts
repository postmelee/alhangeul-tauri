import {
  findingMessage, inspectionOf, offerMsi, safeProbeLabel,
  type DiagnosticSnapshot, type DiagnosticView, type FormatResult,
} from '../core/desktop-thumbnail-diagnostics-model';
import { completion, formatPassed } from './thumbnail-diagnostics-presentation';

export function paragraph(parent: HTMLElement, text: string): HTMLParagraphElement {
  const node = document.createElement('p');
  node.textContent = text;
  parent.appendChild(node);
  return node;
}
function details(parent: HTMLElement, label: string): HTMLDetailsElement {
  const node = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = label;
  node.append(summary);
  parent.append(node);
  return node;
}
function formatCards(parent: HTMLElement, snapshot: DiagnosticSnapshot): void {
  if (snapshot.result?.kind !== 'suite') return;
  const cards = document.createElement('div');
  cards.className = 'thumbnail-format-cards';
  for (const extension of ['.hwp', '.hwpx']) {
    const matches = snapshot.result.value.formats.filter((format) => format.input.extension === extension);
    const format = matches.length === 1 ? matches[0] : null;
    const passed = format && formatPassed(snapshot, format);
    const card = document.createElement('section');
    card.className = 'thumbnail-format-card';
    card.dataset.tone = passed ? 'success' : 'warning';
    const title = document.createElement('h3');
    title.textContent = extension.slice(1).toUpperCase();
    card.append(title);
    paragraph(card, passed ? '✓ 검사 통과' : '！확인 필요').className = 'thumbnail-format-status';
    paragraph(card, passed ? '테스트 문서의 썸네일을 생성했습니다.' : '썸네일 생성 성공을 확인하지 못했습니다.');
    cards.append(card);
  }
  parent.append(cards);
}
function guidance(parent: HTMLElement, snapshot: DiagnosticSnapshot): void {
  const section = document.createElement('section');
  section.className = 'thumbnail-next-step';
  const title = document.createElement('h3');
  const msi = offerMsi(snapshot);
  title.textContent = msi ? '다음 단계 · MSI 설치본 확인' : completion(snapshot) === 'success' ? '탐색기에서 확인해 보세요' : '설정과 설치 상태를 확인해 주세요';
  section.append(title);
  paragraph(section, msi ? '현재 실행 환경에서 사용자별 썸네일 기능을 실행하지 못했습니다. 같은 버전·빌드의 MSI 설치본으로 바꾸는 방법을 검토할 수 있습니다.' : completion(snapshot) === 'success' ? '새 문서가 있는 폴더를 열고 ‘큰 아이콘’으로 확인해 보세요. 탐색기의 권한·캐시나 문서에 따라 결과는 달라질 수 있습니다.' : '진단 상세 정보에서 원인을 확인하세요. 도움이 필요하면 진단 요약을 복사해 IT 담당자에게 전달할 수 있습니다.');
  if (msi) {
    paragraph(section, '관리자 권한이나 IT 담당자의 도움이 필요할 수 있으며, 모든 환경에서 해결을 보장하지 않습니다.').className = 'thumbnail-muted';
    const steps = details(section, 'MSI로 바꾸기 전에 확인하세요');
    const list = document.createElement('ol');
    for (const text of ['신뢰할 수 있는 배포처에서 같은 버전·빌드의 MSI 설치본이 있는지 먼저 확인하세요.', '문서를 저장하고 Alhangeul을 종료하세요.', '기존 NSIS 설치본을 정상 제거한 뒤 MSI로 설치하세요.', '설치 프로그램이 재부팅을 요청하면 따른 뒤 새 문서로 확인하세요.']) {
      const item = document.createElement('li'); item.textContent = text; list.append(item);
    }
    steps.append(list);
    paragraph(steps, '앱은 MSI의 실제 제공 여부를 원격 확인하거나 파일을 자동 다운로드하지 않습니다. 미공개·오프라인 환경에서는 IT 담당자에게 문의하세요.');
  }
  parent.append(section);
}
function probeDetails(parent: HTMLElement, { input, assessment }: FormatResult): void {
  const node = details(parent, `${input.extension === '.hwp' ? 'HWP' : 'HWPX'} API 세부 결과`);
  paragraph(node, findingMessage(assessment.finding));
  for (const { Label, Result: probe } of input.probes) {
    const code = /^0x[0-9a-fA-F]{8}$/.test(probe.hresult) ? probe.hresult : '확인 불가';
    const bitmap = probe.bitmapPresent === true ? '있음' : probe.bitmapPresent === false ? '없음' : '해당 없음';
    paragraph(node, `${safeProbeLabel(Label)}: ${code}, 비트맵 ${bitmap}`);
  }
}
function technicalDetails(parent: HTMLElement, snapshot: DiagnosticSnapshot): void {
  const inspection = inspectionOf(snapshot);
  if (!inspection) return;
  const node = details(parent, '진단 상세 정보');
  const kind = { nsis: 'NSIS', msi: 'MSI', unknown: '확인 불가' }[inspection.installKind] ?? '확인 불가';
  paragraph(node, `설치 형식: ${kind}`);
  paragraph(node, '검사는 현재 앱의 실행 환경 기준입니다. 탐색기에서의 표시나 모든 문서의 성공을 보장하지 않습니다.');
  const env = inspection.environment;
  if (env.iconsOnly.status === 'known' && env.iconsOnly.value === 1 || env.disableThumbnails.some((value) => value.status === 'known' && value.value === 1)) paragraph(node, 'Windows 표시 설정 또는 정책이 썸네일 표시를 제한하고 있습니다.');
  if (env.enableLua.status === 'known' && env.enableLua.value === 0 || env.elevated.status === 'known' && env.elevated.value) paragraph(node, 'UAC 또는 실행 권한이 일반 실행과 다릅니다. 이 정보만으로 실패 원인을 단정하지 않습니다.');
  inspection.registration.slice(0, 2).forEach((registration, index) => {
    const scope = { 'user-only': '사용자별', 'machine-only': '전체 사용자', ambiguous: '혼재', unknown: '확인 불가' }[registration.scope] ?? '확인 불가';
    paragraph(node, `${index === 0 ? 'HWP' : 'HWPX'} 등록: ${scope}${registration.ready ? '' : ` — ${findingMessage(registration.finding)}`}`);
  });
  if (snapshot.result?.kind === 'suite') {
    paragraph(node, snapshot.result.value.cleanup ? '임시 파일·검사 프로세스 정리: 완료' : '임시 파일·검사 프로세스 정리: 확인 실패');
    snapshot.result.value.formats.forEach((format) => probeDetails(node, format));
  }
}
export function renderDiagnosticResults(parent: HTMLElement, view: DiagnosticView): void {
  parent.replaceChildren();
  const snapshot = view.snapshot;
  if (!snapshot || ['connecting', 'ready', 'running', 'cancelling'].includes(view.phase)) return;
  formatCards(parent, snapshot);
  if (snapshot.result?.kind === 'suite' && !snapshot.result.value.cleanup) {
    const warning = paragraph(parent, '임시 파일 또는 검사 프로세스의 정리를 확인하지 못했습니다. 진단 요약을 복사해 담당자에게 문의하세요.');
    warning.className = 'thumbnail-cleanup-warning';
    warning.setAttribute('role', 'alert');
  }
  if (view.phase === 'completed') guidance(parent, snapshot);
  technicalDetails(parent, snapshot);
}
