# Task #16 Stage 2 보고서 — updater service와 문서 보호 UI

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 2

## 단계 목적

Stage 1에서 고정한 updater 상태·설치 형식 판별 계약을 실제 Tauri updater backend와 Studio UI에
연결한다. release updater 설정이 있는 지원 설치 형식에서만 시작 확인을 수행하고, 사용자의 명시적
버튼 조작만 check·download/install·restart 명령을 호출하게 한다. download와 install 사이에 native
문서 세션의 dirty 상태를 다시 확인해 편집 중 문서를 보호하며, 일반 build와 지원 밖 설치는 수동
다운로드로 fail-closed 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/updater/service.rs` | backend/package/event trait, operation mutex, check·metadata·failure 계약을 구현 |
| `apps/desktop/src-tauri/src/updater/service/apply.rs` | download/install 분리, 두 번의 dirty guard, 단조 progress와 AppImage 재시작 상태를 구현 |
| `apps/desktop/src-tauri/src/updater/service/native.rs` | `tauri-plugin-updater`의 check·verified download·install을 service trait 뒤에 연결 |
| `apps/desktop/src-tauri/src/updater/service_tests.rs` | lifecycle, progress, dirty 재시도, cross-target, mutex, fallback·failure mock fixture 추가 |
| `apps/desktop/src-tauri/src/updater/commands.rs` | release 설정 gate, startup check, 네 command, 전체 webview snapshot event와 재시작 연결 |
| `apps/desktop/src-tauri/src/updater/mod.rs` | service·commands와 분리된 service test module 등록 |
| `apps/desktop/src-tauri/Cargo.toml` | Windows/Linux target에 `tauri-plugin-updater 2.10.1`, 공통 `semver` 직접 의존성 추가 |
| `apps/desktop/src-tauri/Cargo.lock` | updater plugin과 signature·HTTPS 설치 의존성을 lockfile에 고정 |
| `apps/desktop/src-tauri/src/lib.rs` | updater setup과 get/check/apply/restart command 등록 |
| `apps/desktop/src-tauri/src/state.rs` | updater command가 모든 문서 세션의 dirty 상태를 조회하는 `AppState` adapter 추가 |
| `apps/studio-host/src/core/desktop-updater.ts` | listener-before-snapshot controller, stale progress 차단, button-only invoke와 Tauri bridge 추가 |
| `apps/studio-host/src/core/desktop-updater.test.ts` | startup 무방해, manual result, progress, dirty retry, button-only, fallback·retry 순서 검증 추가 |
| `apps/studio-host/src/core/desktop-events.ts` | desktop event 초기화에 updater controller를 연결하되 실패가 편집기 setup을 막지 않게 처리 |
| `apps/studio-host/src/core/desktop-events.test.ts` | browser 무동작과 Tauri updater 초기화 전달을 검증 |
| `apps/studio-host/src/ui/update-dialog.ts` | 상태·진행률·release note·수동 링크와 명시 action button만 가진 독립 dialog 추가 |
| `apps/studio-host/src/ui/about-dialog.ts` | Tauri 제품 정보에 “업데이트 확인…” 진입점 추가 |
| `apps/studio-host/src/style.css` | updater dialog와 제품 정보 진입점의 product-owned style 추가 |
| `mydocs/plans/task_m010_16_impl.md` | 300 LOC 상한을 지키는 service apply·native·test 분리 파일을 Stage 2 목록에 명시 |
| `mydocs/orders/20260830.md` | Task #16을 Stage 2 완료·Stage 3 승인 대기 상태로 갱신 |

역할별 주요 source는 `service.rs` 296 LOC, `service/apply.rs` 123 LOC,
`service/native.rs` 84 LOC, `service_tests.rs` 243 LOC, `desktop-updater.ts` 211 LOC,
`update-dialog.ts` 151 LOC로 구현계획서의 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이다. 기존 편집·저장·인쇄 command와 desktop event 흐름은 보존했다. updater 초기화 실패는
기존 desktop event 등록을 막지 않으며, Tauri가 아닌 browser runtime에는 side effect가 없다. base
config, key, GitHub Secrets, workflow, release와 Pages에는 updater 활성 설정을 추가하지 않았으므로
현 단계의 개발/일반 artifact는 네트워크 확인이나 private key 없이 수동 다운로드 snapshot만 제공한다.

## 검증 결과

실행 명령:

```bash
pnpm run test:studio
pnpm run build:studio
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — Studio `24` test files, `111` tests, `111` pass, `0` fail.
- OK — TypeScript compile과 Vite production build 완료. 기존 CanvasKit externalization·chunk size 안내만
  출력됐으며 build exit code는 `0`이다.
- OK — `Product boundary check passed (311 files scanned).`
- OK — `git diff --check` 출력 없음.
- 보조 정적 점검 OK — 변경 Rust 파일 `cargo fmt --check`, 역할별 source 300 LOC 이하.
- 계획된 이월 — Rust mock test와 native updater compile/test는 macOS host에서 실행하지 않았다.
  구현계획서대로 Stage 4 Windows/Linux exact-SHA native gate에서 누적 검증한다.

## 잔여 위험

- `tauri-plugin-updater 2.10.1` native backend와 mock test는 아직 Windows/Linux compiler를 통과하지
  않았다. API·Send/Sync·installer 동작 위험은 Stage 4 exact-SHA gate까지 남는다.
- 실제 public key와 HTTPS endpoint가 아직 없으므로 자동 확인은 의도적으로 비활성이다. key와 release
  overlay가 승인되는 Stage 4 전에는 수동 다운로드 fallback만 확인할 수 있다.
- MSI·NSIS 설치 시 프로세스 종료, AppImage 교체·재시작, 실제 dirty 전환과 signature 변조 수용은
  Stage 5의 `N → N+1` 환경 검증이 필요하다.

## 다음 단계 영향

- Stage 3의 inventory와 manifest는 `windows-x86_64-msi`, `windows-x86_64-nsis`,
  `linux-x86_64-appimage` target과 각각의 허용 suffix를 그대로 사용해야 한다.
- manifest URL은 HTTPS여야 하며 remote version은 현재 SemVer보다 높고 asset path가 현재 설치 형식과
  일치해야 Stage 2 service가 available로 전환한다.
- Stage 3은 source-side inventory·manifest·workflow gate만 구현하고, production key 생성, Secret 등록,
  workflow 실행, release/Pages 게시는 계속 수행하지 않는다.

## 승인 요청

- Stage 2 산출물과 검증 결과를 승인하면 Stage 3 서명 artifact·Pages manifest gate로 진행한다.
