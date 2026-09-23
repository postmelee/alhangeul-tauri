# Task #5 최종 보고서 — Windows/Linux Actions와 native artifact smoke

GitHub Issue: [#5](https://github.com/postmelee/alhangeul-tauri/issues/5)
마일스톤: M010

## 작업 요약

- 대상 이슈: #5 — Windows/Linux GitHub Actions를 활성화하고 native Tauri artifact smoke를 검증한다
- 마일스톤: M010
- 단계 수: 5
- 작업 목적: 수동 GitHub Actions에서 `rhwp v0.8.2` pin을 검증하고 Windows/Linux Tauri installer 생성·inventory 경로를 실제 hosted runner에서 입증한다.

Task 시작 전 비활성 상태였던 repository Actions를 승인에 따라 활성화하고, Ubuntu CI와 Windows x64·Linux x64·Linux arm64 native matrix를 `workflow_dispatch` 전용으로 실행했다. 최종 실행 가능 SHA `583bf6878fa2ec5308009b692644ac80a4dc99da`에서 [CI run `30363411397`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30363411397)과 [native run `30363760943`](https://github.com/postmelee/alhangeul-tauri/actions/runs/30363760943)이 모두 성공했다.

이번 결과는 installer build와 artifact 무결성 smoke다. macOS, installer 설치·실행, 서명, GitHub Release, tag, Pages 배포와 updater는 수행하거나 완료로 간주하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `.github/workflows/ci.yml` | Ubuntu CI에 제품 경계, core pin과 자동화 계약 검증을 연결했다. | 수동 Ubuntu CI |
| `.github/workflows/alhangeul-desktop.yml` | exact checkout, Windows LF 보존, platform-neutral pretest, build 후 artifact inventory gate를 추가했다. | 수동 Windows/Linux native matrix |
| `scripts/verify-desktop-artifacts.mjs` | 필수 bundle, 0바이트, symlink 경계와 deterministic SHA-256 inventory를 검증하는 CLI를 추가했다. | 로컬·runner·다운로드 후 artifact 검증 |
| `tests/desktop-artifacts.test.mjs` | Windows/Linux 정상·누락·변조·AppDir 경계를 fixture 16개로 검증한다. | artifact 계약 회귀 방지 |
| `tests/actions-workflows.test.mjs` | manual-only trigger, 최소 권한, matrix, pin과 verify→upload 순서를 7개 test로 고정했다. | workflow 정책 회귀 방지 |
| `package.json` | `check:desktop-artifacts`, `test:automation` script를 추가했다. | 개발·CI 명령 표면 |
| `apps/desktop/src-tauri/src/state.rs` | `rhwp v0.8.2` native split adapter에 일반 Enter 경로의 `restore_meta: None`을 전달했다. | desktop native adapter 호환성 |
| `apps/desktop/src-tauri/src/linux_runtime.rs` | 함수 끝의 불필요한 `return;` 한 줄을 제거했다. | Linux Clippy 호환성, 동작 불변 |
| `tests/rhwp-baseline.test.mjs` | native split adapter의 `None` 전달 계약을 회귀 검사로 추가했다. | upstream adapter 기준 |
| `docs/operations/DESKTOP_RELEASE.md` | 실제 canary SHA·run·artifact inventory와 비배포 경계를 기록했다. | 유지보수자용 native build 운영 기준 |
| `docs/DEVELOPMENT.md` | Actions 활성 상태와 자동화·다운로드 inventory 검증 명령을 안내했다. | 기여자 개발 절차 |
| `mydocs/orders/20260728.md` | Task #5 등록·진행·완료 상태를 기록했다. | 하이퍼-워터폴 오늘할일 |
| `mydocs/plans/task_m010_5.md` | 범위, 수용 기준, canary 순서와 runner 보정 경계를 기록했다. | 작업 승인·범위 진실 원천 |
| `mydocs/plans/task_m010_5_impl.md` | 5개 Stage의 산출물·검증·커밋·rollback 절차를 구체화했다. | 구현 절차 진실 원천 |
| `mydocs/working/task_m010_5_stage1.md` | artifact 계약과 fixture 검증 결과를 기록했다. | Stage 1 증적 |
| `mydocs/working/task_m010_5_stage2.md` | workflow 안전장치와 로컬 정적 검증 결과를 기록했다. | Stage 2 증적 |
| `mydocs/working/task_m010_5_stage3.md` | Actions 활성화, canary 실패 분석·최소 보정과 성공 run을 기록했다. | Stage 3 증적 |
| `mydocs/working/task_m010_5_stage4.md` | artifact 다운로드 후 독립 inventory 검증과 운영 문서 변경을 기록했다. | Stage 4 증적 |
| `mydocs/working/task_m010_5_stage5.md` | 최종 exact-SHA CI·native 통합 검증과 비배포 경계를 기록했다. | Stage 5 증적 |
| `mydocs/report/task_m010_5_report.md` | 전체 변경, 수용 기준, 잔여 위험을 통합한 본 최종 보고서다. | 장기 작업 기록과 PR 근거 |

`third_party/rhwp`, `rhwp-core.lock`, `.github/workflows/pages.yml`, dependency lockfile과 macOS target은 변경하지 않았다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | `.github/workflows/` | `.github/workflows/ci.yml` | OK | GitHub Actions CI 진실 원천을 유지했다. |
| `.github/workflows/alhangeul-desktop.yml` | `.github/workflows/` | `.github/workflows/alhangeul-desktop.yml` | OK | native matrix·artifact upload 진실 원천을 유지했다. |
| `scripts/verify-desktop-artifacts.mjs` | `scripts/` | `scripts/verify-desktop-artifacts.mjs` | OK | 로컬·runner·다운로드 후 공통 검증기로 배치했다. |
| `tests/desktop-artifacts.test.mjs`, `tests/actions-workflows.test.mjs` | `tests/` | `tests/` | OK | 자동화 계약을 기존 Node test 구조에 배치했다. |
| `docs/operations/DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | native build·artifact 공식 운영 문서에 실제 결과를 반영했다. |
| `docs/DEVELOPMENT.md` | 필요 시 `docs/` 최소 수정 | `docs/DEVELOPMENT.md` | OK | 새 기여자 명령과 Actions 상태가 확정된 뒤에만 수정했다. |
| Task 계획·단계·최종 보고서 | `mydocs/` | `mydocs/plans/`, `mydocs/working/`, `mydocs/report/` | OK | 제품 문서와 승인·실행 증적을 분리했다. |

수행계획서의 문서 위치 판단과 실제 산출물 위치가 모두 일치한다. README와 site에는 임시 Actions artifact 다운로드 링크를 추가하지 않았다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---:|---:|
| Repository Actions | 비활성 | 활성, 승인된 두 workflow만 수동 실행 |
| Task #5 자동화 계약 test | 0개 | 23개 통과 |
| Upstream integration test | 31개 | 32개 통과 |
| Studio test | 114개 | 114개 통과 |
| Native hosted matrix 성공 | 미실행 | 3/3 job 성공 |
| 검증된 Actions artifact | 0개 | 3개 archive |
| 검증된 필수 installer 항목 | 0개 | 6개: MSI, NSIS, AppImage, DEB 2종, RPM |
| 자동 trigger | 0개 | 0개 |
| macOS runner·artifact | 0개 | 0개 |
| GitHub Release·tag·Pages 실행 | 0개 | 0개 |

최종 PR diff는 `origin/devel` 기준 20개 파일, 2,710 insertions, 15 deletions다. 제품 동작 변경은 `rhwp v0.8.2` signature adapter 한 곳과 동작 불변 Linux Clippy 한 줄 보정으로 제한했다.

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Repository Actions 활성 상태 | OK — API가 `enabled: true`를 반환했다. |
| 최종 CI exact SHA | OK — run `30363411397`의 head가 `583bf6878fa2ec5308009b692644ac80a4dc99da`, conclusion `success`다. |
| Ubuntu desktop Rust test·Clippy | OK — CI `Unit tests` job `90288465399`의 모든 step이 성공했다. |
| Windows/Linux native matrix | OK — run `30363760943`의 Windows x64, Linux x64, Linux arm64 3개 job이 모두 성공했다. |
| Windows x64 artifact | OK — 비어 있지 않은 MSI·NSIS와 inventory를 생성·검증·업로드했다. |
| Linux x64 artifact | OK — 비어 있지 않은 DEB·RPM·AppImage와 inventory를 생성·검증·업로드했다. |
| Linux arm64 artifact | OK — 비어 있지 않은 DEB와 inventory를 생성·검증·업로드했다. |
| 다운로드 후 독립 inventory 검증 | OK — Stage 4에서 세 archive를 내려받아 동봉 inventory와 실제 파일을 모두 다시 비교했다. |
| `rhwp v0.8.2` pin | OK — tag, commit `9b16aa9e23f476e2b335d7c029fc9f24a199d63c`, managed artifact 6개가 일치했다. |
| Platform-neutral 로컬 검증 | OK — product boundary 179개, automation 23/23, upstream 32/32, Studio 114/114, production build, Cargo metadata·format이 통과했다. |
| Workflow 안전 경계 | OK — `workflow_dispatch`, `contents: read`, secret 없음, exact Windows/Linux matrix를 정적 test로 확인했다. |
| 제외 범위 불변 | OK — macOS, 자동 trigger, required check, Release, tag, Pages 실행, updater, signing을 추가하지 않았다. |
| 마지막 remote 검증 뒤 실행 경로 무변경 | OK — `583bf687…` 이후 Stage 5·최종 보고서와 오늘할일 상태 등 `mydocs` 증적만 추가됐다. |
| Git diff 품질 | OK — Pages workflow diff가 없고 `git diff --check`가 통과했다. |

Studio production build는 기존 runtime SVG resolve, ineffective dynamic import와 500KB 초과 chunk 경고를 유지했지만 종료 코드 0으로 181개 module을 build했다. 이번 Task의 신규 실패로 판정하지 않았다.

### 단계별 검증 결과

- [Stage 1 — Desktop artifact 계약과 검증기](../working/task_m010_5_stage1.md): platform별 필수 bundle, 0바이트·변조 거부와 deterministic inventory fixture를 확정했다.
- [Stage 2 — Windows/Linux Actions workflow 안전장치](../working/task_m010_5_stage2.md): manual-only·최소 권한·exact matrix와 verify-before-upload 계약을 정적 검증했다.
- [Stage 3 — GitHub Actions canary 검증](../working/task_m010_5_stage3.md): hosted runner 실패를 승인 범위 안에서 보정하고 첫 exact-SHA CI·native matrix 성공을 확보했다.
- [Stage 4 — Native artifact inventory와 운영 문서](../working/task_m010_5_stage4.md): 세 artifact를 다운로드해 inventory를 독립 재검증하고 공식 운영 문서에 증적과 비배포 경계를 반영했다.
- [Stage 5 — Actions 수용 기준 통합 검증](../working/task_m010_5_stage5.md): Stage 4까지의 최종 실행 가능 head에서 CI와 native matrix를 다시 성공시키고 전체 수용 기준을 확정했다.

## 잔여 위험과 후속 작업

### 잔여 위험

- Actions artifact는 14일 retention으로 2026-08-11 만료되며 공식 장기 배포 채널이 아니다.
- 필수 installer 생성·크기·SHA-256 inventory는 검증했지만 실제 Windows/Linux 설치·실행과 사용자 환경 호환성은 검증하지 않았다.
- 코드 서명, package signing, 공증, GitHub Release와 updater를 구성하지 않았다.
- Stage 3과 Stage 5의 packaging byte가 완전히 같지 않아 reproducible build는 입증하지 않았다. 각 run 내부 inventory 무결성만 검증했다.
- Repository-level `sha_pinning_required`는 기존과 같이 `false`다.
- 현재 Actions 활성 상태에서는 수동 Pages workflow도 실행 가능하지만 Task #5에서는 실행하지 않았다.

### 후속 작업 후보

- Windows/Linux installer 실제 설치·실행 smoke 환경과 체크리스트
- version/tag, signing, GitHub Release와 updater를 포함한 공식 배포 정책
- GitHub Actions action SHA pinning의 repository-level 강제 여부
- 장기 artifact 보존과 공개 checksum 게시 방식
- Studio build의 기존 runtime SVG·chunk 경고 정리

후속 후보는 모두 별도 Issue와 작업지시자 승인이 필요하다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 바탕으로 생성한 `devel` 대상 PR의 리뷰와 merge를 승인 요청한다.
