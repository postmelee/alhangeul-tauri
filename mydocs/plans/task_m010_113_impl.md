# Task #113 구현계획서 — rhwp v0.8.7 반영과 v0.1.2 전달

수행계획서: [`task_m010_113.md`](task_m010_113.md)
GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
마일스톤: M010
작성일: 2026-10-07 (Asia/Seoul)
상태: Stage 3 진행 — ff48d150 전체 native·6종 패키지·비게시 signing·설치/GUI 수용 승인

## 승인 기록과 입력

- 이슈 초안·M010·enhancement·v0.1.2 및 task-start는 같은 스레드의 첫 “진행해줘”로 승인됐다.
- 수행계획서 `e79d5ca3`의 검토와 “수행계획서 승인과 Stage 1 진입” 요청 뒤 두 번째
  “진행해줘”를 수행계획·구현계획서 작성 및 Stage 1의 명시 Action 실행·후보 검토 승인으로 기록한다.
- 이 구현계획서는 승인한 네 Stage·문서 위치·검증 범위를 구체화한다. 다음 Stage와
  미확정 exact main source·서명 ref·최종 files/notes·Release/Pages 공개는 각각 결과 기반 승인을 받는다.
- 시작 devel: `bdbf3863a573a4ce397dab8660648a082f5226ff`.
- 승인한 upstream: `v0.8.7` / `1a76570e833917d15817415a53c09ad61ab3203f`.
- old pin: `v0.8.6` / `f1f9c6ae58344ee9368996d3543f76b9345cf227`.
- Stage 1 workflow ref: 기존 기본 `main`, 시작 resolved SHA `7acff6bc5fa0a71d277cc14d94affc741cc43baa`.
  workflow는 내부에서 devel을 checkout한다. dispatch 직전 ref와 base를 재조회하고 실제 run을 고정한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 자동 후보·변경 영향 고정 | sync draft PR, pin/lock/WASM, stage1 보고 | metadata/tag, 자동 gate, required, 동일 입력 재판정, adapter diff |
| 2 | 제품 호환성·version·원문 | 최소 leaf 보정, 0.1.2, notes/미게시 기록 | focused 회귀, Node/Studio/automation, release notes |
| 3 | Windows/Linux native·패키지 수용 | 고정 후보·6종 파일·기능 증거 | full/native, 설치·문서·글꼴·출력·thumbnail, exact bytes |
| 4 | 구현 보고·릴리즈 인계 | report, notes, devel PR | 기록/원문/링크, clean tree, 실제 CI, 남은 공개 gate |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| current pin 안내 | README.md, docs/DEVELOPMENT.md, docs/architecture/UPSTREAM.md | 동일 | OK | 자동 marker만 갱신 |
| adapter 계약 | 기존 docs/architecture | 실제 계약이 바뀐 기존 문서 | OK | 필요 시 최소 수정 |
| 버전 기록·원문 | docs/releases | v0.1.2.md, v0.1.2.notes.json, README.md | OK | 기존 규격 |
| 생성 웹·배포 데이터 | site | updates/v0.1.2.html, release.json | OK | 최신 전환은 공개 read-back 뒤 |
| 계획·단계·보고 | mydocs/plans, working, report | task_m010_113{,_impl,_stageN,_report}.md | OK | 한국어 작업 추적 |
| 후보 identity | mydocs/working | task_m010_113.json | OK | 필요 시 기존 candidate schema 사용 |
| 오늘할일 | mydocs/orders | 실제 작업일 YYYYMMDD.md | OK | 완료 시각은 실제 범위 완료 때 기록 |

## Stage 1 — v0.8.7 자동 후보와 변경 영향 고정

### 산출물

- 자동 `automation/rhwp-v0.8.7-full-sync → devel` draft PR과 정확한 source SHA/run ID.
- source gitlink, native lock 4종, generated WASM/provenance 및 관리 current pin 참조.
- `mydocs/working/task_m010_113_stage1.md`, 승인 기록·오늘할일 상태.

### 변경 내용

1. Issue OPEN, public Stable metadata·Git tag commit, writer true, main/devel ref와 기존 candidate를 확인한다.
2. 실행 중인 같은 대상 run 또는 기존 PR이 있으면 재사용한다. 없을 때 다음 명시 dispatch를 한 번 한다.
3. run ID·workflow SHA·base checkout·target을 고정하고 resolve와 candidate의 필수 step을 검토한다.
4. 후보 PR을 이 채팅에 연결하고 변경 경로·source/locks/WASM의 동일 release를 확인한다.
5. PR required check의 merge candidate SHA/결과를 읽는다. Ubuntu Rust preflight·platform-neutral
   gate·allowlist의 실제 성공과 후속 native 미실행을 구분한다.
6. 동일 대상의 두 번째 dispatch로 existing_pr 판정·candidate skipped·PR 하나 유지 여부를 확인한다.
7. old/new upstream entry·host font·print/embed/menu 및 제품 leaf 소비 경계를 비교하고 Stage 2의
   호환성 필요 파일·회귀를 구체화한다. 성능·GUI를 이 단계의 조사만으로 수용하지 않는다.
8. 자동 후보가 통과한 source는 local/task113에 일반 merge로 통합한다. auto PR의 원격 merge·close는
   수행하지 않으며 문서 충돌 시 양쪽 정보를 보존한다. stage report에 후보 commit과 task commit을 구분한다.

### 검증

```bash
gh api repos/edwardkim/rhwp/releases/tags/v0.8.7
gh api repos/edwardkim/rhwp/git/ref/tags/v0.8.7
gh workflow run rhwp-upstream-sync.yml -R postmelee/alhangeul-tauri --ref main \
  -f target_tag=v0.8.7 -f dry_run=false
# 해당 dispatch run의 ID를 고정한 뒤 view/log 및 PR checks를 확인한다.
# 자동 gate와 required가 모두 통과한 뒤에만 같은 입력을 재dispatch해 existing_pr를 확인한다.
pnpm run check:rhwp-pin
git diff --check
```

자동 run은 frozen pnpm·test:automation, source/lock/WASM 생성, product boundary/version/metadata/pin,
upstream/Studio test·build, Ubuntu desktop test/Clippy, changed-path allowlist를 실행한다.
로컬에는 source를 준비하고 read-only pin verifier만 실행한다. Rust/wasm-pack/Tauri build는
Windows/Linux runner에서만 한다. PR required의 추가 Node/Studio·Windows PS 결과를 재사용한다.

실패 대응: 자동 gate가 실패하면 step·stderr·old/new source diff로 원인을 먼저 조사한다.
Stage 2 보정이 선행돼야 하는 상황이면 Stage 1 완료를 선언하지 않고 필요한 순서/범위 보정을
구체적으로 요청한다. 기존 gate를 약화하거나 입력 변경 없이 동일 run을 다시 실행하지 않는다.

### 커밋

```text
Task #113: 수행계획 승인 기록과 구현계획서 작성
Task #113 Stage 1: rhwp v0.8.7 자동 후보와 변경 영향 검증
```

첫 커밋은 구현 전 승인 기록·계획만 묶는다. Stage 1 완료 시 후보 통합 상태·보고서·오늘할일을
하나의 단계 커밋으로 묶으며 후보 자동 commit의 provenance는 일반 merge로 보존한다.

## Stage 2 — 제품 호환성·version·릴리즈 원문 정합화

### 산출물과 변경 내용

