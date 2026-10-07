# Task #113 구현계획서 — rhwp v0.8.7 반영과 v0.1.2 전달

수행계획서: [`task_m010_113.md`](task_m010_113.md)
GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
마일스톤: M010
작성일: 2026-10-07 (Asia/Seoul)
상태: Stage 1 미완료 — 후보 검증 실패 / 호환성 선행 보정 승인 대기

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
| 생성 웹·배포 데이터 | site | updates/v0.1.2/index.html, release.json | OK | 최신 전환은 공개 read-back 뒤 |
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
Stage 2 이후 진입 승인은 별도로 받는다.


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
  계약 validation의 필드별 조건은 metadata 경계의 명시성을 위해 한 helper에 둔다(59 LOC 파일).
- 상대 import allowlist는 실제 5개 소비자만 포함하며 extension 유무를 모두 같은 adapter로 연결한다.
- 전체 Studio 268/268, upstream 39/39, automation 1,308/1,308, product boundary·pin·Studio build 통과.
  exact v0.8.7 HTML/main hook과 5개 소비자의 34 import export 대조도 통과했다.
- 최초 전체 Studio/automation은 sparse fixture 누락, 첫 build는 신규 테스트/validation 타입 2건,
  다음 build는 public/fonts symlink target 누락으로 실패했다. 필수 원본 fixture·font 자산만 준비하고
  타입을 수정한 뒤 전체 검사와 build를 다시 통과했다. 실패를 skip/예상 성공으로 바꾸지 않았다.
- macOS에서는 platform-neutral 검사만 했다. Windows/Linux native·패키지·GUI는 후속 gate다.
- Stage 1.1 보고서: `mydocs/working/task_m010_113_stage1.1.md`.
  이 선행 PR은 #113을 close하지 않고 전체 Stage 1·제품 0.1.2 배포 완료를 주장하지 않는다.
