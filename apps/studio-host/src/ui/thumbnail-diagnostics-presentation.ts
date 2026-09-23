import { type DiagnosticSnapshot, type DiagnosticView, type FormatResult } from '../core/desktop-thumbnail-diagnostics-model';

export function formatPassed(snapshot: DiagnosticSnapshot, format: FormatResult): boolean {
  return snapshot.status === 'completed' && snapshot.result?.kind === 'suite'
    && snapshot.result.value.status === 'completed' && snapshot.result.value.cleanup
    && format.input.integrity && format.input.cleanup && format.input.registrationStable
    && format.assessment.evidenceValid && format.assessment.thumbnailPassed
    && format.assessment.finding === 'thumbnail-api-ok';
}

export function completion(snapshot: DiagnosticSnapshot | null): 'success' | 'partial' | 'warning' {
  if (!snapshot || snapshot.result?.kind !== 'suite') return 'warning';
  const formats = snapshot.result.value.formats;
  const passed = ['.hwp', '.hwpx'].filter((extension) => {
    const matches = formats.filter((format) => format.input.extension === extension);
    return matches.length === 1 && formatPassed(snapshot, matches[0]);
  }).length;
  return passed === 2 ? 'success' : passed === 1 ? 'partial' : 'warning';
}

export function formatPresentation(snapshot: DiagnosticSnapshot, format: FormatResult | null): { status: string; description: string; tone: string } {
  if (!format || format.input.probes.length === 0) return {
    status: '— 미검사', description: '문서 검사를 시작하지 못했습니다. 썸네일 기능의 실패를 뜻하지 않습니다.', tone: 'neutral',
  };
  if (snapshot.status !== 'completed' || snapshot.result?.kind !== 'suite'
    || snapshot.result.value.status !== 'completed' || !format.assessment.evidenceValid) return {
    status: '— 진단 미완료', description: '유효한 검사 결과를 얻지 못했습니다. 실제 썸네일 생성 여부는 판정하지 않았습니다.', tone: 'neutral',
  };
  return formatPassed(snapshot, format)
    ? { status: '✓ 검사 통과', description: '테스트 문서의 썸네일을 생성했습니다.', tone: 'success' }
    : { status: '！확인 필요', description: '썸네일 생성 성공을 확인하지 못했습니다.', tone: 'warning' };
}

export function presentation(view: DiagnosticView): { title: string; description: string; tone: string } {
  if (view.phase === 'running' && view.snapshot?.operation === 'inspect') {
    return { title: '설치 상태를 확인하고 있어요', description: '아직 문서 검사는 시작하지 않았습니다. 잠시만 기다려 주세요.', tone: 'neutral' };
  }
  if (view.phase === 'completed') {
    const state = completion(view.snapshot);
    return {
      title: state === 'success' ? '테스트 문서의 썸네일을 생성했어요' : state === 'partial' ? '일부 형식에서 확인이 필요해요' : '썸네일 검사를 통과하지 못했어요',
      description: state === 'success' ? 'HWP와 HWPX 검사를 모두 통과했습니다. 탐색기에서도 새 문서로 확인해 보세요.' : '아래에서 문서 형식별 결과와 다음에 할 일을 확인하세요.',
      tone: state === 'success' ? 'success' : 'warning',
    };
  }
  const messages: Record<DiagnosticView['phase'], [string, string]> = {
    connecting: ['설치 상태를 확인하고 있어요', '잠시만 기다려 주세요. 아직 문서 검사는 시작하지 않았습니다.'],
    ready: ['썸네일이 보이지 않나요?', '테스트 문서로 탐색기 썸네일 기능을 확인할 수 있습니다.'],
    running: ['썸네일을 확인하고 있어요', '검사는 최대 3분이 걸리며, 이후 임시 파일을 정리합니다.'],
    cancelling: ['검사를 취소하고 있어요', '임시 파일과 검사 프로세스를 정리하고 있습니다.'],
    cancelled: ['검사를 취소했어요', '끝나지 않은 검사는 통과로 처리하지 않습니다. 다시 검사하려면 이 창을 닫고 다시 열어 주세요.'],
    'timed-out': ['검사 시간이 초과되었어요', '진단에서 취소와 정리를 진행합니다. 잠시 후 이 창을 닫고 다시 열어 주세요.'],
    failed: ['진단을 완료하지 못했어요', '이 결과는 썸네일 기능의 실패를 뜻하지 않습니다. 진단 요약을 복사해 담당자에게 전달해 주세요.'],
    error: ['진단을 시작하지 못했어요', view.error === 'busy' ? '다른 창에서 검사 중입니다. 해당 창에서 완료하거나 취소한 뒤 다시 열어 주세요.' : '이 창을 닫고 다시 시도해 주세요.'],
    completed: ['', ''],
  };
  const [title, description] = messages[view.phase];
  return { title, description, tone: ['failed', 'error', 'timed-out'].includes(view.phase) ? 'warning' : 'neutral' };
}
