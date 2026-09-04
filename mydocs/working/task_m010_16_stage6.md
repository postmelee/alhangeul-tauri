# Task #16 Stage 6 완료 보고서

GitHub Issue: [#16](https://github.com/postmelee/alhangeul-tauri/issues/16)
구현계획서: [`task_m010_16_impl.md`](../plans/task_m010_16_impl.md)
Stage: 6

## 단계 목적

PR #53 리뷰에서 확인된 수동 다운로드 막힘, Linux AppImage 실효 쓰기 권한 오판과 release 파일명
계약 차이를 merge 전에 보정한다. 기존 updater 신뢰 사슬과 게시 gate는 유지하고 stable release, tag,
Pages deploy, production manifest 게시와 N→N+1 후보 재생성은 수행하지 않는다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `apps/desktop/src-tauri/src/updater/commands.rs`, `src/lib.rs` | 인자를 받지 않고 canonical 업데이트 페이지만 기본 브라우저로 여는 native command 등록 |
| `apps/studio-host/src/core/desktop-updater.ts`, `src/ui/update-dialog.ts` | anchor 대신 native command를 호출하고 blocker·check·download·install 오류에서 수동 경로 제공 |
| `apps/studio-host/src/core/desktop-updater.test.ts` | 버튼만 native command를 실행하고 오류 상태가 수동 fallback을 노출하는 계약 고정 |
| `apps/desktop/src-tauri/src/updater/target/native.rs`, `Cargo.toml`, `Cargo.lock` | Linux AppImage와 부모 directory를 effective-ID `W_OK`로 판정하고 실제 filesystem test 추가 |
| `apps/desktop/src-tauri/src/updater/target.rs` | 운영 탐색에서 거부하는 32-bit registry view의 음성 테스트 용도를 명시 |
| `scripts/updater/artifact-verifier.mjs`, `tests/updater-*.test.mjs` 외 | MSI·NSIS·AppImage의 runtime과 동일한 exact basename 계약 및 locale drift 음성 테스트 추가 |
| `apps/desktop/src-tauri/src/updater/service_tests.rs` | 다운로드 전 dirty 상태에서 backend download가 호출되지 않는 경로를 별도 검증 |
| `scripts/updater/release-config.mjs`, `package.json` | workflow에서 사용하지 않는 release overlay 생성기·script·전용 test 제거 |
| `scripts/updater/acceptance-scenario.mjs`, `src/window_geometry.rs` | 독립 expected-path 변환과 main-thread 비호출 전제를 주석으로 고정 |
| `docs/architecture/UPDATER.md`, `docs/operations/DESKTOP_RELEASE.md` | 실제 수동 fallback·실효 권한·설치 실패 경계를 기존 공식 문서에서 최소 보정 |

## 본문 변경 정도 / 본문 무손실 여부

HWP/HWPX 편집 본문과 저장 형식, updater signature 검증, release publish 권한과 Pages fail-closed
경계는 변경하지 않았다. 수동 경로는 외부 URL을 받지 않는 native command로 제한했고, Linux target
판정은 permission bit 존재 여부에서 현재 process의 실효 접근 권한 판정으로 강화했다. 기존 Stage 5
N→N+1 artifact·manifest·download·install 흐름은 변경하지 않았다.

## 검증 결과

실행 명령:

```bash
pnpm run test:studio
pnpm run build:studio
node --test tests/updater-release.test.mjs
pnpm run test:automation
cargo metadata --manifest-path apps/desktop/src-tauri/Cargo.toml \
  --locked --no-deps --format-version 1
cargo fmt --manifest-path apps/desktop/src-tauri/Cargo.toml -- --check
git diff --check
```

결과:

- OK — Studio 24 files·132 tests와 production build 통과.
- OK — exact release filename 계약 17 tests, 전체 automation 472 tests 통과.
- OK — Cargo locked metadata, Rust formatting과 diff 위생 통과.
- OK — 최종 exact source `50e91247841b47d5dc50773c0a2584720829dbdc`의 비게시
  [artifact run 33734252261](https://github.com/postmelee/alhangeul-tauri/actions/runs/33734252261) 성공.
  Windows x64 job 100581043574, Linux x64 job 100581043336, Linux arm64 job 100581043507의
  desktop test·Clippy·Tauri bundle이 모두 통과했고 Windows installer smoke job 100598691744에서
  MSI·NSIS 설치·제거가 통과했다. updater build·native acceptance·release publish job은 모두 skipped다.
- OK — 최종 일반 artifact identity:
  - Windows x64 artifact 9886955173,
    `sha256:ae7935ab9be8f09d8c09a14fa88bc6ca03b89227800b732059645744fe939fae`
  - Linux x64 artifact 9885888489,
    `sha256:9c0bd35ff08c27b8c198a03aae32b18512a224240af950085f165891a8b8633e`
  - Linux arm64 artifact 9885596120,
    `sha256:cf4d835248cf4953372d8ac3b59ea3f1014916023c1259f075f0671c46137f62`
  - Windows smoke artifact 9887296782,
    `sha256:16f0d84c75772233220fb6743bcbd54f0f674f0b86d4de8826bc7ee0dc74da83`
- 원격 correction loop — run 33626268077은 Linux-only borrow-after-move를 발견해 Stage 6.2에서
  계산 순서를 보정했고, run 33627951699는 Windows-only `Registry32` dead-code Clippy를 발견해
  Stage 6.3에서 음성 경계 의도를 명시했다. 두 원인을 모두 바꾼 뒤 최종 run에서 재발하지 않았다.
- 입력 오류 — 존재하지 않는 SHA를 입력한 run 33627742759는 checkout 실패했고 run 33734203726은
  즉시 취소했다. 둘 다 source 검증 결과로 사용하지 않았다.
- 기존 Stage 5 N→N+1 positive·negative run은 runtime artifact·manifest·download·install 흐름이
  바뀌지 않았으므로 계획대로 반복하지 않았다.

macOS host에서는 저장소 지원 정책에 따라 desktop Rust build·test와 Tauri build를 실행하지 않았다.

## 잔여 위험

- stable GitHub Release·tag와 Pages `updater/stable.json`은 아직 없으며 updater가 공개 활성화됐다고
  안내하면 안 된다.
- Linux `W_OK` 판정과 실제 install 사이의 filesystem 상태 변화는 가능하다. install 실패 뒤에도
  canonical 수동 다운로드 경로를 제공해 막다른 상태를 피한다.
- 외부 브라우저 command는 Windows/Linux compile·Clippy와 TypeScript dispatch 계약으로 검증했다.
  실제 OS 기본 브라우저 UI 자동화는 이번 비게시 artifact run 범위에 포함하지 않았다.
- Actions artifact는 retention 대상이며 위 ID와 digest는 identity 근거이지 영구 archive가 아니다.

## 다음 단계 영향

- PR #53 리뷰 지적에 대한 보정과 exact-SHA Windows/Linux 검증은 완료됐다. 다음 작업은 Stage 6과
  최종 보고서를 PR 본문·리뷰 답변에 연결하고 merge 승인을 받는 것이다.
- 첫 stable release와 Pages updater 활성화는 Task #9의 별도 checkpoint와 문서 규칙에 따라 진행한다.

## 승인 요청

- Stage 6 산출물과 검증 결과를 승인하면 PR #53의 최종 검토·병합 절차로 진행한다.
