export type Status = 'running' | 'cancelling' | 'completed' | 'cancelled' | 'timed-out' | 'failed';
export type Observation<T> = { status: 'known'; value: T } | { status: 'missing' | 'unreadable' };
export type Finding = keyof typeof findingMessages;
export interface Registration {
  ready: boolean;
  referenceMatched: boolean;
  scope: 'user-only' | 'machine-only' | 'ambiguous' | 'unknown';
  finding: Finding;
}
export interface Inspection {
  buildReference: { schemaVersion: number; sourceSha: string; productVersion: string } | null;
  environment: {
    osBuild: Observation<number>; processX64: boolean;
    apartmentSta: Observation<boolean>; elevated: Observation<boolean>;
    elevationType: Observation<number>; integrityRid: Observation<number>;
    enableLua: Observation<number>; iconsOnly: Observation<number>;
    disableThumbnails: Observation<number>[];
  };
  installKind: 'nsis' | 'msi' | 'unknown';
  installRecordsReadable: boolean;
  registration: Registration[];
}
export interface FormatResult {
  input: {
    extension: '.hwp' | '.hwpx'; registration: Registration;
    integrity: boolean; cleanup: boolean; registrationStable: boolean;
    probes: { Label: string; Result: {
      mode: string; phase: string; status: string; hresult: string;
      bitmapPresent: boolean | null;
    } }[];
  };
  assessment: {
    finding: Finding; recommendedAction: string;
    evidenceValid: boolean; thumbnailPassed: boolean;
  };
}
export interface SuiteResult {
  status: Status; inspection: Inspection | null; cleanup: boolean; formats: FormatResult[];
}
export interface DiagnosticSnapshot {
  requestId: string; sequence: number; status: Status; operation: 'inspect' | 'suite';
  result: { kind: 'inspection'; value: Inspection } | { kind: 'suite'; value: SuiteResult } | null;
}
export interface DiagnosticView {
  phase: 'connecting' | 'ready' | Status | 'error';
  snapshot: DiagnosticSnapshot | null;
  error: 'busy' | 'not-owner' | 'unavailable' | 'consent-required' | null;
}
export const findingMessages = {
  'ready': '검사 준비가 되었습니다.',
  'diagnostic-invalid': '진단 근거가 불완전합니다. 다시 검사하거나 담당자에게 문의하세요.',
  'other-handler-selected': '다른 프로그램의 썸네일 처리기가 선택되어 있습니다.',
  'registration-ambiguous': '등록 범위가 혼재합니다. 설치 이력을 확인하세요.',
  'registration-mismatch': '설치본과 썸네일 등록이 일치하지 않습니다.',
  'reference-mismatch': '설치 파일의 빌드·무결성을 확인할 수 없습니다.',
  'display-policy-restricted': 'Windows의 아이콘·썸네일 표시 설정을 확인하세요.',
  'shell-control-failed': '일반 이미지 검사도 실패했습니다. Windows 환경을 확인하세요.',
  'unclassified-failure': '원인을 분류하지 못했습니다. 진단 요약으로 추가 확인이 필요합니다.',
  'per-user-shell-activation-failed': '사용자별 처리기의 Shell 활성화가 실패했습니다.',
  'thumbnail-api-ok': '테스트 문서의 썸네일 검사 통과',
} as const;

export function findingMessage(finding: Finding): string {
  return Object.hasOwn(findingMessages, finding)
    ? findingMessages[finding] : findingMessages['diagnostic-invalid'];
}
export function inspectionOf(snapshot: DiagnosticSnapshot | null): Inspection | null {
  if (snapshot?.result?.kind === 'inspection') return snapshot.result.value;
  return snapshot?.result?.kind === 'suite' ? snapshot.result.value.inspection : null;
}
export function active(snapshot: DiagnosticSnapshot | null): boolean {
  return snapshot?.status === 'running' || snapshot?.status === 'cancelling';
}
export function offerMsi(snapshot: DiagnosticSnapshot | null): boolean {
  if (snapshot?.status !== 'completed' || snapshot.result?.kind !== 'suite') return false;
  const result = snapshot.result.value;
  return result.status === 'completed' && result.cleanup
    && result.inspection?.installKind === 'nsis'
    && result.formats.some(({ input, assessment }) =>
      input.registration.scope === 'user-only' && input.integrity && input.cleanup
      && input.registrationStable && assessment.evidenceValid && !assessment.thumbnailPassed
      && assessment.finding === 'per-user-shell-activation-failed'
      && assessment.recommendedAction === 'consider-msi');
}
export const msiGuidance = '현재 실행 문맥에서 사용자별 처리기의 Shell 활성화가 실패했습니다. 저장·종료 후 NSIS를 정상 제거하고 같은 버전/빌드의 MSI 설치를 대안으로 검토하세요. 관리자 권한이나 IT 담당자의 도움이 필요할 수 있으며 모든 환경에서 해결을 보장하지 않습니다.';
export const msiCaution = '설치 프로그램이 재부팅을 요청하면 따르고 새 문서로 다시 확인하세요. 앱은 같은 빌드 MSI의 실제 존재를 원격 확인하지 않았습니다. 미공개·오프라인 환경에서는 신뢰 가능한 배포본 또는 IT 담당자를 통해 확인하세요. 파일을 자동으로 다운로드하지 않습니다.';

export function safeProbeLabel(label: string): string {
  return /^manual-(association-(hwp|hwpx)|activate|(after-force-)?(document|control-jpg)-(shell|cache-only|force-extract))$/.test(label)
    ? label : 'unknown';
}
