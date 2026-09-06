# Task #57 Stage 1 보고서 — Windows 썸네일 진단·관측 계약

GitHub Issue: [#57](https://github.com/postmelee/alhangeul-tauri/issues/57)
구현계획서: [task_m010_57_impl.md](../plans/task_m010_57_impl.md)
Stage: 1
검증일: 2026-09-06
작업 브랜치: `local/task57`, 분리 worktree: `.claude/worktrees/task57`

## 단계 목적

PC방에서 NSIS는 실패하고 MSI는 성공한 현상을 조사할 수 있도록 등록 상태,
직접 COM 생성, Shell bitmap, 캐시 조회와 강제 추출을 구분하는 진단 계약을 구현했다.
이 단계는 진단 기반 구축이며 현장 문제 해결이나 Windows 실행 수용 완료가 아니다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `scripts/windows-thumbnail-diagnostics.ps1` | 입력 5개, 고정 x64 STA 자식 실행, 15초 기본 timeout, 출력 JSON 계약 검증, create-new 결과 파일 |
| `scripts/windows-thumbnail-probe.ps1` | 자식 환경의 요청을 검증하고 state/association/activate/shell/cache-only/force-extract 모드 실행 |
| `scripts/windows-thumbnail-state.ps1` | Registry64 HKCU/HKLM, 정책, OS/image version, token/세션, 제품 파일 존재·hash의 허용 목록 수집 |
| `scripts/windows-thumbnail-native.cs` | SDK GUID·vtable·flag·GDI 및 COM 선언 |
| `scripts/windows-thumbnail-interop.cs` | API 단계·HRESULT·bitmap·크기·cache flag 기록과 소유권별 자원 해제 |
| `scripts/windows-thumbnail-token.cs` | 실제 token elevation/type/integrity 수집과 Win32 오류 보존 |
| `scripts/windows-thumbnail-smoke.ps1` | inline C# 중복 제거, 공통 Shell 진단과 non-null bitmap 성공 조건 연결 |
| `tests/windows-thumbnail-diagnostics.test.mjs` | 입력·격리·출력·누락·금지 변경·bitmap 소유권 등 source-contract 12개 |
| `tests/windows-installer-smoke.test.mjs`, `package.json` | 기존 smoke의 interop 분리 검사 및 정규 automation suite 연결 |
| 수행·구현계획서, `mydocs/orders/20260906.md` | 이번 승인과 단계 상태 반영, 기존 작업 행 보존 |

추가 helper는 승인된 동일 `scripts/` 경계의 역할별 분리다. 신규 구현 파일은 각각
42~172 LOC이며 PowerShell 함수는 50 LOC·입력 5개 이내다. native 선언은 SDK ABI를 유지한다.

### 관측·안전 계약

- `schemaVersion=1`, `mode/status/phase/hresult`, `bitmapPresent`, `width/height`,
  `elapsedMs/cacheFlags/detailCode`를 기록한다. 미설정·읽기 실패는 0으로 바꾸지 않는다.
- `state`의 `collected`는 수집 실행 완료만 뜻한다. 개별 등록·정책 값에는 별도의
  `missing/unreadable/invalid` 상태가 남는다. 등록 성공과 실제 썸네일 성공은 다르다.
- `IShellItemImageFactory.GetImage`는 thumbnail-only로 요청한다. `S_OK`여도 bitmap이
  없거나 GDI 크기가 유효하지 않으면 실패한다. 기존 smoke는 이 조건을 공유한다.
- `IThumbnailCache`의 cache-only와 force-extract를 분리한다. Shell이 넘긴 소유 bitmap은
  `DeleteObject`, 공유 bitmap은 COM 객체 해제로 반환하고 빌린 handle을 삭제하지 않는다.
- standalone 호출은 새 자식 PowerShell을 사용한다. 종료는 해당 자식만 대상으로 하며
  Explorer/dllhost 일괄 종료, 캐시 삭제, UAC/registry 정책 변경은 하지 않는다.
- 사용자 파일 경로·계정·전체 SID·문서 내용·예외 원문을 JSON에 담지 않는다.
  설치 경로는 역할 토큰으로 치환하고 registry 경로로 네트워크 공유를 따라가지 않는다.
- state/association은 조회다. COM 생성·Shell·캐시 추출 진단은 처리기/worker 실행과
  Windows 캐시 변경 가능성이 있어 무부작용 검사로 취급하지 않는다.

## 본문 변경 정도 / 본문 무손실 여부

제품 엔진, installer hook, registry 등록 모델, workflow, 공개 문서는 변경하지 않았다.
기존 smoke의 설치·rollback·공존·제거 검사는 보존하고 HRESULT-only 판정을 보강했다.
기존 성공 결과의 숫자 `HResult=0`은 유지하며 상세 `Probe`를 추가했다.
계획서와 오늘할일은 승인·진행 상태만 갱신했다. 메인 worktree의 #19 변경은 건드리지 않았다.

## 검증 결과

실행 명령:

```sh
node --test tests/windows-thumbnail-diagnostics.test.mjs tests/windows-installer-smoke.test.mjs
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

결과:

- 관련 검사: **24 passed, 0 failed**.
- 제품 경계: **Product boundary check passed (391 files scanned)**.
- 전체 automation: **513 passed, 0 failed, 0 skipped**.
- `git diff --check`: 출력 없음, 종료 코드 0.
- 초기 전체 검사에서는 전용 worktree의 미초기화 submodule 때문에 fixture/pin 검사
  3개가 실패했다. 승인된 준비 절차로 frozen pnpm 설치와 submodule 고정 커밋
  `496333b27d21ddb9114ba9ae340bcb895870c9a7` 초기화를 마친 뒤 전체 재검사에 통과했다.
  submodule 작업 트리는 clean이며 pin/lockfile 변경은 없다.
- 현재 호스트에서는 Windows PowerShell 5.1 `Add-Type`, COM/GDI 호출 및 실제 설치를
  실행하지 않았다. 위 결과는 Node source-contract 검사이며 native 실행 결과가 아니다.

## 잔여 위험

- C# ABI와 PowerShell 런타임 동작, 실제 bitmap 생성·캐시 분리는 Stage 2 Windows gate에서
  확인해야 한다. 소스 패턴 검사는 이를 대신하지 않는다.
- 기존 installer smoke의 MSI → NSIS 순차 구조와 같은 프로세스에서의 Shell 호출은 아직
  남아 있다. 독립 job 및 standalone 진단 연결은 Stage 2 범위다.
- UAC, 등록 범위, 설치 순서와 캐시 중 무엇이 현장 차이를 유발했는지는 미확정이다.
  Hancom 버전별 분기나 UAC 값만을 기준으로 하는 NSIS 차단은 추가하지 않았다.

## 다음 단계 영향

- Stage 2에서 동일 source/artifact의 NSIS-only와 MSI-only를 독립 Windows VM에 설치하고,
  설치 전 상태부터 각 모드의 JSON 및 실제 bitmap 결과를 수집한다.
- JPG 대조군과 공개 HWP/HWPX fixture, 설치·제거·rollback을 함께 확인한다.
  hosted 환경 미재현은 Windows client/VDI 수용 완료로 취급하지 않는다.
- 원격 후보 게시와 Actions 실행은 후보 SHA 및 실행 입력을 확정한 뒤 별도 승인받는다.
  이번 단계에서는 push, dispatch, PR/릴리즈 게시, #57 종료 및 #58 구현을 하지 않았다.

## 승인 요청

- Stage 1 산출물과 로컬 검증 결과를 검토하고 Stage 2의 workflow·installer별 격리 검증
  구현 진입을 승인해 달라. 원격 non-force 게시·비게시 Actions 실행 승인은 후보를 제시할 때
  별도로 요청한다.
