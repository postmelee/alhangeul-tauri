# Task #19 Stage 4.16 — Native UI 가이드와 판정 회귀 연결

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
구현계획서: [task_m010_19_impl.md](../plans/task_m010_19_impl.md)
Stage: 4.16

## 단계 목적

단계 보고서에 흩어진 자동화 함정을 재사용 가이드와 사건 기록으로 연결하고,
이미 존재하는 실제 판정 함수에 원격 관측 결과의 회귀 테스트를 추가한다.
미지원 native 동작을 문서/테스트 수만으로 해결했다고 선언하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `docs/operations/NATIVE_UI_TESTING.md` | 작성 전 점검, 검증 계층, 선택/실행/결과 분리, 진단·재현·유지보수 기준 |
| `docs/DEVELOPMENT.md`, `docs/README.md`, `docs/operations/RELEASE_CHECKLIST.md` | 새 가이드의 진입 링크, 릴리즈 gate 불변 명시 |
| `mydocs/troubleshootings/task_m010_19_windows_pdf_automation.md` | ID 충돌·입력·미지원 확인창의 원인/검증 상태와 run 근거 |
| `tests/fixtures/windows-pdf-regressions.json` | 원격 관측 5개의 허용 필드만 추출, 원본 run/harness/artifact provenance |
| `tests/windows-pdf-regressions.test.mjs` | 실제 identity/evidence/analyzer 판정 회귀 10개, 데이터·suite 등록 검사 2개 |
| `package.json` | `test:gui:windows:contracts` 추가, 기존 `test:automation`에도 두 Windows PDF 테스트 등록 |
| 기존 plans 및 `mydocs/orders/20260907.md` | 문서 위치 승인·단계 범위·현재 상태 |

## 본문 변경 정도 / 본문 무손실 여부

제품 코드·Win32/dialog helper·workflow·의존성은 변경하지 않았다. 기존 공식 문서에는
가이드 링크만 추가하고 정책 내용을 복제하지 않았다. 과거 실패·수동 수용은 그대로
보존하며, 새 가이드가 OS별 지원 완료나 릴리즈 gate 변경을 뜻하지 않음을 명시했다.

## 검증 결과

```sh
pnpm run test:gui:windows:contracts
pnpm run typecheck:gui
git diff --check
```

- focused suite: 45/45 통과. 신규 12개 중 10개는 실제 사용되는 순수 함수의 판정 회귀,
  2개는 fixture provenance/필드 및 pnpm 진입점 검사다. 기존 정적 계약 검사와 구분한다.
- GUI typecheck: 통과.
- fixture의 모든 evidence 필드와 run/harness/native run identity를 로컬에 보관된
  원격 원본 5개와 대조: 일치. 개인 경로·오류 stack·문서 본문은 포함하지 않았다.
- 변경 문서 8개의 로컬 링크 70개·앵커 3개 존재 확인: 통과.
- `git diff --check`: 통과.
- 원격 workflow·실제 Windows UI·PDF 렌더러·전체 `test:automation`은 실행하지 않았다.
  이번 변경에 관련된 focused 검사만 수행했다.

## 잔여 위험

- `CommandButton_6/7` overwrite adapter는 여전히 미지원이다.
- 버튼 탐색/메시지의 실행 가능한 분리 테스트와 대화상자 단독 suite는 아직 없다.
- mock 분석기로 통과한 판정 테스트는 실제 PDF 텍스트·페이지 렌더링의 통과가 아니다.
- 이전 전체 run `34043594332`는 실패 상태 그대로다. 최초 두 PDF 생성은 통과했지만
  HWP restart에서 중단했고 HWPX restart와 후속 분석은 미실행이다.

## 다음 단계 영향

추가 전체 workflow 실행 전에 실제 helper가 쓰는 선택/확인 판단을 분리해 동작 테스트로
연결하고, 승인된 Windows 환경에서 작은 대화상자 검증을 수행할 계획을 먼저 정한다.
이후 안전한 overwrite adapter 보정과 기존 설치본 전체 검증으로 이어간다.
사용자 수동 통과 근거는 유지하며 반복 수동 검증을 요구하지 않는다.

## 승인 요청

이번 가이드·판정 회귀 보강은 로컬 검증 범위의 산출물이다. #19 전체 완료나 릴리즈 준비
완료가 아니다. 다음 selector/overwrite 구현·Windows 실행 단계는 별도 승인 후 진행한다.
