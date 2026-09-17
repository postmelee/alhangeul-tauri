import {
  findingMessage, inspectionOf, msiCaution, msiGuidance, offerMsi, safeProbeLabel,
  type DiagnosticSnapshot, type DiagnosticView,
} from '../core/desktop-thumbnail-diagnostics-model';

export function paragraph(parent: HTMLElement, text: string): HTMLParagraphElement {
  const node = document.createElement('p');
  node.textContent = text;
  parent.appendChild(node);
  return node;
}
export function diagnosticStatus(view: DiagnosticView): string {
  if (view.error === 'busy') return '다른 창에서 진단 중입니다. 해당 창에서 완료하거나 취소한 뒤 다시 여세요.';
  if (view.error === 'not-owner') return '이 창의 진단 요청을 확인할 수 없습니다. 창을 닫고 다시 여세요.';
  const messages: Record<DiagnosticView['phase'], string> = {
    connecting: '상태 확인 중…', ready: '검사 준비 — 아래 설명에 동의한 뒤 검사하세요.',
    running: view.snapshot?.operation === 'inspect' ? '설치·등록 상태 확인 중…' : '공개 테스트 문서의 썸네일 검사 중… (최대 3분, 이후 정리)',
    cancelling: '취소 요청 중… 임시 파일과 검사 프로세스를 정리하고 있습니다.',
    completed: '검사가 끝났습니다. 형식별 결과를 확인하세요.',
    cancelled: '검사를 취소했습니다. 미완료 항목은 통과로 판정하지 않습니다.',
    'timed-out': '검사 시간이 초과되었습니다. 네이티브 진단에서 취소·정리를 진행합니다.',
    failed: '진단을 완료하지 못했습니다. 아래 정리 결과를 확인하고 필요하면 담당자에게 문의하세요.',
    error: '진단에 연결하지 못했습니다. 창을 닫고 다시 시도하세요.',
  };
  return messages[view.phase];
}

export function renderDiagnosticResults(parent: HTMLElement, snapshot: DiagnosticSnapshot | null): void {
  parent.replaceChildren();
  const inspection = inspectionOf(snapshot);
  if (!inspection) return;
  const kind = { nsis: 'NSIS', msi: 'MSI', unknown: '확인 불가' }[inspection.installKind] ?? '확인 불가';
  paragraph(parent, `설치 형식: ${kind}`);
  const env = inspection.environment;
  if (env.iconsOnly.status === 'known' && env.iconsOnly.value === 1
    || env.disableThumbnails.some((value) => value.status === 'known' && value.value === 1)) {
    paragraph(parent, '환경 경고: Windows 표시 설정 또는 정책이 썸네일 표시를 제한하고 있습니다.');
  }
  if (env.enableLua.status === 'known' && env.enableLua.value === 0
    || env.elevated.status === 'known' && env.elevated.value) {
    paragraph(parent, '환경 참고: UAC 또는 실행 권한이 일반 실행과 다릅니다. 이 정보만으로 실패 원인을 단정하지 않습니다.');
  }
  paragraph(parent, '검사는 현재 앱의 실행 문맥 기준이며 Explorer의 권한·캐시 상태나 모든 문서를 보장하지 않습니다.');
  inspection.registration.slice(0, 2).forEach((registration, index) => {
    const scope = { 'user-only': '사용자별', 'machine-only': '전체 사용자', ambiguous: '혼재', unknown: '확인 불가' }[registration.scope] ?? '확인 불가';
    paragraph(parent, `${index === 0 ? 'HWP' : 'HWPX'} 등록: ${scope} — ${findingMessage(registration.finding)}`);
  });
  if (snapshot?.result?.kind !== 'suite') return;
  const result = snapshot.result.value;
  for (const { input, assessment } of result.formats) {
    const format = input.extension === '.hwp' ? 'HWP' : 'HWPX';
    const valid = snapshot.status === 'completed' && result.status === 'completed' && result.cleanup;
    paragraph(parent, `${format} 실제 검사: ${valid ? findingMessage(assessment.finding) : '미완료 또는 유효하지 않은 진단'}`);
    const details = document.createElement('details');
    const heading = document.createElement('summary');
    heading.textContent = `${format} API 세부 결과`;
    details.appendChild(heading);
    parent.appendChild(details);
    for (const { Label, Result: probe } of input.probes) {
      const mode = ['association', 'activate', 'shell', 'cache-only', 'force-extract'].includes(probe.mode) ? probe.mode : 'API';
      const code = /^0x[0-9a-fA-F]{8}$/.test(probe.hresult) ? probe.hresult : '확인 불가';
      const bitmap = probe.bitmapPresent === true ? '있음' : probe.bitmapPresent === false ? '없음' : '해당 없음';
      paragraph(details, `${safeProbeLabel(Label)} (${mode}): ${code}, 비트맵 ${bitmap}`);
    }
  }
  paragraph(parent, result.cleanup ? '임시 파일·검사 프로세스 정리: 완료' : '정리 결과: 확인 실패 — 진단 요약을 복사해 담당자에게 문의하세요.');
  if (offerMsi(snapshot)) {
    paragraph(parent, msiGuidance);
    paragraph(parent, msiCaution);
  }
}
