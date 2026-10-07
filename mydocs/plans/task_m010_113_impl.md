# Task #113 구현계획서 — rhwp v0.8.7 반영과 v0.1.2 전달

수행계획서: [`task_m010_113.md`](task_m010_113.md)
GitHub Issue: [#113](https://github.com/postmelee/alhangeul-tauri/issues/113)
마일스톤: M010
작성일: 2026-10-07 (Asia/Seoul)
상태: Stage 1 승인·진행 / Stage 2 이후 승인 대기

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

현재 승인: 수행계획·동일 범위 구현계획서 작성·Stage 1의 명시 v0.8.7 자동 후보 생성과 검토.
다음 승인 요청은 Stage 1 결과에 따른 Stage 2 진입 또는 실제 실패 원인을 반영한 계획 보정이다.
