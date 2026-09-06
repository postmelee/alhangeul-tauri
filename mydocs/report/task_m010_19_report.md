# Task #19 최종 보고서 — PDF snapshot과 stale job 회수 경계

GitHub Issue: [#19](https://github.com/postmelee/alhangeul-tauri/issues/19)
마일스톤: M010

## 작업 요약

- 대상 이슈: #19. Windows/Linux PDF export의 문서 세대 혼합과 중단된 job 누적을 방지한다.
- 단계 수: 기본 4단계와 Stage 4.1–4.22 보정·검증. 과거 실패/부분 결과를 포함한 단계 기록 26개를 보존한다.
- 현재 형식의 HWP/HWPX를 한 번 직렬화해 격리 snapshot에서 PDF를 만들고 native job을
  snapshot UUID·owner·순서·용량·수명에 결속한다. stale job과 안전한 오래된 temp만 회수한다.
- 승인된 계층별 수용 근거를 Stage 4.22에서 정리했다. 후속 `진행해줘`로 최종 보고와
  `publish/task19` → `devel` Open PR 게시를 승인받았다. merge·issue close·릴리즈는 포함하지 않는다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/studio-host/src/core/pdf-export-snapshot.ts` 및 테스트 | 현재 형식 serializer 1회, 격리 WasmBridge, UUID/limit/dispose | live 편집 handler와 PDF 세대 분리 |
| `desktop-persistence.ts`, `desktop-host.ts` 및 테스트 | dialog 뒤 capture, 단일 snapshot 순차 render, timeout·abort·dispose | direct PDF만 변경, source save/dirty/recent/recovery 불변 |
| `apps/desktop/src-tauri/src/pdf_jobs.rs`, `pdf_jobs_tests.rs` | owner/snapshot 검증, 한도·TTL·target 잠금, 실패 job 회수 | native PDF job registry |
| `pdf_temp_cleanup.rs`, `pdf_temp_cleanup_tests.rs`, `state.rs`, `lib.rs`, `commands.rs` | reaper/startup 정리, typed request와 shared state | 오래된 제품 temp와 해당 job만 관리 |
| `.github/workflows/`의 CI/desktop/Linux GUI/Windows PDF·dialog | native gate, 기존 설치본 PDF 재사용, 작은 관측/실행 검사, 제한 scope | 수동 dispatch. 새 Windows workflow 2개, 기존 workflow 3개 수정 |
| `scripts/windows-pdf-*.ps1`, `tests/gui/`, `tests/windows-pdf-*`, fixtures | dialog 판단/호출/증거 분리, 실제 PS5.1 회귀와 PDF 분석 | 제품에 포함되지 않는 테스트 자동화 |
| `package.json`, `tests/actions-workflows.test.mjs`, `tests/linux-gui-workflow.test.mjs`, `tests/rhwp-baseline.test.mjs` | 기존 pnpm 진입점과 계약 정렬 | 새 패키지/lockfile 없음 |
| `docs/architecture/UPSTREAM.md`, `docs/operations/`, 문서 진입 링크 | PDF 소유/수용 기준, native UI 검증 가이드 | 아래 문서 위치 판단을 따름 |
| `mydocs/plans`, `working`, `troubleshootings`, `orders`, 본 보고서 | 승인·실패·보정·근거·한계 보존 | 제품 정책과 사건 이력을 분리 |

제품 renderer·font·upstream pin·HWP/HWPX 원본 저장·인쇄 구현은 바꾸지 않았다.
Stage 4.4에서 선행 #20/#34가 반영된 devel과 통합했다. 그 이후 runtime은 동일하고, 검증
SHA `69b22650df96323a2c59e473d474ed3195cc9cc7` 대비 apps/crates/assets/third_party/lockfile의
차이는 `#[cfg(test)]` cleanup 테스트 60줄뿐이다. 최종 보고 단계에는 코드/workflow를 수정하지 않았다.

리뷰는 snapshot/persistence → native jobs/cleanup → 자동화/가이드 순서를 권장한다.
helper 진단 실패를 제품 실패로 세거나, 보조 진단을 필수 UI 조작보다 앞세우지 않는지 확인한다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `UPSTREAM.md` | 기존 `docs/architecture/` | 동일 | OK | 수행/구현계획 Stage 3의 공식 소유 경계 |
| `DESKTOP_RELEASE.md` | 기존 `docs/operations/` | 동일 | OK | Stage 3 및 4.22의 PDF 계약·근거 계층 |
| `NATIVE_UI_TESTING.md` | 승인된 `docs/operations/` | 동일 | OK | Stage 4.16의 자동화 유지보수자용 가이드 |
| `docs/README.md`, `DEVELOPMENT.md`, `RELEASE_CHECKLIST.md` | 기존 문서의 진입 링크 | 동일 | OK | 가이드 접근 경로만 연결, 정책 중복 방지 |
| 사건 기록·최종 보고 | `mydocs/troubleshootings/`, `mydocs/report/` | 동일 | OK | 특정 실패는 사건 기록, 전체 결과는 본 보고서 |

제품 문서를 `mydocs/manual`에 넣거나 새로운 공식 문서 루트를 선택하지 않았다.
과거 단계 보고서의 당시 미완료/실패 문구를 일괄 성공으로 바꾸지 않았다. 최신 판단은
[Stage 4.22](../working/task_m010_19_stage4.22.md)와 이 보고서가 설명한다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| PDF 세대 | live page count/SVG 순회 | 현재 형식 capture 1회·격리 snapshot UUID 1개 |
| snapshot/쪽 제한 | 별도 snapshot 상한 없음 | 128 MiB / 4,096쪽 |
| SVG/동시 job 제한 | 명시적인 상한 없음 | 16 MiB/page, 512 MiB/job, process 4개 |
| job 만료 | TTL/reaper 없음 | idle 5분, absolute 15분, reaper 30초 |
| Studio 대기 제한 | PDF 전용 deadline 없음 | capture 2분, 전체 pipeline 10분; 동기 WASM 선점 취소 아님 |
| startup orphan | 별도 회수 없음 | 24시간 초과 safe dir만, scan/child 4,096·삭제 최대 64 |
| snapshot/파일시스템 증거 | 전용 세대/TTL/Windows junction 검사 없음 | 실제 HWP 6쪽/HWPX 10쪽 SVG 비교 + 결정적 실패/시간 검사 + Windows/Linux 링크 보존 |

최종 보고 직전 `44e81dc`와 devel `c93ac8c58a796a45227f764f37b7aaffaa81899e` 비교는
97 files, +9,649/-218이다. 기능 규모와 문서/자동화 누적량을 혼동하지 않도록 구분한다.

| 구분 | 파일 수 | 추가/삭제 줄 |
|---|---:|---:|
| 앱 소스 및 테스트 | 14 | +1,660/-204 |
| workflow | 5 | +486/-6 |
| 기타 자동화·계약·진입점 | 39 | +3,064/-7 |
| 공식 문서 | 6 | +303/-1 |
| 작업 기록 | 33 | +4,136/-0 |

이 측정에는 이후 본 최종 보고서와 plans/orders 정리분을 포함하지 않는다.
신규 핵심 snapshot은 162 LOC, cleanup은 262 LOC다. 기존 대형 테스트/명령 파일과
자동화 반복문은 계획서에 남긴 예외를 유지하며 이번 마무리에서 별도 리팩터링하지 않는다.

## 검증 결과

### 수용 기준별 판단

아래 OK는 작업지시자가 승인한 **결정적 테스트 + OS 파일시스템 + 설치본 PDF** 계층의
수용이다. 실제 동시 편집/reload/장시간 대기/재시작 통합까지 실행했다는 뜻이 아니다.

| 수용 기준 | 결과 |
|---|---|
| 하나의 snapshot 세대 | OK — 실제 HWP/HWPX 전체 SVG round-trip, 변하는 live handler 대신 snapshot 3쪽만 같은 UUID로 전송 |
| 실패/timeout/창 owner 회수 | OK — abort/dispose 1회·fake-time 10분 후 새 export, native idle/absolute/owned window/discard tests; 연결 코드 확인 |
| 같은 target 경합·기존 파일 보존 | OK — 다른 owner target 잠금, 실패 order/bytes/commit의 target 보존, Windows 실제 기존 PDF 교체 |
| 오래된 temp 안전성 | OK — old/recent/unknown/nested/한도, Linux symlink와 Windows junction 2형태의 대상 sentinel 보존 |
| searchable PDF·원본/dirty 불변 | OK — Windows HWP/HWPX fresh/restart 4경로, Linux HWP 6쪽/HWPX 10쪽; 수치 성공과 조판 위험은 분리 |

### 실제 실행·재사용 근거

| 검증 | 결과와 근거 |
|---|---|
| Studio snapshot/pipeline | [Stage 1](../working/task_m010_19_stage1.md) 실제 WASM 6/10쪽 SVG 비교, [Stage 3](../working/task_m010_19_stage3.md) 112 tests·source state·실패/timeout, 이후 같은 제품 native run의 Studio/upstream gate 성공 |
| Windows/Linux native 및 패키지 | [run 34021920074](https://github.com/postmelee/alhangeul-tauri/actions/runs/34021920074), 제품 `69b2265`: Windows 97+21, Linux arm64 120+21, Linux x64 native gate, Rust/Clippy와 MSI·NSIS smoke 성공 |
| 기존 Linux GUI | [run 34024320576](https://github.com/postmelee/alhangeul-tauri/actions/runs/34024320576), 제품 `69b2265`: 6시나리오, HWP 직접 PDF 6쪽/A4/검색·nonblank, 결과 42파일 hash 검산 |
| Windows PDF 전체 | [run 34058443345](https://github.com/postmelee/alhangeul-tauri/actions/runs/34058443345), harness `fdbf481`·제품 `69b2265`: HWP/HWPX fresh/restart 4PDF·32쪽 분석·원본/dirty 보존. PS 정책 62/native 50/tree 16 |
| Linux HWPX 제한 | [run 34063977183](https://github.com/postmelee/alhangeul-tauri/actions/runs/34063977183), harness `0ab4745`·제품 `69b2265`: 10쪽/A4/한글 검색·nonblank·원본 hash/문서 상태 보존, 14파일 검산 |
| Windows cleanup 제한 | [run 34064903014](https://github.com/postmelee/alhangeul-tauri/actions/runs/34064903014), harness `e401863`: 실제 junction 포함 6/6, 0 ignored, 92 filtered out. test 전용 resource 예외, full CI skipped |
| 최종 소스 계약 | [Stage 4.22](../working/task_m010_19_stage4.22.md): workflow 55/55, 앞선 GUI 19/19·Linux 62/62·workflow 65/65, typecheck/actionlint/format/boundary/diff 통과. 중복 import 수는 합산하지 않음 |

제품과 harness SHA 및 artifact digest/개별 파일 hash는 [4.19 보고서](../working/task_m010_19_stage4.19.md),
[4.22 보고서](../working/task_m010_19_stage4.22.md)에 있다. 같은 제품 설치 bytes를 확인한 뒤
재사용했으며 최신 문서 commit을 해당 native binary의 build SHA라고 쓰지 않는다.
최종 보고 시 5개 주요 run의 completed/success와 SHA를 GitHub에서 재확인했다.
통과 이후 문서만 변경했으므로 새 workflow/제품 빌드·전체 suite를 반복하지 않았다.

시각 검토는 기존 HWP 6쪽, Windows 32쪽 렌더의 이전 검토본과 동일 hash 확인 및 대표 화면
재확인, Linux HWPX 10쪽/앱 화면 검토를 근거로 한다. 빈 페이지·전면적 문자 깨짐은 없으나
HWPX 긴 표 문구의 셀 경계 잘림은 남는다. 사용자의 실제 Windows 수동 성공은 보조 근거이며
정확한 SHA가 없으므로 exact-SHA 자동 결과와 합산하지 않는다.

### 단계별 검증 결과

| 단계 | 결과/보고서 |
|---|---|
| 1 | [immutable snapshot](../working/task_m010_19_stage1.md): 격리 serializer·SVG·limit·dispose |
| 2 | [native job](../working/task_m010_19_stage2.md): UUID·한도·회수 구현, 실제 OS 실행은 후속 Stage 4 |
| 3 | [pipeline 통합](../working/task_m010_19_stage3.md): source 불변·실패 회수·공식 경계 |
| 4 | [최초 원격 결과](../working/task_m010_19_stage4.md): 당시 미완료 기록, 4.19/4.22로 수용 근거 보완 |
| 4.1 | [native test privacy/gate](../working/task_m010_19_stage4.1.md) |
| 4.2 | [Linux CUPS 증거](../working/task_m010_19_stage4.2.md) |
| 4.3 | [선행 #34 기준 정렬](../working/task_m010_19_stage4.3.md) |
| 4.4 | [최신 devel 통합 후보](../working/task_m010_19_stage4.4.md) |
| 4.5 | [Windows PDF 자동화](../working/task_m010_19_stage4.5.md) |
| 4.6 | [dispatcher 연결](../working/task_m010_19_stage4.6.md) |
| 4.7 | [대화상자 대기/진단](../working/task_m010_19_stage4.7.md) |
| 4.8 | [Win32 fallback](../working/task_m010_19_stage4.8.md) |
| 4.9 | [Open/Save 입력칸 구분](../working/task_m010_19_stage4.9.md) |
| 4.10 | [파일명 편집 반영](../working/task_m010_19_stage4.10.md) |
| 4.11 | [문서 identity guard](../working/task_m010_19_stage4.11.md) |
| 4.12 | [Open 제한 진단](../working/task_m010_19_stage4.12.md) |
| 4.13 | [native 포커스](../working/task_m010_19_stage4.13.md) |
| 4.14 | [Open 제출 경로](../working/task_m010_19_stage4.14.md) |
| 4.15 | [ID/class 충돌 방지](../working/task_m010_19_stage4.15.md) |
| 4.16 | [재발 방지 가이드](../working/task_m010_19_stage4.16.md) |
| 4.17 | [판단 함수/작은 관측](../working/task_m010_19_stage4.17.md) |
| 4.18 | [확인창 adapter/작은 통합](../working/task_m010_19_stage4.18.md) |
| 4.19 | [Windows 전체 PDF](../working/task_m010_19_stage4.19.md): fresh/restart 자동 회귀 완료 |
| 4.20 | [실제 앱 확인창 관측](../working/task_m010_19_stage4.20.md): 호출 전 관측 |
| 4.21 | [거절/확인 및 보존](../working/task_m010_19_stage4.21.md): 이전 거절과 후속 Confirm을 부분별로 결합 |
| 4.22 | [계층별 수용/최소 OS 보완](../working/task_m010_19_stage4.22.md): 승인된 수용 근거 정리 완료 |

중간 단계의 성공은 그 단계의 구현/검증 범위만 의미한다. Windows PDF 실패를 포함한
시행착오와 보정 근거는 [사건 기록](../troubleshootings/task_m010_19_windows_pdf_automation.md)에
남아 있으며, 과거 기록을 모두 최종 PDF 성공으로 해석하지 않는다.

최종 문서 검사: 변경 문서 4개/로컬 링크 53개, 템플릿 필수 섹션 7개, 커밋된 단계 기록
26개와 diff 검사가 통과했다. 통과 harness `e401863` 이후 소스/workflow 차이가 없음을 확인했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- HWPX 표의 긴 문구가 셀 경계에 밀착/잘리는 현상은 미해결이다. Linux 앱에서도 관측되어
  PDF만의 문제로 단정할 수 없다. renderer/font/upstream 원인과 원본 조판 동등성은 미확정이다.
- 실제 앱 동시 편집·46쪽 부하·WebView reload·5분/15분 대기·창 종료 이벤트·재시작 orphan
  통합은 이번 수용에서 미실행이다. 결정적 테스트/코드 연결 확인으로 수용한 범위를 명시한다.
- Linux 새 HWPX scope는 원본 무편집 상태의 새 PDF 생성이다. dirty 편집/같은 PDF 덮어쓰기
  통합을 Linux에서도 실행했다고 쓰지 않는다. native 실패/atomic tests와 Windows 실제 경로는 별도 근거다.
- 동기 WASM 호출은 JS timer가 선점하지 못한다. deadline은 전후 검사이며 모든 문서의 처리
  시간을 보장하지 않는다. junction 결과도 모든 reparse 종류/경합을 검증한 것은 아니다.
- Windows dialog의 모든 언어/provider/UI 상태를 확인하지 않았다. 보조 진단은 opt-in이며
  이번 일반 경로의 통과를 관측 모드 전체의 보증으로 확장하지 않는다.
- Actions artifact 만료와 harness/toolchain 차이를 구분한다. test 전용 resource 제외를
  실제 패키징 설정으로 옮기지 않는다. PR merge는 릴리즈·Pages/updater 게시 승인이 아니다.

### 후속 작업 후보

- PR 리뷰와 devel merge. merge 후에만 #19 close·브랜치/worktree 정리 절차를 진행한다.
- HWPX 조판 관측은 별도 범위에서 실제 앱/원본/동일 위치를 비교해 원인을 분류하고,
  수정 또는 릴리즈 위험 수용 여부를 승인받는다. 이번에 새 이슈를 임의 생성하지 않는다.
- startup/window/reaper 연결이 바뀌거나 회수 문제가 관측되면 해당 실제 통합 시나리오만
  선정한다. 새 자동화는 native UI 가이드의 정적/순수 판정 → 작은 OS 검사 → 실제 앱 순서를 따른다.

## 작업지시자 승인 요청

최종 보고·Open PR 게시는 2026-09-07 후속 지시로 승인받았다. 본 보고서와 PR의 제품 경계,
검증 계층·조판 위험·미실행 한계를 검토한 뒤 devel merge 여부를 결정해 주기를 요청한다.
작업지시자의 추가 지시 없이 merge·릴리즈·배포·issue close를 진행하지 않는다.
