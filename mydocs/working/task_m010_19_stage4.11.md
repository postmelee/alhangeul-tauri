# Task #19 Stage 4.11 — 문서 identity와 대화상자 자동화 경계

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)

## 단계 목적

잘못 열린 문서를 정상 HWPX로 간주하지 않는 반복 가능한 회귀 검증을 만든다.
수동 수용과 자동화의 완성도를 분리하며 사용자에게 같은 검사를 반복 요구하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `tests/gui/support/document-identity.ts` | 특정 fixture에 종속되지 않는 정확한 clean title 판정 |
| `tests/gui/specs/windows-pdf.e2e.ts` | 편집 전 identity 확인, schemaVersion 2 증거 |
| `tests/gui/windows-pdf/analyze.mjs` | identity 없는 과거 증거·다른 문서의 증거 거부 |
| `scripts/windows-pdf-win32.ps1` | Open/Save 동일 Edit 편집 경로 |
| `scripts/windows-pdf-dialog.ps1` | UIA SetValue 우회 제거, 입력/버튼 방식 개별 기록, 추가 modal 조기 실패 |
| `tests/windows-pdf-workflow.test.mjs` | 잘못된 문서·dirty·부분 일치·누락 identity 회귀 검증 |
| `mydocs/plans/task_m010_19_impl.md`, `mydocs/orders/20260906.md` | 승인·수동 통과·단계 상태 |

## 본문 변경 정도 / 본문 무손실 여부

제품·의존성·workflow는 변경하지 않는다. 일반 문서 로드 대기 helper는 준비 상태 확인용으로
보존하고 PDF acceptance가 별도 identity 검증을 호출한다. 기존 문서 이력은 보존한다.
자동화 증거 스키마 강화로 과거 evidence가 새 analyzer를 통과하지 않는 것은 의도적이다.
nativeFallbackUsed 하나로 filename/버튼 구현을 추정하지 않고 각 방식을 분리 기록한다.

## 검증 결과

- `pnpm run typecheck:gui`: 통과.
- `node --test tests/windows-pdf-workflow.test.mjs tests/gui-contracts.test.mjs`: 30/30 통과.
- `git diff --check`: 통과.
- Windows native 메시지는 현재 macOS 호스트에서 실행하지 않았다. 정적 계약 검증은 native 수용이 아니다.

## 수동 수용 — 작업지시자 보고

2026-09-06 이 대화에서 작업지시자가 안내된 Windows NSIS 검증을 실제 수행했고 문제가 없었다고
보고했다. HWP/HWPX 편집 후 PDF 저장, 문구 표시·검색, 앱과 쪽 수 일치, 빈 페이지·심한 깨짐
없음, 미저장 종료 뒤 원본 보존, 재실행 뒤 동일 PDF 덮어쓰기에 대한 사용자 통과 보고다.
별도 exact 설치 SHA·Windows 상세 버전·산출물 hash는 제공되지 않았다. 자동 workflow의
exact-SHA 성공 또는 동시 편집 snapshot/TTL 수용으로 바꾸어 기록하지 않는다.

## 이전 원격 실행의 의미

[run 34038288652](https://github.com/postmelee/alhangeul-tauri/actions/runs/34038288652)는 HWP 지정 경로
저장·원본 hash·dirty 보존을 통과했다. HWPX로 표시된 시나리오는 HWP 화면과 6쪽을 관측했고,
추가 Yes/No 형태의 창에서 timeout했다. 창 본문은 기록하지 않아 의미는 미확정이다.
일반적인 `파일 열기 완료`만으로 identity가 보장되지 않는 허점을 이번 회귀 검증으로 막는다.

## 잔여 위험

Open/Save 공통 편집 방식의 실제 Windows 동작은 후속 검증이 필요하다.
CommandButton_6/7 형태는 Yes/No 구조로만 분류하고 덮어쓰기 의미로 단정하지 않는다.
지원하지 않는 확인창은 조기에 실패하며 blind Yes를 보내지 않는다. 필요하다면 실제 대상과
확인창 의미를 제한적으로 확인한 뒤 해당 native control adapter만 후속 보정한다.

## 다음 단계 영향

제품 재빌드 없이 같은 candidate/native artifact로 한 번 실행하여 정확한 문서 identity와
저장 경계를 확인한다. 무제한 재시도·timeout 증가는 하지 않는다. 수동 기능 통과 사실과 별개로
자동화는 아직 전체 통과가 아니며 #19 전체 완료/릴리스 승인을 선언하지 않는다.

## 승인 요청

Stage 4.11 구현·로컬 검증 완료. 다음은 동일 제품 산출물로 Windows 자동화 재검증이다.
