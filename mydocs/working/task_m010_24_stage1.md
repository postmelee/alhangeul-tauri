# Task #24 Stage 1 보고서 — candidate 채택과 provenance·source diff 감사

GitHub Issue: [#24](https://github.com/postmelee/alhangeul-tauri/issues/24)
구현계획서: [`task_m010_24_impl.md`](../plans/task_m010_24_impl.md)
Stage: 1

## 단계 목적

Task #23의 실제 자동 동기화가 만든 PR #32를 immutable input으로 다시 검증하고, 원본 bot commit을 `local/task24`의 merge parent로 채택한다. 동시에 `rhwp v0.8.2..v0.8.4` source·release 변화와 Alhangeul의 12개 Tauri leaf adapter 접점을 감사해 Stage 2의 호환성 검증 우선순위를 확정한다.

## 산출물

| 파일 | 변경 요약 |
|---|---|
| `third_party/rhwp` | 읽기 전용 source gitlink를 `496333b27d21ddb9114ba9ae340bcb895870c9a7`로 갱신 |
| `apps/desktop/src-tauri/Cargo.lock` | v0.8.4 native core와 암호 문서 지원 의존성을 포함한 lock 갱신 |
| `apps/studio-host/vendor/rhwp-core/{package.json,rhwp.js,rhwp.d.ts,rhwp_bg.wasm,rhwp_bg.wasm.d.ts}` | exact v0.8.4 source에서 `wasm-pack 0.15.0`으로 생성한 WASM package 5개 갱신 |
| `rhwp-core.lock` | release tag·resolved commit·source Cargo lock·관리 artifact 6개의 크기와 SHA-256 갱신 |
| `README.md`, `docs/DEVELOPMENT.md`, `docs/architecture/UPSTREAM.md` | current pin과 재현 명령을 v0.8.4로 원자 갱신 |
| `tests/rhwp-pin.test.mjs`, `apps/studio-host/src/core/upstream-boundary.test.ts` | 실제 repository pin 기대값을 v0.8.4로 정렬 |
| `mydocs/working/task_m010_24_stage1.md` | candidate 불변성, source diff, adapter 영향과 Stage 2 집중 검증 기록 |

candidate의 repository 변경은 위 13개 allowlist 경로뿐이다. Stage 1에서 candidate 생성물을 재작성하거나 제품 adapter source를 수정하지 않았다.

## 본문 변경 정도 / 본문 무손실 여부

- candidate `b3712714f6733aa75ff50dd346b89850136b5458`을 cherry-pick·squash·rebase하지 않고 Stage 1 merge commit의 두 번째 parent로 보존한다.
- `third_party/rhwp`는 detached exact commit으로 동기화했으며 source 파일을 직접 수정하지 않았다.
- README·DEVELOPMENT·UPSTREAM은 Task #23의 관리 marker가 허용한 current pin과 재현 명령만 v0.8.2에서 v0.8.4로 바꾼다. 과거 Task 증적과 `v0.8.2 known issue` 본문은 자동 치환하지 않았다.
- generated JS·declaration·WASM은 수동 편집하지 않았다. `rhwp-core.lock`의 source commit, Cargo lock hash, tool version, 파일 크기·SHA-256과 verifier를 생성물 진실 원천으로 사용한다.

## candidate 불변성 결과

- PR #32: open draft, base `devel`, head `automation/rhwp-v0.8.4-full-sync`, `MERGEABLE`.
- head SHA: `b3712714f6733aa75ff50dd346b89850136b5458`; 단일 bot commit이며 parent는 task-start 기준 `origin/devel` `070eefa0828a907849ce4a059e57bca026c91221`이다.
- PR과 local Git의 changed path가 수행계획서의 13개 allowlist와 정확히 일치했다.
- 실제 sync run [31679766726](https://github.com/postmelee/alhangeul-tauri/actions/runs/31679766726), candidate exact-SHA CI [31680791369](https://github.com/postmelee/alhangeul-tauri/actions/runs/31680791369), 멱등성 run [31681439619](https://github.com/postmelee/alhangeul-tauri/actions/runs/31681439619)은 모두 `success`다.
- 반복 run은 resolve job만 수행하고 publish job을 skip했다. candidate는 한 개이며 head SHA가 바뀌지 않았다.
- repository variable `ALHANGEUL_UPSTREAM_SYNC_ENABLED`는 merge 직전 read-back에서도 `false`였다.
- `git merge --no-ff --no-commit b3712714...`은 conflict 없이 완료됐고 submodule working tree를 exact target으로 동기화했다.

## provenance와 release 결과

- `pnpm run fetch:rhwp-pin-tag`가 공식 upstream tag `v0.8.4`를 fetch했고 `v0.8.4^{commit}`과 submodule HEAD가 모두 `496333b27d21ddb9114ba9ae340bcb895870c9a7`이었다.
- [v0.8.3 release](https://github.com/edwardkim/rhwp/releases/tag/v0.8.3)는 v0.8.2 이후 암호 HWP/HWPX, 중첩 표 조판·편집, PUA 글리프, 압축 해제 상한과 렌더 성능 개선을 포함한 누적 PATCH다.
- [v0.8.4 release](https://github.com/edwardkim/rhwp/releases/tag/v0.8.4)는 v0.8.3에서 의도하지 않게 활성화된 추가 배포 채널을 철회하고 Studio·브라우저 확장 version을 정렬한 Stable patch다. Alhangeul은 upstream 배포 채널을 상속하지 않고 source/core/Studio만 pin하므로 채널 철회 자체가 제품 packaging을 제거하지 않는다.
- local shallow source에서 두 exact object의 diff는 4,060 files, 703,052 insertions, 22,208 deletions이다. 제품 영향 중심으로 `src/` 219개, `rhwp-studio/` 160개, upstream `tests/` 244개가 바뀌었다. 문서·도구·upstream CI 대량 변경은 Alhangeul candidate allowlist에 복사되지 않는다.
- `rhwp-core.lock`은 source Cargo lock SHA-256과 6개 관리 artifact를 새 hash로 고정했다. WASM binary는 7,189,445 bytes에서 8,038,570 bytes로 증가했고 verifier가 모든 크기·hash를 통과했다.
- native Cargo lock에는 `rhwp 0.8.4`와 AES/CBC/PBKDF2/HMAC/암호화 관련 의존성, parser·serializer 변화가 반영됐다. 실제 Windows/Linux native compile·bundle 판정은 Stage 3에 남긴다.

## adapter 영향 감사

### 보존이 확인된 경계

- upstream `print-pages.ts`, `print-surface.ts`, `embed/runtime.ts`, `embed/rpc-router.ts`는 v0.8.2와 v0.8.4 사이에 source diff가 없다.
- upstream `file:print`와 `file:print-to-pdf` ID, `renderPageSvgWithProfile(i, 'print')` 기반 페이지 생성은 유지된다. old/new file command ID 집합도 같다.
- Tauri가 override하는 `file:new-doc`, `open`, `open-recent`, `save`, `save-as`, `save-as-hwp`, `save-as-hwpx`, `print-to-pdf`, `print` 9개 ID가 v0.8.4에 모두 존재한다.
- embed handler `loadFile`, `pageCount`, `getPageSvg`, `exportHwp`, `exportHwpx`, `notifySaved`의 이름·signature가 유지돼 `desktop-runtime` Pick 경계가 깨지지 않는다.
- local direct print가 쓰는 `createPrintSurface`, `createPrintPage`, `buildPrintStyleText`, `appendSvgPage`, `waitForPrintSurfaceReady`, `renderPageSvgWithProfile`, `getPageInfo`와 pagination flush API가 모두 유지된다.
- font-policy subclass가 override하는 `findOrCreateFontId`와 `findOrCreateFontIdForLang`, plain HWP/HWPX exporter가 유지된다. local `font-loader.ts`는 upstream 재수출 leaf이고 upstream `local-fonts.ts`는 이 release diff에서 바뀌지 않았다.
- `CommandDispatcher` upstream source는 바뀌지 않았고 새 required `CommandServices.gotoPage`는 upstream `main.ts`가 services 생성 시 제공하므로 local subclass constructor와 양립한다.

### Stage 2 집중 검증 대상

1. **암호 문서 저장 의미**: v0.8.4는 `loadDocumentWithPassword`, `requiresPasswordForSave`, password exporter와 `DocumentExport` report API를 추가했다. native `loadFile`은 unchanged embed handler를 통해 upstream `loadBytes`로 들어가므로 암호 입력 UI 경로를 상속하지만, Tauri native 저장 override는 현재 plain `exportHwp/exportHwpx`만 호출한다. 암호 문서를 연 뒤 저장할 때 암호 유지 또는 명시적 안전 거부가 보장되는지 focused contract가 필요하다.
2. **content-loss 보고**: upstream browser 저장은 `export*WithReport`와 `persistWithContentLoss`를 사용해 손실 경고를 제공한다. native 저장은 앱이 소유한 원자 저장을 위해 plain embed exporter를 호출하므로 새 경고가 우회되는지, native 저장 검증과 결합할 최소 bridge가 필요한지 판정한다.
3. **파일 열기·저장 UX**: upstream file picker fallback, save-as dialog, recent-open과 password dialog가 바뀌었다. Tauri open/save는 native override지만 drag-in·upstream load 초기화·dialog는 전체 Studio를 상속하므로 replacement guard, cancel, recent와 dirty state 회귀를 확인한다.
4. **렌더·font·viewport**: page renderer/pagination, CanvasKit font resource/glyph run, flow image cache, virtual scroll horizontal pan과 toolbar line-spacing sync가 바뀌었다. local font leaf와 initial centering·한글 표시·toolbar mode sync가 이 새 surface를 가리지 않는지 집중 test와 Stage 4·5 GUI로 판정한다.
5. **native dependency 증가**: 암호화 parser·serializer 의존성이 Windows/Linux Tauri build와 installer 크기·inventory에 미치는 영향은 Stage 3 exact-SHA matrix로 확인한다.

## 검증 결과

실행 명령:

```bash
git rev-parse origin/devel \
  origin/automation/rhwp-v0.8.4-full-sync^ \
  origin/automation/rhwp-v0.8.4-full-sync
git diff --name-status \
  origin/devel...b3712714f6733aa75ff50dd346b89850136b5458
pnpm run fetch:rhwp-pin-tag
git -C third_party/rhwp rev-parse 'v0.8.4^{commit}' HEAD
git -C third_party/rhwp diff --stat \
  9b16aa9e23f476e2b335d7c029fc9f24a199d63c..496333b27d21ddb9114ba9ae340bcb895870c9a7
pnpm run check:rhwp-pin
pnpm run check:product-boundary
git diff --check
```

결과:

- OK — local/remote candidate head·parent·단일 commit·13개 allowlist 일치, merge conflict 0개
- OK — upstream tag와 submodule HEAD: `496333b27d21ddb9114ba9ae340bcb895870c9a7`
- OK — `rhwp pin verified: v0.8.4 (...), 6 artifacts`
- OK — product boundary: 197 files scanned
- OK — print/embed와 12개 허용 leaf adapter의 핵심 import·command symbol 유지 확인
- OK — `git diff --check` 경고 없음
- 미실행 — 전체 Studio test/build와 desktop Rust·Clippy는 Stage 2, native Tauri build는 Stage 3에 둔다.

## 잔여 위험

- 암호 문서 저장과 content-loss report를 native 저장 override가 어떻게 상속할지 아직 판정하지 않았다. Stage 2에서 source contract와 focused test로 먼저 확정해야 한다.
- v0.8.4 source 폭이 크므로 symbol 존재와 platform-neutral test만으로 렌더·font·viewport GUI 동작을 보장하지 않는다. Windows/Linux 실제 WebView 수용은 Stage 4·5까지 필수다.
- 기존 `v0.8.2 known issue` 두 건이 v0.8.4에서 해결됐거나 그대로 재현되는지는 아직 확인하지 않았다. 이름만 새 release로 치환하지 않고 같은 fixture·실패 지점으로 재분류한다.
- native Cargo dependency 증가가 bundle 크기와 설치 동작에 미치는 영향은 Stage 3 이전에는 미확정이다.

## 다음 단계 영향

- Stage 2는 암호 문서 저장 의미와 content-loss report bridge를 가장 먼저 조사한다. 안전한 계약을 test로 고정하기 전에는 native save가 새 upstream 기능을 완전히 상속한다고 주장하지 않는다.
- 기존 print/embed primitive와 file command ID는 유지되므로 local adapter를 재작성하지 않고 현재 focused test를 v0.8.4에서 실행한다.
- 렌더·font·toolbar·virtual scroll 변화는 platform-neutral test를 통과해도 Stage 4·5의 중앙 정렬, 한글, PDF·인쇄 GUI 항목에서 다시 확인한다.
- Stage 2에서 실제 회귀가 없으면 제품 코드를 수정하지 않고 검증·보고만 커밋한다. 새 adapter owner나 upstream source 보정이 필요하면 먼저 구현계획 변경 승인을 요청한다.

## 승인 요청

- Stage 1 candidate 통합, provenance·source diff 감사와 집중 검증 목록을 승인하면 Stage 2의 adapter 호환성과 플랫폼 중립 수용으로 진행한다.
