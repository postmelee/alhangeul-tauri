# Task #16 최종 보고서 — Tauri updater 기반 Windows/Linux 자동 업데이트 경로

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
마일스톤: M010

## 작업 요약

- 대상 이슈: #16
- 마일스톤: M010
- 단계 수: 5
- 작업 목적: Windows x64 MSI·NSIS와 Linux x64 AppImage가 서명 검증된 자기 형식의 업데이트만 사용자 승인 뒤 설치하도록 만들고, release artifact에서 Pages manifest까지의 fail-closed 게시 경계를 확정한다.

Rust가 platform 자격, target 판별, 상태 전이, 진행률, 전체 문서 dirty guard와 설치를 소유하도록
구현했다. TypeScript는 시작 알림, 수동 확인, 명시적 설치·재시작과 상태 표시만 담당한다. 일반
desktop artifact build와 updater signing build를 분리했고, 검증된 release inventory가 없으면
GitHub Release와 Pages stable manifest가 생성되지 않도록 했다.

production 공개키와 GitHub Secret 경계를 연결한 exact-SHA Windows/Linux build를 통과했고,
test-only `99.1.0 → 99.1.1` 후보로 MSI·NSIS·AppImage의 실제 positive와 cross-format·서명·network
negative 수용을 완료했다. 시험 release와 tag는 정리했다. stable release, production tag,
`site/release.json` 게시 전환과 Pages `updater/stable.json` 배포는 수행하지 않았다.

## 변경 파일 목록과 영향 범위

| 경로 | 변경 요약 | 영향 범위 |
|---|---|---|
| `apps/desktop/src-tauri/src/updater/` | updater 상태·명령·service·target 판별과 dirty-session 보호 구현 | Windows x64 MSI·NSIS, Linux x64 AppImage native runtime |
| `apps/desktop/src-tauri/{Cargo.toml,Cargo.lock,src/lib.rs,src/state.rs,tauri.updater.conf.json}` | 공식 updater plugin, 명령 등록, release 전용 공개키·endpoint overlay 연결 | desktop build와 release config |
| `apps/studio-host/src/core/desktop-updater.ts`, `apps/studio-host/src/ui/update-dialog.ts` 외 | 시작 알림, 수동 확인, 명시적 적용·재시작 UI와 event lifecycle 연결 | desktop webview UI |
| `scripts/updater/` | release/acceptance inventory, signature·asset read-back, manifest와 native 수용 도구 구현 | 릴리스 자동화와 수용 검증 |
| `.github/workflows/alhangeul-desktop.yml`, `.github/workflows/alhangeul-updater-*.yml` | 일반 artifact, 비게시 signed build, positive·negative N→N+1 workflow 분리 | GitHub Actions |
| `scripts/{build-pages,check-pages,check-release-metadata}.mjs`, `scripts/pages/`, `.github/workflows/pages.yml` | immutable release가 먼저 검증된 경우에만 stable manifest를 출력하는 gate | GitHub Pages 게시 경계 |
| `tests/updater-*.test.mjs`, `tests/actions-workflows.test.mjs`, `tests/pages.test.mjs` 외 | target·signature·inventory·workflow·native 수용 계약과 negative fixture 고정 | platform-neutral 회귀 검증 |
| `docs/architecture/UPDATER.md` | runtime 소유권, 상태 기계, target과 신뢰 사슬 문서화 | 기여자·유지보수자 아키텍처 문서 |
| `docs/operations/DESKTOP_RELEASE.md` | key 보관, exact-SHA build, artifact read-back, no-rerun과 게시 순서 문서화 | 릴리스 관리자 운영 문서 |
| `site/updates/index.html`, `site/release.json` | 지원 updater 형식과 수동 fallback을 안내하되 unreleased 상태 유지 | 사용자 Pages |
| `mydocs/plans/task_m010_16*.md`, `mydocs/working/task_m010_16_stage*.md` | 승인 계획, 단계별 구현·검증·원격 run 근거 기록 | Hyper-Waterfall 작업 이력 |

최신 `origin/devel`을 병합한 최종 비교 기준으로 80개 파일, 11,233줄 추가, 51줄 삭제다.
큰 증가분에는 Cargo lock, workflow, 자동화·native 수용 fixture가 포함된다.

## 문서 위치 검증

| 파일 | 계획된 위치 | 실제 위치 | 결과 | 근거 |
|---|---|---|---|---|
| `docs/architecture/UPDATER.md` | `docs/architecture/` | `docs/architecture/UPDATER.md` | OK | 제품 runtime·target·신뢰 사슬을 공식 아키텍처 문서로 분리 |
| `docs/operations/DESKTOP_RELEASE.md` | `docs/operations/` | `docs/operations/DESKTOP_RELEASE.md` | OK | 기존 desktop release 운영 진실 원천에 updater 순서와 key 책임 연결 |
| `site/updates/index.html`, `site/release.json` | `site/` | `site/updates/index.html`, `site/release.json` | OK | 사용자 안내와 게시 상태를 실제 Pages source에 유지 |
| Task #16 계획·단계·최종 보고서 | `mydocs/` | `mydocs/plans/`, `mydocs/working/`, `mydocs/report/` | OK | 제품 문서와 내부 승인·검증 이력을 분리 |

private key, password, 복구 material과 GitHub Secret 값은 저장소·문서·로그·artifact에 기록하지
않았다. 문서에는 공개키 fingerprint와 Secret 책임만 기록했다.

## 변경 전·후 정량 비교

