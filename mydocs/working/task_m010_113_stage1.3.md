# Task #113 Stage 1.3 — 후보 pin 참조와 게시 전 자동화 gate 보정

GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
구현계획서: [`task_m010_113_impl.md`](../plans/task_m010_113_impl.md)
Stage: 1.3 (구현·로컬 검증, 원격 수용은 선행 PR에서 확인)

## 단계 목적

생성된 v0.8.7 후보의 required failure 원인인 thumbnail fixture pin 참조 2개를 정합화하고,
미래 후보는 commit 이후 target automation까지 성공해야 게시하도록 보완한다.
2026-10-07 “그렇게 진행해줘”가 후보 통합·소스·검증·일반 PR 통합·#115 정리를 승인했다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| bot commit `5ffd882fd768683f508ce8daaad4e0aaf4b1c482` | upstream v0.8.7 source/4 native lock/fresh WASM/provenance 생성물을 fast-forward로 보존 |
| `scripts/linux-thumbnail-core-fixtures.mjs`, `scripts/windows-thumbnail-fixtures.json` | RHWP_SHA/rhwpSha 두 current pin만 exact v0.8.7 commit으로 정합화 |
| `scripts/update-rhwp-managed-references.mjs`, `verify-rhwp-sync-changes.mjs` | 7개 관리 경로·19개 explicit allowlist로 누락 방지 |
| `.github/workflows/rhwp-upstream-sync.yml`, `scripts/rhwp-sync-publisher.sh` | local commit → committed pin/automation → 동일 HEAD·remote 부재 확인 후 non-force 게시 |
| `scripts/write-rhwp-sync-pr-body.mjs` | clean-base·post-commit automation 검증 범위를 구분 |
| `tests/rhwp-*-sync-*.test.mjs`, `rhwp-managed-references.test.mjs`, `ci-pr-acceptance.test.mjs` | 실제 게시 경로·marker 원자성·commit 전후 strict 경계 회귀 |
| `package.json` | publisher 회귀의 automation suite 등록만 추가, 제품 version 0.1.1 유지 |
| `docs/architecture/UPSTREAM.md` | 승인된 기존 architecture 위치의 관리 참조·검증 순서 갱신 |
| `mydocs/plans/task_m010_113*.md`, `mydocs/orders/20261007.md` | 실제 실패 근거·승인·구현·진행 상태 |

workflow 281 LOC, publisher 75 LOC이며 신규 테스트 101 LOC다. 함수/파일 상한을 지킨다.

## 본문 변경 정도 / 본문 무손실 여부

bot author와 commit·생성 artifact bytes를 보존했다. upstream source를 직접 수정하지 않았으며
release tag를 이동하거나 force push하지 않았다. fixture 10개 고유 파일의 exact v0.8.7 size/hash가
기존 기대값과 모두 일치해 pin 필드만 변경했다. 예산·preview 계약·실패 assertion을 완화하지 않았다.
공식 문서는 기존 관리 경계/순서만 갱신하며 historical known issue와 release 기록은 유지했다.

## 검증 결과

```bash
bash -n scripts/rhwp-sync-publisher.sh
node --test tests/rhwp-managed-references.test.mjs tests/rhwp-sync-changes.test.mjs tests/rhwp-upstream-sync-workflow.test.mjs tests/rhwp-sync-publisher.test.mjs tests/rhwp-sync-pr-body.test.mjs
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:committed-rhwp
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
```

- 집중 **43/43**, automation **1,321/1,321**, upstream **39/39**, Studio **268/268**, skip 0.
- product boundary·제품 0.1.1·release metadata·exact v0.8.7 pin/6 artifact·committed pin 통과.
- TypeScript/Vite build 성공. 기존 chunk size·browser externalization·dynamic import 경고가 남고 오류는 없다.
- 실제 workflow의 세 step과 shell publisher를 격리해 commit→검사→push/PR 순서를 확인했다.
  committed-rhwp/automation 실패, 기존 branch/remote IO/race, staging mismatch, HEAD 변경에서 게시하지 않는다.
- 단일 marker 누락/중복은 다른 관리 파일도 쓰지 않는다. fixture hash/size·historical SHA를 보존한다.
- 최초 실패한 이전 코드 위치·pre-commit 부재 assertion은 새 책임 경계에 맞춰 강화한 뒤 재검증했다.
  `/private/tmp/task113-stage13-{focused,automation,upstream,studio,build}.log`에 결과 보존.
- 원 생성 producer [37581631131](https://github.com/postmelee/alhangeul-tauri/actions/runs/37581631131)는
  v0.8.7 source/locks/WASM/allowlist·Studio·Ubuntu Rust **211** tests/Clippy에 성공했다.
  이는 bot source SHA의 근거이며 현재 PR의 Windows/Linux 전체 native/package/GUI 수용을 대신하지 않는다.

## 잔여 위험

- 원격 devel PR required는 게시 후 실제 결과를 확인한다. 전체 Stage 1 완료보고는 그 수용·정리 뒤 작성한다.
- 변경된 future writer를 다른 Stable target의 실제 positive run으로 아직 실행하지 않았다.
  현재 pin no-op과 계약 회귀는 별도로 구분한다.
- daily schedule은 default `main` workflow를 실행한다. 이번 workflow 변경의 실제 daily 적용은
  후속 승인된 main 승격 때 이뤄진다. devel 반영만으로 main writer가 바뀌었다고 주장하지 않는다.
- 제품은 여전히 0.1.1이다. title/i18n·제품 0.1.2 version·notes·Windows/Linux 전체 패키지·GUI·서명·공개는 후속 단계다.
- macOS에서 Rust/Tauri/wasm-pack을 실행하지 않았다. task의 sparse upstream cache는 cdb7 alternate를 유지한다.

## 다음 단계 영향

- 승인된 일반 devel PR의 required·리뷰·CLEAN 확인 뒤 merge한다. bot #115 source가 포함된 것을
  확인하고 superseded 후보와 불필요한 automation branch만 정리한다. #113은 OPEN 유지한다.
- 최종 devel exact pin·현재 target no-op을 확인한 뒤 전체 Stage 1 결과와 Stage 2 진입을 보고한다.

## 승인 요청

- 이 선행 PR·일반 merge·#115 정리와 현재 pin 확인은 같은 스레드에서 이미 승인됐다.
  나머지 Stage 2 이후의 명시 승인 gate는 유지한다.