- Stage 1에서 식별한 최소 제품 adapter/bridge 보정과 실제 소비 계약의 집중 회귀.
- root/desktop package·Tauri/Cargo manifest/lock의 Alhangeul 0.1.2 version 정합화.
- `docs/releases/v0.1.2.md`, `v0.1.2.notes.json`과 기존 생성기 출력. upstream package version은 0.8.7 유지.
- 실제 완료하지 않은 native/공개/upgrade를 성공 문구로 쓰지 않는다. 현재 pin 관리 참조만 바꾸고
  release별 known issue 기록을 자동 치환하지 않는다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm run check:product-boundary
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:rhwp-pin
pnpm run check:action-pins
pnpm run test:automation
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run check:release-notes
pnpm run test:release-notes
git diff --check
```

focused 회귀와 PR required/fast 결과를 연결한다. 영향받지 않은 native negative 전체를 추가하지 않는다.

### 커밋

`Task #113 Stage 2: v0.8.7 제품 호환성과 v0.1.2 릴리즈 원문 정합화`

## Stage 3 — Windows/Linux native·문서·패키지 수용

### 산출물과 변경 내용

- 승인된 exact source/ref, 같은 workflow/checkout SHA의 일반 native producer와 비게시 signed producer.
- Windows x64 NSIS/MSI, Linux x64 AppImage/DEB/RPM, Linux arm64 DEB candidate identity와 수용 증거.
- Windows WebView2, Ubuntu 22.04 x64 X11/WebKitGTK, Fedora x64 KVM/Xfce, arm64 Ubuntu의 기존 harness.
- 공개 HWP/HWPX 편집·저장·재열기, 글꼴 설정/재감지/반복 열기·입력·스크롤, PDF·시스템 인쇄,
  Windows Explorer/Linux Nautilus·Thunar thumbnail과 package lifecycle을 확인한다.
- known limitation, 강제 재설치/재부팅 후 미실행, 사용자 Wayland/GPU·물리 printer 미검증을 구분한다.

### 검증

- `alhangeul-desktop.yml mode=artifact`, all/full/run_tests=true/publish_release=false의 실제 필수 결과.
- 승인한 같은 exact SHA의 mode=updater/publish_release=false와 production 공개키 Minisign 3종.
- release-file-acceptance, release-linux-file-acceptance, release-fedora-vm-acceptance 및 Linux GUI/PDF.
- run/attempt·archive ID/digest/만료·inventory와 실제 installer size/hash·설치 version/문서 결과.
- 같지 않은 source/bytes의 이전 수용을 승계하지 않는다. 재실행은 새 diff·실패 원인·조건 변경이 있을 때만 한다.
- `git diff --check`.

### 커밋

`Task #113 Stage 3: Windows/Linux v0.8.7 native와 패키지 수용`

## Stage 4 — 구현 최종 보고와 릴리즈 인계 준비

### 산출물과 변경 내용

- `mydocs/report/task_m010_113_report.md`, stage4 보고·오늘할일, notes/기록 정합화.
- `task-final-report`로 final commit·publish/task113·devel 대상 PR을 준비한다.
- 구현 수용 완료와 아직 미게시인 delivery 상태를 구분하고 #113은 OPEN 유지한다.

### 검증과 커밋

- 단계·통합 결과·문서 위치·notes 생성 규격·실제 CI·known limitation·미실행을 대조한다.
- `git diff --check`, PR 준비 전 clean tree.
- `Task #113 Stage 4 + 최종 보고서: v0.1.2 구현 수용과 릴리즈 인계 정리`.

## 후속 릴리즈 전달 게이트

- 승인한 자동 후보/task PR을 devel에 통합하고 devel → main release PR을 검토·승격한다.
- main의 exact source/workflow SHA를 고정한다. 기존 source 검증의 재사용 근거를 기록하며 새
  bytes의 hash·서명·6종 설치 확인은 다시 한다. 최종 producer/ref·비게시 signing 입력을 승인받는다.
- 일반 producer의 수동 3종과 한 signed producer의 updater 3종·3 sig·inventory·checksum,
  총 11개 asset·10 checksum 행·생성 body hash를 고정해 CLI 공개 승인 입력으로 제시한다.
- tag resolved SHA 확인 → draft upload/read-back → stable 공개/read-back. 기존 tag/asset을 덮지 않는다.
- Release read-back 뒤 site data PR·exact devel Pages SHA·stable manifest 게시 승인을 받는다.
- production-upgrade 입력을 v0.1.1 → v0.1.2로 정합화하고 NSIS/MSI/AppImage 동일 형식에서
  확인·다운로드·서명·동의·설치·재실행·설정·문서·version을 확인한다.
- 실제 완료 결과를 notes/body/site·최종 보고에 반영하고 기록 PR·승인된 close/cleanup으로 마친다.

## 검증·커밋·의존성 원칙

- 검증 실패는 단계 미완료다. 완료보고서·단계 완료 commit을 만들지 않는다.
- 단계마다 `task-stage-report`의 중앙 stage_report.md 형식을 따르고 소스·보고서를 같은 commit에 묶는다.
- Stage 2 이후는 앞 단계 결과와 다음 단계 승인을 받은 뒤 진입한다.
- 이 계획의 경로/지원/승인 범위를 바꾸려면 보정안을 먼저 기록하고 승인받는다.
- Rust desktop/wasm-pack·Tauri native build는 Windows/Linux에서만 하며 pnpm만 사용한다.

## 위험과 대응

- 자동 gate 실패: 실패 step과 새 upstream diff를 먼저 확인하고 Stage 2 선행 등 구체적 순서 보정을 요청한다.
- ref/동시 후보 이동: 현재 open candidate·branch·run을 다시 조회해 기존 대상 하나만 유지한다.
- 제품/검증 harness 차이: 각각 SHA를 기록하고 source/bytes·검사 결과를 같은 근거로 연결한다.
- 필수 환경 미확보: 부분 성공을 전체 수용으로 쓰지 않고 공개 전에 지원/위험 판단을 승인받는다.

## 승인 범위

현재 승인: 수행계획·구현계획과 Stage 1 후보 생성·검토에 더해, 2026-10-07 작업지시자의
“진행해줘”로 아래 Stage 1.1 최소 소스 보정·선행 devel PR/일반 병합과 Stage 1.2 재실행이 승인됐다.
Stage 1.3 보정·선행 일반 통합·정리·현재 pin 확인은 완료했으며 Stage 2의 나머지 작업 진입 승인은 별도로 받는다.


## Stage 1 실행 결과와 순서 보정안 — 2026-10-07

이 절은 미완료 단계의 진단·계획 보정이며 단계 완료보고서가 아니다. 기존 Stage 1 완료
commit과 `_stage1.md`는 만들지 않는다. 아래 소스 수정·선행 PR은 2026-10-07 작업지시자의 “진행해줘”로 승인됐다.

### 실제 실행 결과

