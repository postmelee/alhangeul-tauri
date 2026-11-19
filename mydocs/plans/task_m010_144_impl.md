# 구현계획서 — rhwp v0.9.1 후보 동기화 복구

수행계획서: [task_m010_144.md](task_m010_144.md)
GitHub Issue: [#144](https://github.com/postmelee/alhangeul-tauri/issues/144)
마일스톤: M010

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 초기화 훅 호환과 취소 | 글꼴 진입 훅·컨트롤러·회귀 | 안정 v0.9.0 및 exact v0.9.1 시그니처와 지연 취소 |
| 2 | 제품 글꼴 수명주기 | host provider·글꼴 어댑터·PDF 경계 | 명시적 조판 opt-in, 해제·재공급, 실제 HWP/HWPX WASM |
| 3 | 통합 검증 및 PR | 검증 기록·최종 보고 | 양쪽 pin, Linux/Windows 검증 범위와 미검증 구분 |

## 문서 위치 확인

| 파일 | 수행계획 선택 위치 | 실제 산출물 | 일치 여부 |
|---|---|---|---|
| 구현계획 | mydocs/plans/ | task_m010_144_impl.md | OK |
| 단계·최종 검증 | mydocs/working/, mydocs/report/ | task_m010_144_stage{N}.md, task_m010_144_report.md | OK |
| 공식 제품 문서 | 해당 없음 | 변경 없음 | OK |

## Stage 1 — 정확한 초기화 글꼴 훅과 취소

- local-font-entry-hooks.ts와 local-font-controller.ts에서 현행 두 서명과 v0.9.1의 AbortSignal·preserveStatus 포함 서명을 구별한다. 허용된 정확한 앵커가 없거나 둘 이상이면 기존 경고대로 실패한다. v0.9.1의 최초 upstream 취소 검사 직후, try 안에 삽입한다.
- 현재 문서 세대와 signal을 함께 검사하여 비동기 준비·갱신 도중 취소되거나 교체된 문서가 활성화, 화면 갱신 또는 새 문서용 글꼴 공급을 하지 못하게 한다. 명시 차단과 status 정책은 upstream에 둔다.
- 기존 local-font-entry-hooks.test.ts·local-font-application.test.ts 및 필요한 컨트롤러 테스트에서 기존 서명, 현재 후보 서명, 중복·누락, 지연 취소와 빠른 교체를 검증한다. pnpm run test:studio 또는 동일 프로젝트의 관련 테스트, git diff --check.

커밋: Task #144 Stage 1: Studio 초기화 글꼴 훅의 취소 호환성 보완

## Stage 2 — 제품 글꼴 자원 계약 및 PDF

- local-fonts.ts와 host-font-source.ts의 조판 상태는 provider 존재 또는 OS 감지 허용만으로 켜지지 않게 한다. upstream의 명시적 opt-in을 지원하고 provider 제거 및 설정 상태를 보존한다.
- 후보 wasm-bridge의 releaseHostLayoutPrograms 호출에 대해 layout 전용 바이트 캐시만 해제하고 조회 메타데이터, 일반 렌더링 읽기, 사용자 설정을 지우지 않는다. 해제 뒤 새 읽기 및 오래된 응답의 격리를 검증한다.
- HWP/HWPX PDF snapshot에서 실제 WASM을 사용하여 모든 SVG와 dispose를 검증하고, 닫기·교체 후 재열기까지 확인한다. mock 수정이나 정리 예외 무시로 통과시키지 않는다. pnpm run test:studio 및 build:studio, git diff --check.

커밋: Task #144 Stage 2: 제품 글꼴 수명주기와 PDF 호환성 복구

## Stage 3 — 두 pin 통합과 후보 복구 준비

- 현재 v0.9.0 c9095c5f67632e6721e800ccc7fb43ea49d26682와 v0.9.1 981ce66b4183b13c1a3b5907e04a8969c8c42034의 분리된 checkout/아티팩트 provenance를 기록한다.
- 두 환경에서 check:product-boundary, test:upstream, test:studio, build:studio를 확인한다. exact-SHA Linux test:desktop/clippy와 Windows/Linux native smoke는 지원 환경에서 시행하고 미실행 항목을 분리한다.
- 호환성 PR에는 현재 stable pin 변경을 넣지 않는다. 기존 clean devel 후보와 allowlist는 그대로 두고 후보 게시·공개 배포·서명은 하지 않는다.

커밋: Task #144 Stage 3: 두 upstream 기준의 통합 검증 기록

## 검증과 단계 의존성

각 단계의 검증, 변경 파일과 한계를 단계 보고서에 기록한다. 공유 제품 코드에 대한 필수 CI와 독립 리뷰 결과를 합쳐 최종 보고서를 작성한다. fail·skip은 통과로 표시하지 않는다. 승인된 단계 범위에서만 진행한다.

## 위험과 대응

- 새 시그니처 외 임의 앵커 탐색으로 회귀를 숨기지 않고 실제 tag 소스 두 가지로 시험한다.
- 비동기 취소는 지연 Promise와 controller 세대·signal을 같이 검사한다.
- 인접 문서와 공유하는 글꼴 catalog 및 일반 읽기를 조판 해제가 건드리지 않게 분리한다.
- CI 후보 실행의 오래된 staging 자산 재사용을 방지한다.

## 승인 요청 사항

위 구현과 검증 범위에서 시작한다. 안정 핀 갱신, 강제 브랜치 변경, 공개 배포는 제외한다.
