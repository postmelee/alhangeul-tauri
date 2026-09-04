# Task #16 Stage 1 보고서 — updater 상태와 native target 계약

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 1

## 단계 목적

Tauri updater plugin, network, UI와 signing key를 활성화하기 전에 Rust가 소유할 updater 상태
계약과 설치 형식 판별 경계를 고정한다. Windows x64 MSI·NSIS와 Linux x64 AppImage만 자동
업데이트 후보로 허용하고, 설치 증거가 불명확하거나 교체할 수 없는 실행은 수동 다운로드로
fail-closed 한다. 모든 build에서 native 문서 세션의 dirty 상태를 조회할 수 있게 한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/updater/mod.rs` | updater model·target module과 분리된 test module을 등록 |
| `apps/desktop/src-tauri/src/updater/model.rs` | serde snapshot, 상태 전이, 진행률, blocker·failure와 세 custom target의 artifact allowlist 추가 |
| `apps/desktop/src-tauri/src/updater/model_tests.rs` | 직렬화 계약, 정상·잘못된 전이, dirty blocker, target별 URL suffix fixture 추가 |
| `apps/desktop/src-tauri/src/updater/target.rs` | injectable probe, Windows/Linux evidence, `Supported`·`ManualOnly` 판별 규칙 추가 |
| `apps/desktop/src-tauri/src/updater/target/native.rs` | Windows 32/64-bit registry view와 Linux AppImage env/filesystem production adapter 추가 |
| `apps/desktop/src-tauri/src/updater/target_tests.rs` | MSI·NSIS, registry 누락·충돌·path mismatch, AppImage·read-only·env mismatch, DEB/RPM·arm64 fixture 추가 |
| `apps/desktop/src-tauri/Cargo.toml` | Windows target에만 `winreg 0.55` 직접 의존성 추가 |
| `apps/desktop/src-tauri/Cargo.lock` | desktop package의 기존 lock 내 `winreg` 직접 의존 관계 기록 |
| `apps/desktop/src-tauri/src/lib.rs` | updater module 등록. plugin·command·startup check는 아직 미등록 |
| `apps/desktop/src-tauri/src/state.rs` | `has_dirty_sessions`의 release-only cfg 제거와 clean·dirty unit assertion 추가 |
| `mydocs/plans/task_m010_16_impl.md` | 승인된 300 LOC 상한을 지키기 위한 test·native adapter 분리 파일을 Stage 1 목록에 명시 |
| `mydocs/orders/20260830.md` | Task #16을 Stage 1 완료·Stage 2 승인 대기 상태로 갱신 |

역할별 주요 source는 `model.rs` 300 LOC, `target.rs` 299 LOC,
`target/native.rs` 163 LOC로 구현계획서의 권장 상한 안에 있다.

## 본문 변경 정도 / 본문 무손실 여부

코드 작업이다. 기존 문서 편집, UI, installer build, release와 Pages 동작은 변경하지 않았다.
updater module은 상태·판별 계약만 등록했으며 plugin, endpoint, signature, command와 background
network를 추가하지 않았다. 기존 `has_dirty_sessions` 구현 본문은 보존하고 debug build에서도
호출할 수 있도록 cfg만 제거했다. 구현계획서는 승인된 범위 안의 파일 분리만 반영했다.

## 검증 결과

실행 명령:

```bash
pnpm run check:product-boundary
pnpm run test:automation
git diff --check
```

결과:

- OK — `Product boundary check passed (303 files scanned).`
- OK — automation `292` tests, `292` pass, `0` fail.
- OK — `git diff --check` 출력 없음.
- 보조 정적 점검 OK — 변경 Rust 파일 `rustfmt --check`, trailing whitespace 검사 통과.
- 계획된 이월 — macOS host에서 desktop Rust compile/test·clippy와 Tauri build는 실행하지 않았다.
  구현계획서대로 Stage 4 Windows/Linux exact-SHA native gate에서 누적 검증한다.

## 잔여 위험

- Windows `winreg` production adapter와 Linux filesystem adapter는 아직 지원 OS에서 compile·fixture
  실행하지 않았다. Stage 4 native gate 전까지 compile/API drift 위험이 남는다.
- 실제 MSI·NSIS uninstall registry 조합과 writable/read-only AppImage 실행 증거는 순수 fixture로만
  판정했다. 실제 `N → N+1` 설치 수용은 승인 checkpoint를 거쳐 Stage 5에서 확인한다.
- 현재 Stage에는 updater plugin과 service가 없으므로 자동 확인·download·install은 동작하지 않는다.

## 다음 단계 영향

- Stage 2는 `UpdaterState`, `UpdaterTargetProbe`, `TargetEligibility`를 service와 네 custom command에
  연결하고, webview가 plugin을 직접 호출하지 않도록 Rust가 operation mutex와 event를 소유해야 한다.
- `updater_apply`는 download 시작 직전과 install 직전에 `has_dirty_sessions`를 다시 검사해야 한다.
- `UpdaterTarget::accepts_asset_path`를 signature 검증 전후 metadata URL kind gate에 재사용해야 한다.
- Stage 2에서도 key 생성, GitHub Secret 등록, workflow 실행과 release·Pages 게시는 범위 밖이다.

## 승인 요청

- Stage 1 산출물과 검증 결과를 승인하면 Stage 2 updater service·사용자 UI 구현으로 진행한다.