| 지표 | 변경 전 | 변경 후 |
|---|---|---|
| 앱 내 자동 업데이트 지원 형식 | 0 | 3 — Windows x64 MSI·NSIS, Linux x64 AppImage |
| updater native positive 수용 | 0 | 3개 형식 모두 실제 `N → N+1` 통과 |
| 공통 negative native 수용 | 0 | cross-format, signature mismatch, network failure 3종 × 3개 target |
| 최종 통합 Studio 검증 | updater/lifecycle 통합 전 | production build 및 24 files·131 tests 통과 |
| 최종 통합 automation 검증 | updater와 Linux thumbnail 목록 분리 | 합집합 472 tests 통과 |
| stable Release·tag·Pages manifest | 없음 | 없음 — 별도 승인 전 fail-closed 유지 |

## 검증 결과

| 수용 기준 | 결과 |
|---|---|
| Rust가 updater 상태·target·dirty guard·설치를 소유하고 TypeScript는 좁은 UI bridge만 사용 | OK — Stage 1·2 unit test와 최종 Studio build·131 tests 통과 |
| MSI·NSIS·AppImage가 자기 target만 선택하고 불명확한 설치는 수동 fallback | OK — target fixture와 세 형식 native positive/cross-format 수용 통과 |
| 사용자 동작 없는 다운로드·설치를 금지하고 전체 dirty session을 다운로드 전·설치 전에 재검사 | OK — Stage 2 service/UI test와 Stage 5 dirty-before/after-download 수용 통과 |
| installer와 `.sig`의 version·target·URL·signature가 완전한 inventory에서만 manifest로 투영 | OK — Stage 3 release/Pages/workflow negative 계약과 Stage 4 원격 read-back 통과 |
| 일반 artifact build는 private key 없이 유지하고 signing Secret은 updater mode에만 격리 | OK — 일반 run 33286473567과 비게시 updater run 33288874842 성공, publish job skipped |
| 세 형식의 실제 `N → N+1` 및 실패 안전성 | OK — positive run 33617676623, negative runs 33619575159·33620147777·33620606595 성공 |
| test-only release/tag 정리와 stable 표면 보존 | OK — test release·matching remote tag 0개, stable release/tag/manifest 미생성 |
| 최신 `devel`과 통합 후 회귀 없음 | OK — merge source `3c37a7044c6a7ff9b99cc304e998057da8c23ec5`에서 Cargo locked metadata, Studio build·131 tests, automation 472 tests, 관련 workflow actionlint와 `git diff --check` 통과 |

macOS host에서는 저장소 지원 정책에 따라 desktop Rust build·test나 Tauri build를 실행하지 않았다.
Windows/Linux native build와 설치 수용은 위 exact-SHA GitHub Actions run에서 수행했다. 최종
`devel` 통합은 updater native 경계를 변경하지 않아 이미 통과한 장시간 N→N+1 원격 run을 반복하지
않고, 충돌 지점에 직접 관련된 최소 검증만 다시 실행했다.

### 단계별 검증 결과

- Stage 1: [`task_m010_16_stage1.md`](../working/task_m010_16_stage1.md) — 신뢰·target·상태 계약과 fail-closed 판별 확정.
- Stage 2: [`task_m010_16_stage2.md`](../working/task_m010_16_stage2.md) — Rust updater service, 두 번의 dirty guard와 사용자 주도 UI 확정.
- Stage 3: [`task_m010_16_stage3.md`](../working/task_m010_16_stage3.md) — 서명 artifact inventory, manifest와 Pages 게시 gate 확정.
- Stage 4: [`task_m010_16_stage4.md`](../working/task_m010_16_stage4.md) — production 공개키·Secret 경계, 일반/서명 exact-SHA Windows/Linux build와 read-back 통과.
- Stage 5: [`task_m010_16_stage5.md`](../working/task_m010_16_stage5.md) — MSI·NSIS·AppImage positive 및 세 negative native 수용, 시험 부산물 정리 완료.

## 잔여 위험과 후속 작업

### 잔여 위험

- production stable release, tag, `site/release.json` 게시 전환과 canonical Pages
  `updater/stable.json`은 아직 없다. 현재 사용자 설치본에 updater가 활성화됐다고 안내하면 안 된다.
- Windows Authenticode 코드 서명은 updater Minisign 서명과 별도이며 이번 Task 범위가 아니다.
- Linux DEB·RPM, Linux arm64, read-only AppImage와 비-AppImage 실행은 자동 업데이트 대상이 아니며
  업데이트 페이지의 수동 설치 경로를 사용한다.
- Actions 수용 artifact는 retention 대상이다. run ID와 digest 근거는 보존했지만 archive 자체는
  영구 기록이 아니다.
- production key 유실·rotation 절차는 문서로 고정했으나 실제 rotation drill은 수행하지 않았다.

### 후속 작업 후보

- 첫 공개 release Task #9에서 checkpoint E 승인을 받은 뒤 단일 exact source로 immutable MSI·NSIS·AppImage와 `.sig`를 게시하고 원격 read-back한다.
- 같은 inventory를 반영한 release data PR을 `devel`에 병합한 뒤 exact merge SHA로 Pages를 배포하고 canonical manifest를 public read-back한다.
- 공개 candidate에서 세 형식의 production `N → N+1`을 최종 확인한 뒤에만 updater 활성화를 선언한다.
- Windows Authenticode와 Linux package repository가 필요하면 updater 신뢰 사슬과 분리된 별도 Issue로 진행한다.

## 작업지시자 승인 요청

- 최종 보고서와 수용 기준 검증 결과를 승인하면 `publish/task16` push와 `devel` 대상 PR 검토·병합 절차로 진행한다.