- 명시 run: [37559905032](https://github.com/postmelee/alhangeul-tauri/actions/runs/37559905032),
  workflow main `7acff6bc5fa0a71d277cc14d94affc741cc43baa`, base devel `bdbf3863a573a4ce397dab8660648a082f5226ff`.
- resolve 성공·candidate 실패, 실제 실패 step은 `Run platform-neutral gates`다.
- clean-base automation **1,308/1,308 통과**; frozen pnpm, 설정 검증, managed reference 갱신 통과.
- Ubuntu에서 source/native locks·fresh WASM 생성·v0.8.7 provenance 검증 성공. WASM build 7분 10초,
  관리 artifact 6개가 `1a76570e833917d15817415a53c09ad61ab3203f` 기준으로 검증됐다.
- product boundary/version/release metadata/pin 통과. `test:upstream`은 **39개 중 38 통과·1 실패**,
  cancel/skip 0이다. `tests/rhwp-baseline.test.mjs:129`의 new-doc HTML marker가 **actual 0 / expected 1**이다.
- 새 HTML의 label span에 `data-i18n="command.file.newDoc.label"`이 추가돼 기존 literal marker가 없다.
  같은 drift를 확보한 exact v0.8.7 HTML로 로컬 재현했다.
- 뒤의 Studio test/build, Ubuntu desktop test/Clippy, allowlist·App token·push·PR은 도달하지 않았다.
  Action 전체는 failure이며 부분 성공을 자동 후보 수용으로 기록하지 않는다. 열린 후보 PR·대상 branch는 없다.
- 원격 devel·local/task113 제품 pin은 v0.8.6 유지다. 원격 runner의 생성물을 받은 상태가 아니다.
  로컬 `check:rhwp-pin`은 v0.8.6/6 artifact 기준 통과다.

### 새 source에서 확인한 후속 호환성 문제

- `vite.config.ts`의 file:new-doc 삽입 marker와 `local-font-entry-hooks.ts`의 tool:options marker가 각각 0개다.
  source main의 initializeDocument·promptLocalFontsIfNeeded·openBlankDocumentIfIdle hook은 각각 1개 유지된다.
- main이 새로 import하는 `setHostFontProvider`, `onHostFontsChanged`, `hasHostFontProvider`,
  `prepareHostFontCatalog`, `getHostFontState`가 제품 local-fonts adapter에 없다.
- CanvasKit renderer가 추가로 요구하는 `resolveRendererLocalFont`, `loadRendererLocalFont`도 없다.
  이 API 불일치는 정확한 소스 비교 결과이며 이번 Action에서 Studio compile까지 실행한 결과는 아니다.
- upstream core의 host-font-requests·host-canvas-fonts·wasm-bridge에는 새 relative local-font import가 있다.
  현재 두 소비자만 대체하는 plugin으로는 제품/native 목록과 별도 upstream 상태가 갈릴 수 있다.
- embed/runtime·print-pages·print-surface는 두 release 사이 변경되지 않았다. file command/main의
  국제화와 새 title/renderer 준비 계약, native PDF의 upstream vendor dependency 변화는 후속 영향 검토 대상이다.

### 제안: 기존 Stage 2의 필수 호환성 일부를 Stage 1 앞부분으로 이동

1. **Stage 1.1 — 후보 생성용 호환성 선행 PR**
   - 현재 v0.8.6 pin을 유지한 상태에서 old/new HTML에 모두 대응하는 정확한 command anchor를 사용한다.
     중복·누락은 계속 거부하고 upstream 메뉴 metadata와 번역 속성, 제품 추가 항목을 보존한다.
   - 새 글꼴 public API를 제품 leaf 경계에서 연결한다. 기존 native lookup index·실제 bytes·설정·generation을
     재사용하고 새 renderer/relative 소비자가 같은 상태를 읽도록 한다. 무의미한 성공 stub로 통과시키지 않는다.
   - 기존 v0.8.6의 동작과 새 v0.8.7 소스의 실제 import/entry 계약을 집중 회귀로 확인한다.
   - 변경 예상: `apps/studio-host/vite.config.ts`, `local-font-entry-hooks.ts`, `local-font-overrides.ts`,
     `src/core/local-fonts.ts` 및 필요한 작은 helper/type·테스트, `tests/rhwp-baseline.test.mjs`.
     신규 helper는 300 LOC·함수 50 LOC 상한을 지키고 source vendor는 수정하지 않는다.
   - focused 회귀·check:product-boundary/check:rhwp-pin·test:upstream/test:studio/build:studio·
     test:automation 및 devel PR required를 확인한다. preflight source/API 검사는 Node/Studio 범위다.
   - 후보 생성에 필요한 최소 보정과 진단·계획을 `publish/task113`의 선행 PR로 devel에 반영한다.
     최종 릴리즈 PR 이전의 선행 PR 예외는 이 보정안의 승인 범위로 명시한다. #113은 OPEN 유지한다.
2. **Stage 1.2 — 변경된 devel에서 자동 후보 재생성과 멱등성 확인**
   - 새 devel SHA와 workflow ref를 고정해 target v0.8.7을 다시 실행한다.
   - platform-neutral·Studio·Ubuntu desktop gates·allowlist 전체 성공 및 draft PR 하나 생성을 확인한다.
   - 같은 입력 재판정 existing_pr와 중복 부재, 후보 provenance를 검증한 뒤 Stage 1 완료보고를 한다.
3. **Stage 2 이후 — 나머지 원래 계획 유지**
   - 자동 후보 통합 후 필요한 나머지 native/leaf 호환성, 제품 0.1.2 version·notes 정합화를 진행한다.
   - 6종 파일·Windows/Linux 실제 기능·최종 main·서명·공개·production upgrade gate는 그대로 유지한다.

### 로컬 소스 준비·한계

- 전체 upstream clone은 디스크 부족으로 실패해 이번 복제 process group만 종료했다.
  실패한 임시 pack과 중단한 전체 통계 fetch의 임시 파일만 정리했으며 다른 작업의 파일은 삭제하지 않았다.
- 기존 cdb7 upstream Git 객체를 읽기 전용 alternate로 사용하고 필요한 소스만 sparse checkout했다.
  새 tag fetch는 depth 제거·auto-gc 비활성·blob filter로 완료했고 local upstream 추적 변경은 없다.
- 전체 changed blobs 통계는 불필요한 다운로드를 중단해 완료 근거로 사용하지 않는다.
  exact tag/API 비교와 기존 v0.8.6 pin 검증은 완료했다. 로컬 Rust/wasm-pack/Tauri build는 수행하지 않았다.
- 이 worktree의 upstream 객체는 cdb7 cache를 참조한다. task가 이 cache를 쓰는 동안 cdb7를 정리하지 않는다.
  최종 delivery 전에 필요한 객체/소스 가용성을 다시 확인한다.

### 승인 요청

위 Stage 1.1의 최소 호환성 소스 보정·선행 devel PR/일반 병합 및 Stage 1.2의 변경 입력 재실행은
2026-10-07 작업지시자의 “진행해줘”로 승인받았다.
Stage 1 전체 미완료 상태와 원격 failure를 유지하며 Stage 1.1 검증·선행 PR 반영 후 재실행한다.


### Stage 1.1 구현·로컬 검증 — 2026-10-07

- `data-cmd` 단일 행 anchor로 old/new 번역 markup을 보존하고 누락·중복·nested row를 거부한다.
- 기존 native index·byte cache·설정 소유권을 유지한 채 새 renderer API가 같은 catalog를 조회한다.
  명시 host provider를 설정하면 transport의 snapshot을 기존 catalog에 normalize/index하고, native
  enabled 선택을 계속 요구한다. 기본 desktop 공급 경로의 `hasHostFontProvider()`는 false다.
- protocol helper는 tag에 없는 upstream 모듈을 import하지 않아 v0.8.6 pin에서도 빌드된다.
  metadata/bytes 상한·immutable copy·revision/abort·provider replacement를 검증하고 경로를 오류에 싣지 않는다.
  계약 validation의 필드별 조건은 metadata 경계의 명시성을 위해 한 helper에 둔다(52 LOC 파일).
- 상대 import allowlist는 실제 5개 소비자만 포함하며 extension 유무를 모두 같은 adapter로 연결한다.
- 전체 Studio 268/268, upstream 39/39, automation 1,308/1,308, product boundary·pin·Studio build 통과.
  exact v0.8.7 HTML/main hook과 5개 소비자의 34 import export 대조도 통과했다.
- 최초 전체 Studio/automation은 sparse fixture 누락, 첫 build는 신규 테스트/validation 타입 2건,
  다음 build는 public/fonts symlink target 누락으로 실패했다. 필수 원본 fixture·font 자산만 준비하고
  타입을 수정한 뒤 전체 검사와 build를 다시 통과했다. 실패를 skip/예상 성공으로 바꾸지 않았다.
- macOS에서는 platform-neutral 검사만 했다. Windows/Linux native·패키지·GUI는 후속 gate다.
- Stage 1.1 보고서: `mydocs/working/task_m010_113_stage1.1.md`.
  이 선행 PR은 #113을 close하지 않고 전체 Stage 1·제품 0.1.2 배포 완료를 주장하지 않는다.


### Stage 1.1 원격 수용과 Stage 1.2 시작 — 2026-10-07

- 선행 [PR #114](https://github.com/postmelee/alhangeul-tauri/pull/114), head
  `37ad0f71dd8356900b116b7d59cb4cc9df9f7675`, base `bdbf3863a573a4ce397dab8660648a082f5226ff`.
- [PR acceptance 37581123897](https://github.com/postmelee/alhangeul-tauri/actions/runs/37581123897):
  Node/Studio·Windows script·Alhangeul PR required 모두 success, GitHub Actions app_id 15368 확인.
  latest base/CLEAN·실제 COMMENT 코드 리뷰 후 2026-10-07T06:27:05Z 일반 merge했다.
- 새 devel·작업 branch는 `00f93a8fda6897585750ebba9ea9b7a0db9c2b68`이다. #113은 OPEN 유지한다.
  후속 작업에 쓰는 task branch/worktree는 유지하고 이번 검증의 ignored dist만 정리했다.
- Stage 1.2 [37581631131](https://github.com/postmelee/alhangeul-tauri/actions/runs/37581631131)를
  2026-10-07T06:27:52Z dispatch했다. workflow ref는 main `7acff6bc5fa0a71d277cc14d94affc741cc43baa`,
  configured base는 새 devel, 입력 target_tag=v0.8.7/dry_run=false다. 자동 생성 run은 success지만
  아래 후보 PR required가 failure이므로 전체 Stage 1은 미완료다.


## Stage 1.2 결과와 추가 보정안 — 2026-10-07

현재 절은 실패한 후보의 진단·계획 보정이다. `_stage1.md`와 `_stage1.2.md` 완료보고서나
완료 commit을 만들지 않는다. 아래 Stage 1.3 소스·자동화 변경은 기존 메뉴/font 보정 범위를 넘으며,
2026-10-07 작업지시자의 “그렇게 진행해줘”로 계획·소스·검증·선행 일반 PR 통합·#115 정리가 승인됐다.

### 자동 생성·멱등성에서 확인한 결과

- [37581631131](https://github.com/postmelee/alhangeul-tauri/actions/runs/37581631131): resolve/candidate
  모두 success, [draft PR #115](https://github.com/postmelee/alhangeul-tauri/pull/115) 생성.
  head `5ffd882fd768683f508ce8daaad4e0aaf4b1c482`, base `00f93a8fda6897585750ebba9ea9b7a0db9c2b68`.
- clean-base automation **1,308/1,308**, post-update upstream **39/39**, Studio **268/268**, Studio build
  성공. Ubuntu desktop Rust test **187+21+3=211** 통과·ignored 0, Clippy 성공.
- source/4 native lock/fresh WASM/provenance 성공, changed-path allowlist **16개** 통과.
- 실제 candidate Git blob을 읽어 v0.8.7 tag/gitlink·upstream Cargo.lock hash·4 native lock version·
  WASM package 0.8.7과 6 artifact size/hash를 독립 재검산했다. 작업 pin은 v0.8.6 유지다.
- 같은 target/dry_run=false [37583517253](https://github.com/postmelee/alhangeul-tauri/actions/runs/37583517253)
  resolve가 `existing_pr`, URL #115, candidate_count=1로 성공했다. candidate job의 conditional skip은
  의도된 중복 방지이며 새 빌드 성공으로 세지 않는다. 열린 자동 후보는 #115 하나다.
- gh watch 하나는 network timeout으로 종료됐지만 API·완료 로그로 실제 run success를 회복 확인했다.
  workflow 실패로 분류하지 않는다.

### 후보 required의 실제 실패

- [PR acceptance 37583461314](https://github.com/postmelee/alhangeul-tauri/actions/runs/37583461314):
  Windows PowerShell success, Node/Studio failure, Alhangeul PR required failure. draft/BLOCKED 유지.
- Node job의 `pnpm run test:automation`은 **1,308개 중 1,306 통과·2 실패**, skip 0이다.
  뒤의 GUI typecheck·upstream·Studio·build는 이 required run에서 실행되지 않았다.
- 실패 위치:
  - `tests/linux-thumbnail-core-probe.test.mjs:139`: `RHWP_SHA`가 current lock과 다르다.
  - `tests/windows-thumbnail-fixtures.test.mjs:32`: manifest `rhwpSha`가 current lock과 다르다.
- actual `f1f9c6ae58344ee9368996d3543f76b9345cf227`, expected `1a76570e833917d15817415a53c09ad61ab3203f`.
- 누락된 current-pin 원본은 `scripts/linux-thumbnail-core-fixtures.mjs`의 `RHWP_SHA`와
  `scripts/windows-thumbnail-fixtures.json`의 `rhwpSha`다. 두 경로는 managed references·
  changed-path allowlist·자동 stage 목록에 없다.
- exact v0.8.7의 **10개 고유 fixture**는 기존 manifest의 hash·size와 모두 일치한다. 문서 bytes나
  기대 preview 계약이 달라졌다는 근거는 없고 pin 참조 2개만 오래됐다.
- writer는 변경 전 clean-base에서만 automation을 검사해 이 mismatch를 게시 전 발견하지 못했다.
  `tests/committed-rhwp.test.mjs`가 실제 HEAD/index/submodule 정합성을 검사하므로 전체 automation을
  새 pin의 commit 전에 단순 추가하면 올바르게 실패한다. commit 이후·push/PR 이전에 검사해야 한다.
- PR #115는 merge/ready 전환하지 않았다. devel은 `00f93a8...`/v0.8.6, main·공개 앱은 0.1.1 유지다.
  부분 성공을 후보 수용·전체 Stage 1 완료·배포 성공으로 기록하지 않는다.

### 제안 Stage 1.3 — current-pin 관리 누락과 게시 전 gate 보정

1. 기존 source/4 lock/6 WASM artifact 생성물과 bot commit credit를 보존해 #115 후보를 task113에
   통합하는 부분만 기존 Stage 2에서 앞당긴다. 새 native/renderer 기능이나 0.1.2 버전 변경은 하지 않는다.
2. exact tag fixture hash·size를 확인한 근거로 위 두 pin 필드만 v0.8.7 commit으로 정합화한다.
   fixture bytes·preview 기대값·실패 검증 자체는 완화하지 않는다.
3. future sync 관리 경계에 두 경로를 추가한다:
   - `scripts/update-rhwp-managed-references.mjs`: managed path와 field별 단일 marker preflight/replacement.
   - `scripts/verify-rhwp-sync-changes.mjs`: explicit allowlist 두 경로.
   - `.github/workflows/rhwp-upstream-sync.yml`: explicit stage 목록 두 경로.
4. 같은 workflow의 local candidate commit과 remote push/PR 게시를 분리한다. commit 후
   `check:committed-rhwp`·`test:automation`을 통과해야 push/PR을 허용한다. 게시 직전 remote branch
   존재 재검사·non-force·중복 방지·App 최소 권한·draft·수동 merge 경계는 유지한다.
5. `scripts/write-rhwp-sync-pr-body.mjs`에는 clean-base/post-commit automation 범위를 사실대로 적는다.
   관리참조·allowlist·workflow·PR body 회귀와 current manifest native 계약을 함께 검증한다.
6. 공식 설명은 기존 `docs/architecture/UPSTREAM.md`의 관리 경계/검증 순서만 수정한다.
   이 파일은 이미 선택된 architecture 문서이며 새 문서 위치를 만들지 않는다. 수행 문서는 현재
   `mydocs/plans`, `mydocs/working`, `mydocs/orders`의 #113 경로만 사용한다.
7. local task113 집중 계약·product boundary·pin·committed pin·automation·upstream·Studio·build와
   새 devel PR required를 통과시킨다. 통합 후보는 일반 merge하며, 병합 후 #115를 통합 완료로
   종료하고 불필요한 automation branch를 정리한다. #113은 OPEN 유지한다.
8. 보정된 현재 pin과 future writer의 계약 결과를 구분해 Stage 1을 보고한다. 다른 Stable target의
   실제 positive writer run을 수행하지 않은 경우 그 한계를 남긴다. Stage 2 이후 gate는 유지한다.

예상 추가 소스: 위 scripts 4개·workflow 1개·fixture 정의 2개·관련 Node 회귀·기존 UPSTREAM 설명.
변경 유형별 검증은 Node/Studio + PR Linux/Windows fast이며, native source/lock/WASM bytes는
기존 성공 producer의 동일 pin 생성물이다. Windows/Linux 전체 native/package/GUI 수용은 Stage 3에서 한다.

### 승인 요청

Stage 1.3의 후보 통합 선행·참조 2개 정합화·future 관리 목록/게시 전 gate·회귀·일반 PR 통합과
superseded #115 정리는 2026-10-07 작업지시자의 “그렇게 진행해줘”로 승인받았다.
Stage 2의 나머지 제품 0.1.2 정합화·수용·공개 gate는 그대로 유지한다.


### Stage 1.3 승인 후 구현 정렬

- 2026-10-07 “그렇게 진행해줘”를 기록하고 bot `5ffd882...`를 fast-forward로 통합했다.
  source/native locks/WASM 생성물·bot author를 보존하고 exact submodule `1a76570...`를 선택했다.
- 기존 workflow는 298 LOC이며 commit/gate/publish 분리를 모두 inline으로 쓰면 300 상한을 넘는다.
  실행·explicit staging·remote branch guard를 작은 `scripts/rhwp-sync-publisher.sh`로 분리한다.
  workflow에서 commit → committed-rhwp/automation → publish 순서를 명시하며 default success gate를 유지한다.
- Node 회귀는 실제 shell helper와 workflow 단계 순서를 격리된 fake CLI로 실행해 post-commit 실패·
  remote race/IO 오류·staging mismatch가 게시를 막는지 확인한다. root package 변경은 이 테스트의
  automation suite 등록뿐이며 제품 0.1.1 version과 pnpm lock을 바꾸지 않는다.


### Stage 1.3 로컬 구현·검증 결과

- managed references는 7개 경로, sync allowlist는 19개 경로로 두 fixture pin을 포함한다.
  현재 fixture pin만 `1a76570...`로 변경했으며 10개 원본 bytes/hash·preview 기대값을 보존했다.
- publisher helper는 75 LOC, workflow는 281 LOC다. local commit의 exact SHA를 출력하고 post-commit
  committed-rhwp/automation 통과 후 HEAD 동일성·remote branch 부재를 확인해 non-force 게시한다.
  source/native preflight 후 App token을 발급하며 local commit에 bot identity가 필요해 post-commit
  automation보다 먼저 발급된다. 실패 시 token post cleanup은 유지되고 push/PR은 실행하지 않는다.
- 실제 shell helper·workflow를 fake CLI로 실행한 회귀에서 두 gate 실패, existing/IO/race branch,
  staging mismatch·HEAD 변경은 게시하지 않고 정상 경로만 commit→검사→push→draft를 수행했다.
- 집중 계약 43/43, 전체 automation 1,321/1,321, upstream 39/39, Studio 268/268와 build 통과.
  product boundary/version(0.1.1)/release metadata/pin(0.8.7)/committed pin도 통과했다.
- 최초 집중 검사는 staging 코드가 helper로 이동한 기존 assertion 1건, 최초 전체 자동화는
  sync workflow 전체에서 strict 검사 부재를 요구한 CI assertion 1건이 실패했다. 각각 실제 helper
  검사와 commit 전/후 경계·default success/continue-on-error 부재로 정렬한 뒤 전체 검증을 통과했다.
- sparse status용 metadata blob을 확보하고 task113 submodule의 gc.auto만 0으로 설정했다.
  upstream은 선택된 commit 그대로이며 수동 source 변경이 없다.
- 로컬 단계 보고서: `mydocs/working/task_m010_113_stage1.3.md`. 승인된 선행 PR의 remote required·
  일반 merge·superseded #115 정리·현재 pin no-op 결과는 전체 Stage 1 보고에 기록한다.


## Stage 1.3 원격 수용·정리와 전체 Stage 1 완료 — 2026-10-07

- 통합 [PR #116](https://github.com/postmelee/alhangeul-tauri/pull/116), head
  `0770bd539c86e4799f0ee8fcd4e8aa06c97361ee`, base `00f93a8fda6897585750ebba9ea9b7a0db9c2b68`다.
  [37594489485](https://github.com/postmelee/alhangeul-tauri/actions/runs/37594489485)의
  Linux Node/Studio·Windows PowerShell·Alhangeul PR required 모두 success/Actions app_id 15368이다.
- 실제 code COMMENT review·latest base/CLEAN·exact head를 확인해 2026-10-07T08:37:37Z 일반 merge했다.
  devel/local task113은 `bad557572f070700d195df2288fe570483f67c3f`, bot `5ffd882...`는 ancestor다.
- #115는 통합된 commit으로 GitHub가 08:37:39Z MERGED 처리했다. 수동 close 직전 경합의 read-back으로
  최종 상태를 확인했다. #115의 실패 required를 성공으로 바꿔 기록하지 않는다. exact head 확인 뒤
  불필요한 automation branch를 삭제·부재 확인했다. #113과 필요한 task branch/worktree는 유지한다.
- 병합된 HEAD의 `check:rhwp-pin`은 v0.8.7/6 artifacts, `check:committed-rhwp`는 같은 commit으로 통과했다.
- [37595544513](https://github.com/postmelee/alhangeul-tauri/actions/runs/37595544513),
  workflow ref/checkout devel `bad55757...`, target_tag=v0.8.7/dry_run=false,
  2026-10-07T08:42:19Z dispatch·08:45:27Z 완료다. resolve success·decision=current,
  target/current `1a76570e833917d15817415a53c09ad61ab3203f` 동일·candidate_count=0·candidate conditional skip다.
  열린 자동 후보도 API로 0개 확인했다. 이는 full positive writer 실행이 아니다.
- 전체 [Stage 1 보고서](../working/task_m010_113_stage1.md)를 작성하고 기존 하위 단계 source/report
  커밋을 보존한다. 위 실패 절은 당시 진단 이력이며 현재 전체 단계 수용과 구분한다.

### Stage 2 진입 시 구체적 잔여 범위

- 제품 root/desktop package·Tauri/Cargo manifest/lock을 0.1.2로 맞춘다. rhwp는 v0.8.7 고정이다.
- 새 upstream `ui/document-title.ts`가 init/파일명 변경 시 쓰는 제품 제목을 최소 제품 hook/leaf로
  연결하고 blank/document/파일명 변경 회귀를 확인한다. exact upstream entry/renderer는 유지한다.
- 제품 접근성 h1은 기존 HTML transform 후 `showsOriginal` 조건 때문에 한국어 제품명 그대로 남는다.
  초기 번역이 이를 upstream 이름으로 덮는다고 단정하지 않고 ko/en 실제 initI18n 계약에 맞는
  제품 locale label 연결을 보정한다. 관련 source는 기존 Vite/entry hook과 작은 제품 helper·focused 회귀다.
- 상대 font 소비자 5개와 renderer/catalog 계약을 승인된 기존 `docs/architecture/UPSTREAM.md`·
  필요 시 `LOCAL_FONTS.md`의 해당 설명만 정합화한다. 새 공식 문서 루트를 만들지 않는다.
- native PDF의 직접 registry svg2pdf와 upstream vendored patch의 소비 경계를 검토한다. 전체 native/PDF
  수용은 Stage 3이며 새 dependency 적용이나 회귀를 추정만으로 기재하지 않는다.
- `docs/releases/v0.1.2.md`·notes.json·기존 생성 출력은 미게시로 준비한다. 공개 site 최신 데이터는
  실제 Release read-back 이후에 전환한다. 완료하지 않은 설치·출력·upgrade 성공 문구를 쓰지 않는다.
- 검증은 원래 Stage 2 명령과 실제 title/locale 집중 회귀다. source 보정·version·notes 검증 완료 후
  다음 stage 승인 gate를 유지한다. main은 `7acff6bc...`·공개 latest는 v0.1.1이며 main 승격 전 daily
  workflow는 이전 publisher 순서다. 다른 Stable positive run 미실행도 유지한다.


## Stage 2 착수 승인 — 2026-10-08

- Stage 1 보고 후 제품 버전·창 제목/번역·미게시 릴리즈 노트 정합화의 Stage 2 진입 요청에
  같은 스레드의 “진행해줘”가 승인했다. source 작업은 local/task113 `6e0db926...`에서 이어간다.
  origin/devel `bad55757...`와 #113 OPEN, upstream latest v0.8.7은 착수 시 재확인했다.
- 제목은 Tauri에서 기존 DesktopHost의 native session/dirty title 소유권을 유지한다. browser에서는
  파일명·display-mode 이벤트를 제품명으로 연결한다. main의 exact title import와 initI18n 호출만
  작은 product-shell entry transform으로 연결하고 12개 alias와 upstream 본문은 유지한다.
- locale은 upstream initI18n 결과 뒤 제품 접근성 h1을 ko/en 문구로 정렬한다. upstream 번역 catalog를
  복제하거나 메뉴/renderer 전체를 대체하지 않는다. title·locale·drift의 집중 회귀를 함께 검증한다.
- 현재 notes validator는 draft에도 source SHA·실제 6개 파일 size/hash와 3종 signed inventory를
  요구한다. 아직 Stage 3/최종 source 수용 전이므로 이를 꾸며 채우지 않는다.
  v0.1.2.md에 사용자 문구를 먼저 준비하고 exact bytes 확인 후 JSON·생성물을 완성하는 순서 조정을
  작업지시자에게 요청했다. 답변 전에는 schema 완화·JSON 가상 metadata 작성·Stage 3 실행을 하지 않는다.
- 문서 위치는 기존 승인된 architecture·docs/releases와 mydocs plans/working/orders다.
  오늘 보드는 20261008.md로 이어가고 20261007.md의 실제 기록은 유지한다.


### notes 완성 순서 조정 승인 — 2026-10-08

작업지시자가 “기존 규격 유지·JSON 완성 이연 (권장)”을 선택했다. Stage 2의 notes 산출물은
기존 `docs/releases/v0.1.2.md`에 구체적인 사용자 문구·포함 PR·지원/설치·한계 초안으로 준비한다.
`docs/releases/v0.1.2.notes.json`과 생성 body/HTML/short notes의 완성은 Stage 3의 실제 6개 파일·
3 updater inventory 검증 후로 이연한다. 이 순서 조정은 승인됐으며 validator/schema는 유지한다.
Stage 2에서는 기존 published 원문과 generation 계약의 검증을 실행하고 새 JSON 생성 성공으로
기록하지 않는다. 실제 공개 main/bytes 확정 시 notes source/inventory를 다시 정합화한다.


### Stage 2 구현·로컬 수용과 원격 fast 입력

- 제품 version 표면 5개가 0.1.2다. desktop Cargo.lock은 제품 package version 한 줄만 변경했고
  upstream source/gitlink·native dependency blocks·WASM 6개 bytes·pnpm lock·key/endpoint는 유지한다.
- exact main의 title import/initI18n만 연결하는 product-shell-entry(28 LOC)와 product-shell(29 LOC)을
  Vite/Vitest에 등록했다. native title/dirty 소유권·browser 파일명/mode change·실제 upstream ko/en
  초기화·반복 초기화·누락/중복/drift 회귀에 성공했다. alias는 12개, renderer/entry 본문은 그대로다.
- 기존 UPSTREAM/LOCAL_FONTS 설명을 현재 상대 소비자 5개·title/locale·host/catalog 경계로 최소 정렬했다.
  v0.1.2.md(131 LOC)에 사용자 문구·포함 PR·한계·미실행 gate를 준비하고 인덱스에 미게시로 추가했다.
- frozen pnpm·product boundary/version/metadata/pin/committed/action pins·release notes 통과.
  focused 32, Studio 281/43 files, automation 1321, upstream 39, release notes 124 tests 전부 통과·skip 0다.
  TypeScript/Vite build·GUI typecheck·Pages source18/output22 검사 통과. generated production은0.1.1이며
  source site/release.json과 동일하다. 새 notes JSON·body/HTML/short notes 생성은 승인대로 이연했다.
- 최초 automation은 현재 metadata expected version 2곳이 0.1.1이라 1319/1321로 실패했다.
  두 literal 기대값만 0.1.2로 맞춰 재검증했다. negative 계약·fingerprint·endpoint·검사 자체는 유지한다.
- `task-stage-report`에 따라 source와 local stage report를 한 커밋으로 보존한다. source commit을
  publish/task113에 non-force push한 후 `ci.yml --ref publish/task113 scope=full/profile=fast`를
  한 번 실행한다. 실제 head/workflow/checkout SHA와 Linux Node/Studio·Windows PS 성공을 고정한다.
  이는 승인된 Stage 2 fast이며 full/native/package/GUI·PR required 수용으로 확대하지 않는다.
- 원격 결과 전 다음 Stage로 진입하지 않는다. 최종 Task PR은 원래 Stage 4에서 만들며 이번에는
  단순 fast 실행을 위한 원격 branch만 사용한다. #113은 OPEN, main/public/site/feed는0.1.1 유지다.


### Stage 2 원격 fast 수용과 Stage 3 입력 고정 — 2026-10-08

- source/report commit은 `ff48d15011e53169bfd97b13a4f7084c3284c289`다. 원격 publish/task113도 이 SHA다.
- [37712633686](https://github.com/postmelee/alhangeul-tauri/actions/runs/37712633686),
  ci.yml·scope=full/profile=fast, 2026-10-08T01:22:52Z dispatch, 전체 success다.
  head/checkout SHA를 고정했고 select·Linux Node/Studio·Windows PS의 필수 step이 모두 success다.
  auto comparison/native/package/installer conditional skip은 fast 범위이며 전체 수용으로 세지 않는다.
- 원격 automation1321/upstream39/Studio281·build/GUI typecheck·notes/Pages/version/pin이 통과했다.
  [Stage 2 보고서](../working/task_m010_113_stage2.md)에 job ID·완료시각·실제 범위를 기록했다.
- 이후 기록 commit은 docs/mydocs뿐이다. source/report 최초 commit을 재작성하지 않고
  publish/task113을 ff48d150...로 유지한다. 다음 product producer의 workflow/source를 같은 값으로 고정한다.
- #113은 OPEN, devel은 bad55757.../제품0.1.1/core0.8.7, main은7acff6bc.../공개0.1.1이다.
  Stage 2 source0.1.2와 미게시 상태를 구분한다. Stage 3 이후 실행은 승인 대기다.

#### 검토 가능한 Stage 3 입력 (미실행)

```bash
gh workflow run alhangeul-desktop.yml --ref publish/task113 \
  -f mode=artifact -f build_ref=ff48d15011e53169bfd97b13a4f7084c3284c289 \
  -f artifact_platform=all -f validation_profile=full \
  -f run_tests=true -f publish_release=false
gh workflow run alhangeul-desktop.yml --ref publish/task113 \
  -f mode=updater -f build_ref=ff48d15011e53169bfd97b13a4f7084c3284c289 \
  -f release_version=0.1.2 -f release_tag=v0.1.2 \
  -f release_notes='Alhangeul v0.1.2 비게시 검증 후보 — rhwp v0.8.7' \
  -f publish_release=false
```

- dispatch 직전 원격 ref tip·workflow SHA·build_ref의 동일성을 확인한다. 임의 tag/force는 없다.
- 기존 release environment의 production key로 NSIS/MSI/AppImage 3종과 signature/inventory를
  준비하며 Secret 값은 출력·저장하지 않는다. public job은 publish_release=false 조건으로 실행하지 않는다.
- 실제 run/attempt·archive ID/digest/만료·path/size/hash·Minisign을 검증하고 기존 승인된
  `mydocs/working/task_m010_113.json` 경로에 실제 candidate identity를 기록한다.
- Windows NSIS/MSI·Linux x64 AppImage/DEB/RPM·arm64 DEB의 새 bytes를 기존 exact-file Windows/
  Linux/Fedora harness와 공개 문서·글꼴·PDF/system print·thumbnail/lifecycle에서 수용한다.
  harness 기록만 바뀌면 product SHA와 구분하고 critical dependency/pin 정합성은 계속 검증한다.
- 실제 6종 file·signed inventory 수용 후 새 notes JSON·body/HTML/short notes를 완성한다.
  final main/새 final bytes/게시·Pages·production upgrade gate는 이 승인에 포함하지 않는다.


## Stage 3 착수 승인 — 2026-10-08

- Stage 2 보고와 exact ff48d150 source의 full native·6종 package·비게시 signing·설치/GUI
  검증 요청에 같은 스레드의 “진행해줘”가 승인했다. 위 두 producer와 실제 파일/기능 수용을 진행한다.
- 직전 재조회에서 publish/task113은 `ff48d15011e53169bfd97b13a4f7084c3284c289`, #113 OPEN이며
  이 ref의 desktop 기존 run은 없다. 일반 producer와 동일 source의 signing을 한 번씩 dispatch한다.
- source 변경 없이 local task의 기록은 이어간다. candidate/acceptance harness 기록·필요 최소 보정은
  제품 source와 구분한다. main·Release/tag/Pages/feed·production upgrade는 후속 승인 gate다.


### producer 시작·acceptance harness 최소 정렬

- 일반 [37719733676](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719733676),
  서명 [37719736557](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719736557),
  두 head는 ff48d150...이며 2026-10-08T02:49:13Z/02:49:15Z dispatch했다.
  같은 desktop ref concurrency로 서명은 일반 producer 뒤 pending이며 중복 dispatch하지 않는다.
- 기존 `release-candidate-input.mjs`의 unsigned RPM/arm64 입력이 ci.yml만 허용해 승인한
  ordinary desktop producer를 거부한다. 기존 verify-workflow-artifact와 Linux GUI는 desktop
  producer를 이미 지원한다. 원래 승인한 수행계획의 새 release 수용 입력 최소 보정 범위다.
- harness의 unsigned workflow allowlist만 ci.yml + alhangeul-desktop.yml로 명시한다. signed는
  desktop.yml만 허용한다. version/tag/source/run·archive ID/digest·path/hash·목표 kind/platform과
  실제 producer success 검증은 유지하고 불명확한 workflow를 거부한다. 제품 source FF는 바꾸지 않는다.
- 두 unsigned kind의 실제 선택 identity 보존과 signed의 ci.yml 거부 회귀를 추가한다.
  harness/plan은 향후 실제 candidate JSON과 별도 commit으로 기록하며 product SHA와 구분한다.

### Stage 3 글꼴 기능 수용 연결

- 기존 A/B performance producer는 v0.1.0 baseline의 WASM/gitlink 정합성을 요구하므로 새 v0.8.7
  pin에 사용하지 않는다. baseline 검증과 비교 계약을 완화하지 않는다.
- `wdio.release-files.conf.ts`는 검증된 새 candidate JSON이 있고 production updater check가
  아닌 경우에만 기존 `local-font-performance.e2e.ts`를 문서 저장·재시작 spec과 함께 실행한다.
  NSIS/MSI/AppImage의 실제 설치 bytes로 Windows/Linux x64, renderer 2종, 로컬 글꼴 off/on,
  HWP/HWPX 5회 재열기·입력·6쪽 scroll을 확인한다. 이전 성능 수치나 개선률을 승계하지 않는다.
- product FF·package bytes는 그대로이며 변경은 검사 harness다. native 설치·document spec·
  cleanup·WebView policy·최종 upload gate는 유지한다. Linux DEB의 글꼴 재감지·재시작·새 창
  기능은 별도 `scope=local-fonts`의 기존 시나리오로 수용한다.

### Stage 3 안내 참고 범위 확인

- 이전 공개 source `96e89e900...`부터 product FF까지 first-parent merge와 bot 통합을 대조했다.
  #100·#101·#103·#104·#105·#106·#109·#111도 실제 포함되며 운영/웹/문서 참고로 기록한다.
  이들의 기존 v0.1.1 공개/성능 결과를 새 파일 수용이나 주요 앱 기능으로 승계하지 않는다.
- #97·#102·#108·#110의 CLOSED·completed와 #113 OPEN을 API에서 확인했다. 이전 운영
  Issue는 참고로 유지하고 #113을 해결로 쓰지 않는다. schema와 JSON 완성 순서 조정은 유지한다.

### 생성물 위치와 비게시 경계 정렬

- 작업지시자의 기존 JSON/생성 규격 유지 선택에 따라 기존 generator의 실제 target은
  `site/updates/v0.1.2.html`이다. 계획의 초기 `v0.1.2/index.html` 표기를 같은 공식 site 루트의
  기존 flat route로 정렬한다. 새 template/route/schema를 만들지 않는다.
- Stage 3 draft 생성 body·HTML·short notes는 `/private/tmp/task113-stage3-notes-generated`의
  새 staging directory에서 검토하고 hash를 기록한다. 공개 site tree에 draft HTML을 넣지 않는다.
  실제 HTML·release.json·manifest 전환은 Release read-back 뒤 별도 공개 gate다.

### Stage 3 일반 producer·Linux GUI 결과와 CanvasKit 실패 진단

- ordinary [37719733676](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719733676)의
  all/full/run_tests=true가 전체 success다. 선택 job 14개 success, native Rust는 Windows 258,
  Linux x64/arm64 각 247 tests·0 failed·0 ignored다. 세 core·package lifecycle·설치 계약이 완료됐다.
- NSIS raw exit 1·12 실패는 기존 hosted diagnostic으로 계약만 통과했다. 썸네일 not-accepted 유지.
  MSI raw exit 0·0 실패는 strict-product 통과, 강제 MSI는 raw exit 1·3010/reboot-required로
  계약 통과이며 post-reboot-unverified다. 전체 썸네일 해결·재부팅 후 검증으로 쓰지 않는다.
- 원본 Linux archive 전체 digest·배포 대상 inventory의 exact ZIP 경로/크기/hash를 확인했다.
  로컬 macOS의 Alhangeul/alhangeul 디렉터리 병합과 기존 AppDir 제외 계약을 분리했다.
  원본 inventory/ZIP은 수정하지 않았고 Linux 소비자의 추출 후 strict 검증을 유지한다.
- Linux full [37723131983](https://github.com/postmelee/alhangeul-tauri/actions/runs/37723131983)는
  success다. source/workflow FF, ordinary producer의 exact DEB·helper·inventory와 실제
  문서/새 문서·PDF·GTK/CUPS virtual print·Nautilus thumbnail 수용을 완료했다.
- local-fonts [37723134560](https://github.com/postmelee/alhangeul-tauri/actions/runs/37723134560)는
  failure다. Canvas2D의 전체 설정/삭제/복구/새 창/재시작은 통과했다. CanvasKit 초기 HWP/HWPX
  off/on·재감지·새 창까지 통과했으나 글꼴 삭제 후 재감지에서 canvas 미표시 timeout과 빈 페이지다.
  selector 완화·renderer 대체·검사 skip을 하지 않는다. Stage 3 전체는 미완료다.
- `local-fonts.e2e.ts`의 afterEach 실패 진단만 renderer RPC·canvas 크기/marker·window handles로
  보완한다. source FF와 critical dependency는 유지하고 검사 harness SHA를 별도로 고정한다.
  원인이 드러나지 않은 현재 상태에서는 product/third_party source를 수정하지 않는다.
  수정한 진단으로 같은 exact DEB를 local-fonts scope에서 한 번 확인한다.
- 비게시 signing [37719736557](https://github.com/postmelee/alhangeul-tauri/actions/runs/37719736557)는
  release Environment required reviewer `postmelee`·self-review 허용·ref 제한 없음·current approval
  가능을 확인했다. 이미 승인한 FF/publish_release=false에만 정상 review를 기록했고 보호 설정이나
  admin bypass를 사용하지 않았다. public job·tag/Release/Pages/feed는 별도 gate다.
- Windows PDF [37724319402](https://github.com/postmelee/alhangeul-tauri/actions/runs/37724319402)를
  FF workflow·acceptance_candidate_sha=FF·ordinary run으로 한 번 dispatch했다. 현재 서명 뒤
  pending이며 같은 desktop concurrency의 pending 교체를 피하여 추가 desktop mode는 기다린다.

## Stage 3.3 제품 글꼴 refresh 보정안 — 승인 대기

### 관측과 충돌 경로

- 진단 harness `1f5c8dc6...`의 fast `37725336047`은 success다. 같은 FF 제품으로 local-fonts
  `37725338707`을 추가 진단했으며 failure다. archive `11527374730`, digest
  `sha256:4759cf8c8e795075931925b0e7ff7fce69d149e62d63a24b8c2cb9ea80afb2fc`.
- 실패 시 initialized=true, initializationError/selectionError=null, effectiveBackend=canvaskit,
  canvas 0개·page diagnostics null·document/resource revision 33이었다. window handle은 1개다.
  최초 글꼴 적용과 새 창까지 정상이며 삭제 재감지에서 문서 placeholder만 남았다.
- 새 upstream main의 `onHostFontsChanged`는 `canvasView.refreshFontResources()`를 실행한다.
  현재 앱 hook은 같은 catalog 변화 뒤 `session.invalidateDocument()` + `view.loadDocument()`를
  수행한다. `loadDocument`는 문서 교체용 reset/빈 쪽을 만든 후 동시 font revision 변화로 selection이
  취소되면 canvas를 만들기 전에 반환할 수 있다. 실제 빈 쪽·무오류 진단과 일치하는 충돌 경로다.
  새 source의 실제 GUI 통과 전 원인 보정 성공으로 확정하지 않는다.

### 검토 가능한 최소 변경

- `/private/tmp/task113-stage3-font-refresh-proposal/font-refresh.patch`에 실제 diff를 준비했다.
  repository product source는 아직 수정하지 않았다.
- `apps/studio-host/local-font-entry-hooks.ts`: 문서 invalidate/load 두 호출을 upstream의
  `await view?.refreshFontResources()` 한 호출로 바꾼다. 문서·undo/dirty 상태를 보존하는 font
  resource 전용 API를 사용하고 현재 document/view/session/renderer/decision guard는 유지한다.
- 기존 `local-font-entry-hooks.test.ts`의 pinned API 기대값을 정렬하고 actual transformed callback의
  resource refresh→font prepare→paint 순서와 문서 교체 후 paint 거부 회귀 2건을 추가한다.
  proposal의 callback 검사는 2/2 통과했다. 이것은 실제 GUI 보정 수용을 뜻하지 않는다.
- third_party content·pin/WASM/native locks·제품 0.1.2·지원 OS는 현재 승인 범위와 동일하다.
  기존 source와 source-specific asset의 수용을 새 bytes의 수용으로 승계하지 않는다.

### 승인 후 실행 입력과 검증

1. 위 두 product/test 파일의 승인된 diff와 보고/계획을 반영하고 focused·automation·upstream·
   Studio/build·GUI typecheck·product version/pin/boundary/notes 검증을 실행한다.
2. 보정 commit의 exact product SHA를 새 검증 source P로 계산해 기록한다. 같은 workflow/checkout P의
   ordinary all/full/run_tests=true/publish_release=false와 updater version0.1.2/tagv0.1.2/
   publish_release=false를 각각 한 번 수행한다. 이전 FF와 새 P의 provenance를 구분한다.
3. production 공개키 3 서명과 실제 6종 asset의 identity/hash를 새로 검증한다. Native Windows/Linux
   full·새 bytes의 NSIS/MSI/AppImage/DEB/RPM/arm64/Fedora 설치·문서·글꼴·PDF/인쇄·thumbnail
   수용을 완료한다. 글꼴 삭제/복구·설정·새 창·재시작 assertion과 실패 gate를 유지한다.
4. 새 source의 실제 metadata가 확인된 뒤 candidate/notes JSON·생성 body를 정렬한다. 아직 공개
   source가 아니며 final main·Release/tag/assets·Pages/feed·production upgrade gate는 이후에 받는다.

제품 source 및 새 서명 source를 바꾸는 보정안이므로 작업지시자의 명시 승인을 받은 뒤 적용한다.
현재 승인된 FF의 나머지 exact-file/Windows PDF·RPM/Fedora·arm64 검사와 기록은 계속한다.

### Stage 3.2 실제 metadata와 draft 생성 수용

- 성공한 FF ordinary/signed producer의 실제 archive 및 6종 file·3 Minisign을 독립 검증했다.
  production 공개키 fingerprint 9f86f804...이며 합산 inventory도 일치한다.
- `task_m010_113.json`과 `v0.1.2.notes.json`을 완성했다. 기존 schema 유지·draft/publishedAt=null,
  source FF·previous 0.1.1/96e89e900...·rhwp087, 실제 PR 11개·참고 Issue 5개다.
- notes check 2 documents·tests124/124·staging 생성3종·diff check 통과. body 6140 bytes/
  ec25e655602002e16e58344e92f02c3195040cde24d780fed27224f102d73472.
  source site/manifest는 0.1.1이며 기록은 `task_m010_113_stage3.2.md`에 묶는다.
- FF source와 새 검사 commit을 구분하여 6종 설치/GUI를 계속한다. Stage3.3 product 보정은
  비동기 승인 요청 중이며 답변 전 제품 source를 변경하지 않는다.
