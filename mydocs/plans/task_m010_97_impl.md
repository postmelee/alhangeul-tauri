# Task #97 구현계획서 — 로컬 글꼴 조회 성능 개선과 v0.1.1 배포

수행계획서: [`task_m010_97.md`](task_m010_97.md)
GitHub Issue: [#97](https://github.com/postmelee/alhangeul-tauri/issues/97)
마일스톤: M010
작성일: 2026-10-03 (Asia/Seoul)
상태: Stage 3·Rust 1.99 보정 승인 완료, 새 후보 전체 검증 진행 중

## 승인과 기준

작업지시자의 같은 스레드의 “진행해줘”를 수행계획 승인과 본 구현계획 작성 승인으로 기록한다.
후속 “진행해줘”를 구현계획 및 Stage 1 진입 승인으로 기록한다. Stage 1은 테스트·측정만 추가하며 제품 동작은 변경하지 않는다.
Stage 1 보고 승인 요청에 대한 후속 “진행해줘”를 Stage 2 진입 승인으로 기록한다.
Stage 2 보고 승인 요청에 대한 후속 “진행해줘”를 Stage 3 진입 승인으로 기록한다.
기준은 origin/devel `97550085a9334129062266dddb625798bcdc77e2`, 계획 커밋은 `6986c8e2`다.
배포본 v0.1.0 기준 함수와 실제 소비 경로는 Stage 1에서 다시 확인한다.

## 단계 개요

| Stage | 제목 | 주요 산출 | 검증 |
|---|---|---|---|
| 1 | 배포본 기준선과 회귀 고정 | 성능 측정·의미 회귀, stage1 보고 | 배포본/현재 코드 일치 여부, 반복 가능한 baseline |
| 2 | 조회 인덱스와 무효화 | lookup 모듈·adapter 연결·회귀 | alias/face/실패/복구 정합 및 반복 순회 제거 |
| 3 | 실제 Windows/Linux 수용 | GUI 관찰 보정·성능 비교·stage3 보고 | 같은 설치 환경·문서·글꼴에서 응답성 및 기능 확인 |
| 4 | 최종 후보·배포 준비 | 0.1.1 metadata·공식 문서·검증 증거 | full CI·공개 패키지 6종 수용·최종 보고 |

## 문서 위치 확인

| 파일 | 수행계획서상 선택 위치 | Stage 산출물 경로 | 일치 여부 | 비고 |
|---|---|---|---|---|
| 글꼴 계약 | docs/architecture/LOCAL_FONTS.md | 동일, Stage 4 | OK | 실제 변경된 캐시 계약만 반영 |
| 배포 계약 | docs/operations/DESKTOP_RELEASE.md | 동일, 필요한 경우 Stage 4 | OK | 계약 변화가 없으면 수정 없음 |
| 공개 데이터 | site/release.json | 동일, Release read-back 후 | OK | 제품 PR과 분리한 게시 후 변경 |
| 릴리즈 노트 | GitHub Release | v0.1.1 Release | OK | 검증된 개선·asset·제한 |
| 단계·최종 증거 | mydocs/working, mydocs/report | task_m010_97_stage{N}.md, task_m010_97_report.md | OK | 개별 실행 기록은 공식 계약에 누적하지 않음 |

## Stage 1 — 배포본 기준선과 회귀 시나리오 고정

### 산출물

신규:

- `apps/studio-host/src/core/local-font-lookup.bench.ts`: 실제 adapter API를 사용하는 가상 catalog 벤치마크.
- `apps/studio-host/src/core/local-font-lookup.test.ts`: 최적화 전에도 성립하는 조회 의미·상태 전이 회귀.
- `mydocs/working/task_m010_97_stage1.md`: baseline source, 환경, 조건, 결과, 소비 경로 및 한계.

수정:

- 필요할 때만 기존 local-font 테스트의 공통 fixture 구성. 제품 동작 변경은 Stage 2에서 수행한다.

### 변경 내용

- pinned submodule을 exact commit으로 준비하고 pnpm frozen 설치를 사용한다. upstream pin은 변경하지 않는다.
- v0.1.0과 현재 devel의 local-font adapter 및 실제 upstream font substitution/CanvasKit 호출 경로를 비교한다.
- 실제 detect/resolve API에 Tauri catalog 응답만 대체한다. 함수 복사본으로 최적화 수치를 만들지 않는다.
- 가상 catalog 0/100/500/1000/5000개, 동일 이름 hit, 없는 이름 miss, 다국어 alias,
  동명 여러 face를 구분해 측정한다. 준비·첫 조회와 warm 반복 조회를 분리한다.
- 각 case warm-up 뒤 최소 5회 측정하여 중앙값과 분산을 기록한다. baseline source SHA,
  Node/V8·OS·호스트와 측정 횟수를 명시한다. 이 결과를 실제 WebView 성능으로 해석하지 않는다.
- 현재의 정확한 PostScript/full name 우선순위, 모호한 family의 null 반환,
  같은 catalog에서 provider 실패 직후 resolve 제외, 재감지 후 복구를 고정한다.
- 성능 결함은 측정 결과로 재현한다. 현재 의미 계약을 통과시키고 의도적 failing test를 남긴 채
  단계 완료 처리하지 않는다. 성능 개선의 결정적 회귀는 Stage 2에 추가한다.

### 검증

```bash
pnpm install --frozen-lockfile
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font-lookup.test.ts src/core/local-font-names.test.ts src/core/local-font-lifecycle.test.ts
pnpm --filter @postmelee/alhangeul-studio-host exec vitest bench --run src/core/local-font-lookup.bench.ts
pnpm run check:product-boundary
git diff --check
```

벤치 설정이 기본 Vitest config와 충돌하면 제품 빌드 설정은 유지하고 독립 bench 설정을 최소 추가한다.
새 설정 경로·이유는 단계 보고서에 기록하며 지원 플랫폼/제품 범위를 확대하지 않는다.

### 커밋

`Task #97 Stage 1: 로컬 글꼴 조회 기준선과 회귀 시나리오 고정`

## Stage 2 — 조회 인덱스와 상태 변화 연결 구현

### 산출물

- 신규 `apps/studio-host/src/core/local-font-lookup.ts`.
- `local-fonts.ts`, 필요 최소 `local-font-state.ts`·`local-font-records.ts` 연결.
- Stage 1 조회 회귀 및 기존 `local-font-consumers.test.ts`, `local-font-application.test.ts`,
  `local-font-state.test.ts`, `local-font-lifecycle.test.ts` 중 필요한 추가 사례.
- `mydocs/working/task_m010_97_stage2.md`.

### 변경 내용

- catalog entries identity/generation에 결속된 레코드·정규화 alias 후보 Map을 만든다.
  null 상태에서 catalog가 뒤늦게 로드되는 경우 generation이 같아도 새 entries를 인식한다.
- public 조회 의미는 기존 순서를 보존한다. 정규화 요청의 alias 후보만 찾고,
  현재 가용 후보 1개 → 정확한 PostScript 1개 → 정확한 full name 1개 → null 순서를 유지한다.
- provider의 failedPaths는 generation 증가 없이 변한다. 인덱스는 원본 entry 정보를 보유하고
  lookup마다 해당 이름의 후보에만 desktopFontUnavailable을 적용한다. stale 성공/miss 결과를
  generation만으로 영구 캐시하지 않는다. 후보가 없으면 전체 catalog 없이 null을 반환한다.
- getLocalFontRecords도 캐시된 레코드를 재사용하되 현재 가용성 및 기존 반환 계약을 보존한다.
  공개 배열·레코드의 외부 변경 가능성을 조사해 내부 인덱스 오염을 막는다.
- sourceKey→entry 보조 인덱스를 필요한 bytes 공급 경로에서 재사용할지 측정 근거로 판단한다.
  조회 개선을 위해 native 허용 root 또는 font parsing 정책을 바꾸지 않는다.
- catalog 무효화 시 이전 객체 참조·메모리 보유를 회수한다. 전체 catalog scan은 구축에 한정하고
  요청별 가용성 확인은 같은 이름 후보 수에 한정한다.
- spy 또는 입력 접근 계수로 구축 이후 반복 hit/miss가 전체 변환·alias 재정규화를 반복하지
  않음을 검증한다. 시간 임계값만으로 CI 성공을 결정하지 않는다.
- Stage 1과 같은 benchmark를 실행한다. 실제 upstream 소비자 연결을 통해 표시 family와
  CanvasKit bytes 식별자가 유지되는지 확인한다.

### 검증

```bash
pnpm --filter @postmelee/alhangeul-studio-host exec vitest run src/core/local-font
pnpm --filter @postmelee/alhangeul-studio-host exec vitest bench --run src/core/local-font-lookup.bench.ts
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
git diff --check
```

초기 원격 피드백이 필요하면 publish/task97에 단계 커밋을 게시하고 `ci.yml profile=fast`를 사용한다.
local/task97은 원격 게시하지 않으며 Open PR은 최종 보고 이후 생성한다.

### 커밋

`Task #97 Stage 2: 로컬 글꼴 조회 인덱스와 상태 무효화 연결`

## Stage 3 — Windows/Linux 편집 성능과 기능 수용

### 산출물

- 기존 `tests/gui/specs/local-fonts.e2e.ts`, `tests/gui/local-fonts/ui.ts`의 필요한 관찰 보정.
- 같은 폴더의 성능 관찰 helper가 필요하면 별도 파일로 분리한다.
- `mydocs/working/task_m010_97_stage3.md`에 플랫폼별 exact artifact·조건·결과 기록.

### 변경 내용

- 공유 변경 후보를 profile=full로 생성하여 Windows x64, Linux x64/arm64 native·package 계약을 확인한다.
- Linux x64는 기존 alhangeul-linux-gui.yml의 local-fonts scope와 exact producer를 재사용한다.
  Windows는 기존 native 자동화 또는 실제 설치 환경으로 확인한다. 전용 Windows E2E 플랫폼
  신규 구축은 #35 범위이므로 이번 성능 수정의 필수 부수 구현으로 확장하지 않는다.
- 공개 Abel·NanumSquare fixture와 공개 대표 HWP/HWPX를 사용한다. 같은 장비/VM, 글꼴 목록,
  문서, renderer, 창 크기와 조작을 고정하고 v0.1.0·개선본의 on/off를 비교한다.
- 최소 5회 반복, 열기 완료 시간과 입력부터 화면 반영까지 지연, 고정 스크롤 구간의 프레임 지연을
  관찰 가능한 방법으로 기록한다. CPU 사용률은 보조 지표이며 원인 판정의 단독 기준이 아니다.
- 개선 수용은 로컬 글꼴 on에서 기준본 대비 중앙값 지연 감소, 반복 측정 변동을 넘는 차이,
  화면 글꼴·저장 내용 유지로 판단한다. 측정 불가능하거나 차이가 불분명하면 성공을 단정하지 않는다.
- 사용/미사용의 재시작·새 창 복원, 다시 감지, 파일 삭제/복구, 실제 로컬 face 공급,
  저장·재열기 및 PDF·인쇄 관련 동작을 점검한다.
- Wayland·DMABUF 비교는 접근 가능한 Linux 환경에서 글꼴 설정과 독립 비교한다.
  접근 불가이면 사용자 제보 장비의 직접 재현은 미검증으로 명시한다.

### 검증

```bash
pnpm run typecheck:gui
pnpm run test:gui:contracts
node --test tests/gui/local-fonts/fixture.test.mjs
pnpm run check:product-boundary
git diff --check
```

원격 입력은 실제 생성된 40자리 product SHA, 성공한 producer run ID와 artifact digest로 채운다.
`gh workflow run ci.yml --ref publish/task97 -f profile=full` 및
`gh workflow run alhangeul-linux-gui.yml --ref publish/task97 -f build_ref=<SHA> -f native_run_id=<RUN> -f scope=local-fonts`
경로를 사용한다. 다른 환경 성공이나 mock으로 필수 실제 수용을 대체하지 않는다.

### 커밋

`Task #97 Stage 3: Windows Linux 글꼴 성능과 편집 회귀 수용`

## Stage 4 — v0.1.1 최종 후보와 배포 준비

### 산출물

- root `package.json`, `apps/desktop/package.json`, `apps/desktop/src-tauri/Cargo.toml`,
  `apps/desktop/src-tauri/Cargo.lock`의 제품 package 항목, `apps/desktop/src-tauri/tauri.conf.json`.
- `docs/architecture/LOCAL_FONTS.md`, 실제 운영 계약 변경이 필요할 때만 `docs/operations/DESKTOP_RELEASE.md`.
- `mydocs/working/task_m010_97_stage4.md`, `mydocs/report/task_m010_97_report.md`, 해당 날짜 orders.

### 변경 내용

- 버전 0.1.1을 검사 도구가 관리하는 표면에 일관되게 반영한다. lock의 다른 의존성은 갱신하지 않는다.
- 인덱스·후보 가용성·무효화 계약만 공식 글꼴 문서에 반영한다. 미실행 검증을 성공으로 쓰지 않는다.
- 최종 후보에서 fast/full 필수 gate를 확인하고 검증된 exact 산출물로 공개할 파일을 고정한다.
- NSIS/MSI, AppImage/DEB/RPM, arm64 DEB의 기존 installer·GUI·VM 수용을 재사용한다.
  기존 release-file harness에 과거 tag/run이 고정돼 있으면 먼저 읽고 최소 입력화가 필요한
  범위를 제시하여 계획 보정 승인을 받는다. 과거 결과를 새 후보 결과로 간주하지 않는다.
- 초기 build 진단 결과와 실제 공개 bytes의 수용을 분리한다. 서명 overlay로 bytes가 달라지면
  새 서명 파일을 설치 수용한 뒤 해당 파일을 그대로 게시한다.
- 최종 보고는 구현·검증 완료, 미게시 상태, 게시할 후보와 알려진 제한을 명확히 구분한다.

### 검증

```bash
pnpm run check:product-version
pnpm run check:release-metadata
pnpm run check:product-boundary
pnpm run test:upstream
pnpm run test:studio
pnpm run build:studio
pnpm run test:automation
git diff --check
```

Windows/Linux native 검사·Tauri build는 승인된 원격 full 경로에서 수행한다.
최종 commit이 바뀌면 CI_VALIDATION.md의 exact artifact 기준으로 필요한 검증만 재수행한다.

### 커밋

`Task #97 Stage 4: v0.1.1 최종 후보 검증과 배포 준비`

## 구현 단계 이후 PR·공개 전달

1. task-final-report로 보고서와 orders를 정리하고 publish/task97 → devel Open PR을 게시한다.
2. 필수 체크·리뷰·승인 후 merge하고 release PR devel → main으로 최종 배포 source를 확정한다.
3. 실제 공개할 후보의 source SHA, workflow run/attempt, artifact ID/digest, package hash,
   서명·SHA256SUMS를 검증한다. exact main source와 후보 일치가 입증되지 않으면 다시 후보를 만든다.
4. 기존 DESKTOP_RELEASE.md 승인 순서에 따라 v0.1.1 tag/Release를 게시하고 공개 asset을 다시 읽어 대조한다.
5. Release read-back 후 site/release.json의 version·notes·다운로드·기존 manifest inventory를 갱신하는
   별도 PR을 만들고, 승인된 exact devel SHA로 Pages를 배포한다. 사이트 변경에 필요한 작업 브랜치는
   그 시점 기존 task worktree 상태를 확인해 안전하게 준비하며 merge된 과거 HEAD를 재사용하지 않는다.
6. 공개 홈·다운로드·manifest와 각 asset의 실제 접근·버전·hash를 확인하고 같은 최종 보고서에 증거를 추가한다.
7. 전체 전달 결과를 보고하고 이슈·브랜치·worktree 정리를 수행한다. 구현 PR merge만으로 배포 완료 처리하지 않는다.

단계 승인을 생략하지 않는다. 비밀 키를 읽거나 출력하지 않고 기존 release environment의 서명 절차를 쓴다.
updater 신규 활성화는 하지 않으며 공개 manifest와 실제 production upgrade 성공을 분리해 기록한다.

## 검증

- 각 Stage 검증을 보고서 작성 전에 수행하고 실패·미실행이면 단계 완료로 처리하지 않는다.
- baseline과 after 측정은 같은 조건으로 비교하고 실제 OS 결과와 함수 측정을 분리한다.
- 필수 수용 환경이 없으면 독립적으로 가능한 작업을 먼저 완료하고 미검증 항목을 명시한다.
- 제품/문서 범위 또는 위치가 달라지면 구현 전에 계획을 보정하고 승인받는다.

## 커밋

- 단계 산출물과 `mydocs/working/task_m010_97_stage{N}.md`를 함께 커밋한다.
- 최종 보고 및 게시 이후 증거 보정도 `Task #97:` 접두사로 기록한다.
- 계획만 작성한 현재 커밋은 `Task #97: 구현 계획서 작성과 수행계획 승인 기록`이다.

## 단계 의존성

- Stage 1은 본 구현계획 및 Stage 1 진입 승인 후 시작한다.
- Stage 2는 Stage 1 보고 승인, Stage 3은 Stage 2 보고 승인, Stage 4는 Stage 3 수용 승인 후 진행한다.
- 최종 보고·PR·release·site 게시 게이트는 저장소 운영 절차를 따른다.

## 위험과 대응

- **실패 상태가 동적으로 변함**: 이름 인덱스만 재사용하고 가용성은 후보별 현재 상태로 확인한다.
- **레코드 identity와 외부 변경**: public API 반환과 내부 인덱스 소유권을 분리해 stale/오염을 방지한다.
- **다른 지연 원인**: baseline에서 조회 외 원인이 주도하면 무리하게 완료하지 않고 계획을 보정한다.
- **환경/노이즈**: GPU·VM·글꼴 수와 cold/warm 조건을 기록하고 반복 비교한다.
- **과거 배포 harness 고정값**: 자동화가 재사용 가능한지 확인 후 최소 보정 범위를 승인받는다.
- **원래 로컬 작업 보호**: 모든 변경은 분리 worktree에서 수행하며 기존 local/task69의 변경을 건드리지 않는다.

## 승인 요청 사항

- 위 Stage 1~4 산출물·검증·커밋·단계 의존성.
- 이름 인덱스와 현재 후보 가용성 확인을 결합하는 설계 방향.
- 구현계획 승인 후 Stage 1의 baseline·회귀 시나리오 고정 작업 진입.

## Stage 3 계획 보정 — 같은 VM의 실제 설치본 비교 (승인 완료)

### 확인된 제약

- 기존 `alhangeul-release-files.yml`과 `scripts/ci/release-file-candidate.mjs`는
  v0.1.0 source, run, artifact ID/digest, package hash 및 version을 고정한다.
  현재 후보를 전달할 수 없으며 이전 성공을 새 후보 수용으로 사용할 수 없다.
- 기존 `local-fonts.e2e.ts`는 Linux x64만 실행하며 Windows의 일반 성능 비교 spec은 없다.
- v0.1.0 signed updater artifact는 2026-10-03 확인 시 만료되지 않았다.
  Windows artifact 10933208421, Linux artifact 10933550939를 보존된 고정 digest로 검증할 수 있다.
- 후보 `66abcd52c77b90a7394ba5fb9e90afc0cef2f6e9`의 full producer
  [37114851835](https://github.com/postmelee/alhangeul-tauri/actions/runs/37114851835)를 실행했다.
  아직 진행 중이며 성공·설치 수용으로 기록하지 않는다.

### 최소 추가 범위

| 파일 | 역할 | 경계 |
|---|---|---|
| `.github/workflows/alhangeul-font-performance.yml` | Windows/Linux 같은 hosted VM에서 기준본·개선본 순차 설치·성능 관찰 | workflow_dispatch, contents/actions read; 기존 driver·설치·cleanup·WebView2 정책 재사용 |
| `scripts/ci/font-performance-candidate.mjs` | 기준 signed updater artifact와 개선 desktop artifact의 exact bytes 확인 | 기존 handoff·safe download·inventory·hash·기준 서명 검증 재사용; 불완전/실패 producer 거부 |
| `tests/gui/specs/local-font-performance.e2e.ts` | 실제 설치본의 HWP/HWPX on/off 반복 조작 | 현재 wdio.release-files.conf.ts의 --spec override; 제품 개발용 global/명령 주입 없음 |
| `tests/gui/local-fonts/performance.ts` | WebView 내부 시간과 프레임 관찰 | 같은 fixture·조작의 준비/열기/입력/스크롤을 분리; 각 5회 이상 |
| `.github/workflows/alhangeul-desktop.yml` | 기존 dispatcher에서 새 비교 reusable workflow 호출 | `font-performance` mode와 전용 producer run 입력만 추가; 기존 build/release mode 보존 |
| 관련 focused 계약 테스트 | provenance·누락/불일치 실패 및 관찰 결과 검증 | 기존 자동화/GUI 검사 범위; 원격 결과를 mock으로 대신하지 않음 |

기존 v0.1.0 release acceptance의 고정 상수와 동작은 그대로 둔다. 새 측정 경로는
제품 배포나 updater 활성화를 수행하지 않는다. Stage 4의 최종 release-file 입력화는
필요한 경우 별도로 검토·승인하며 여기서 선행 변경하지 않는다. 새 제품 문서는 만들지 않고
계획·관찰 증거는 승인된 `mydocs/plans`, `mydocs/working` 위치에 둔다.

### 실행과 수용

1. 후보 full CI의 성공 및 Windows/Linux x64 desktop artifact ID/digest를 확인한다.
2. workflow 입력은 후보 40자리 SHA와 성공 producer run으로 제한한다. harness SHA는 별도 기록한다.
   Windows MSI·Linux AppImage의 기준/개선 파일을 같은 job에서 순차 실행한다.
3. Windows 설치·제거, Linux 원본 AppImage 실행, WebView2 자동화 정책 복원은 기존 도구를 쓴다.
   기준과 후보 모두의 설치/실행/정리 성공, 정확한 파일 hash 및 증거 업로드를 필수로 한다.
4. 같은 public HWP/HWPX, Abel fixture와 runner의 실제 catalog, 창 크기, renderer를 고정한다.
   감지·첫 렌더와 warm 편집을 분리하고 enabled/disabled를 각 5회 이상 관찰한다.
   측정 workload와 실제 글꼴 적용·문서 내용·스크린샷을 함께 보존한다.
5. WebView 내부 performance.now와 프레임 관찰을 사용해 WebDriver 왕복 대기와 구분한다.
   입력 완료는 내용 변화와 canvas 반영을 확인하고, 스크롤은 실제 이동 범위와 프레임 간격을 기록한다.
   관찰 자체의 비용·GPU/소프트웨어 backend·설치 글꼴 수·실행 순서·분산을 명시한다.
6. baseline/after 원시 samples, 중앙값·범위와 on/off 차이를 비교한다. renderer fallback,
   내용/face 불일치, 지연 감소 불명확이면 성능 수용 완료로 처리하지 않는다.
7. 기존 Linux local-fonts scope도 유지해 재감지·삭제/복구·새 창·프로세스 재시작·roundtrip을 검증한다.
   Wayland 제보 장비와 작업지시자의 Windows 문서 직접 재현 여부는 별도로 기록한다.

### 추가 검증 명령

```bash
pnpm run typecheck:gui
pnpm run test:gui:contracts
pnpm run test:automation
node --test tests/gui/local-fonts/fixture.test.mjs
pnpm run check:product-boundary
git diff --check
```

원격 비교 workflow의 정확한 dispatch 입력·run 및 결과는 Stage 3 보고서에 기록한다.
작업지시자의 보정안 승인 요청에 대한 후속 “진행해줘”를 위 신규 workflow/script/spec 및
설치·실행 orchestration helper, 관련 계약 검사 등록의 승인으로 기록한다. Stage 3은 진행 중이며
완료보고·다음 단계 승인으로 간주하지 않는다.


Stage 3 원격 실행 준비 기록:

- 새 workflow는 기존 dispatcher의 `font-performance` mode로 호출한다. 새 workflow 파일의
  default-branch 등록이나 검증 전 PR merge를 요구하지 않으며 기존 branch workflow 호출 방식을 쓴다.
- `run-font-performance.mjs`는 기존 MSI install/cleanup과 wdio CLI 실행만 순차 묶는다.
- 원격 실행을 위해 검증 harness 후보 커밋을 먼저 게시하고, 실제 수용 후 최종 Stage 3 보고서와
  결과·필요한 보정을 묶어 단계 커밋한다. 후보 게시를 Stage 3 완료로 기록하지 않는다.
- GUI typecheck, GUI contracts 23개, automation 1031개, public fixture 3개, boundary 732개가 통과했다.
  후보 native CI는 아직 진행 중이다. 원격 비교 전 현재 변경에 대한 최종 계약 검사를 다시 확인한다.


## Stage 3 추가 계획 보정 — Rust 1.99 Windows 빌드 호환성 (승인 완료)

### 실제 실패 증거

- 제품 producer 37114851835의 Windows job 111180224686은 `Lint Windows thumbnail handler`에서 실패했다.
- toolchain 설치 로그는 Rust 1.98.1에서 2026-10-01 공개된 stable 1.99.0으로 갱신되었음을 기록한다.
- `apps/thumbnail-handler/src/lib.rs:77`의 `AtomicU32::fetch_update`에 대한 deprecated 경고가
  `-D warnings`로 오류가 되어 package 생성과 Windows installer smoke가 수행되지 않았다.
- desktop Rust test/Clippy, thumbnail worker/handler test 및 worker Clippy는 통과했다.
  이 호출은 v0.1.0·기준 devel부터 있었으며 이번 글꼴 인덱스 변경 파일에 포함되지 않는다.
- Rust 공식 [Atomic 문서](https://doc.rust-lang.org/std/sync/atomic/struct.Atomic.html)는
  `fetch_update`가 1.99부터 deprecated이며 `try_update`의 alias임을 설명한다.
  `try_update`는 Rust 1.95부터 stable이다. 프로젝트 manifest에 별도 rust-version은 선언되어 있지 않다.

### 승인 요청 범위

`apps/thumbnail-handler/src/lib.rs`의 기존 한 호출 이름만 다음처럼 바꾼다.

```diff
-        let _ = SERVER_LOCKS.fetch_update(Ordering::AcqRel, Ordering::Acquire, |count| {
+        let _ = SERVER_LOCKS.try_update(Ordering::AcqRel, Ordering::Acquire, |count| {
             count.checked_sub(1)
         });
```

동일한 memory ordering, checked_sub 및 반환값 무시 계약을 보존한다. 경고 전체 허용,
CI gate 완화, stable 버전 rollback, upstream 코드 수정 또는 pin 갱신은 포함하지 않는다.
이 보정은 이번 릴리즈 후보 생성의 실제 blocker 해소에 한정하며 썸네일 기능을 확대하지 않는다.

### 검증 및 이후 실행

- 현 호스트에서 Rust desktop/Windows target 빌드·검증을 수행하지 않는다.
- 지원되는 Windows 원격 환경에서 기존 thumbnail handler test/Clippy를 포함한
  `ci.yml profile=full`로 보정 후 전체 후보를 새 source SHA에 고정한다.
- 기존 37114851835는 실패 기록으로 보존한다. 부분 Linux 성공으로 full/Windows 수용을 대체하지 않는다.
- 새 성공 producer의 exact Windows/Linux artifact로 계획대로 기존 Linux local-fonts GUI와
  같은 VM baseline/improved 성능 비교를 실행한다.
- 현재 검증 harness 커밋 49705b9c의 fast CI 37116113744는 성공했다.
  이는 실제 설치 성능이나 제품 전체 CI 성공을 뜻하지 않는다.
- API rename은 기존 연산의 alias 이동이므로 구현을 복제하는 새 단위 테스트를 추가하지 않는다.
  기존 native 검사와 설치 수용을 보존한다.

작업지시자의 보정 요청에 대한 후속 “진행해줘”를 이 범위 승인으로 기록한다.
문서 위치는 기존 plans/working/orders에 유지한다. thumbnail-handler의 호출 이름 한 곳만 보정한다.
Stage 3 전체는 미완료이며 Stage 4 진입 승인 요청이 아니다.

기준 full CI 37114851835는 최종 failure다. Linux x64/arm64 및 세 core job은 통과했고,
Windows Clippy 실패로 Windows package/설치 smoke는 미수행이다. 새 후보 검증으로 이어간다.


## Stage 4 진입 때 함께 검토할 보정안 — 새 릴리즈 후보의 exact-file 수용 (승인 대기)

Stage 3 구현·검증을 진행하는 동안 기존 release harness의 고정값을 읽어 아래 범위를 확인했다.
아래 소스 변경은 Stage 4 진입 승인 후에만 수행한다. 현재 제품 version은 0.1.0이다.

- `scripts/ci/release-file-candidate.mjs`, `release-linux-candidate.mjs`의 기존 v0.1.0 baseline
  상수·기본 호출 계약을 보존하고, 새 후보를 위한 검증 입력 경로를 별도 추가한다.
  성능 비교가 사용하는 v0.1.0 기준을 v0.1.1로 조용히 교체하지 않는다.
- 새 입력은 version/tag/source SHA, 성공한 signed/native producer run, artifact ID/digest,
  선택 package path/hash를 가진 승인된 후보 JSON으로 전달한다. caller workflow input → env →
  JSON parser만 사용하며 shell 문자열로 실행하지 않는다. 누락·형식 오류·producer 실패·
  archive digest·inventory·파일 hash·서명 불일치를 거부한다.
- `.github/workflows/alhangeul-desktop.yml`의 기존 release acceptance mode에서 새 입력을 전달하고,
  `alhangeul-release-files.yml`, `alhangeul-release-linux-files.yml`, `alhangeul-release-fedora-vm.yml`
  에 같은 후보 입력을 연결한다. 기존 mode와 v0.1.0 기본 동작을 보존한다.
- Windows NSIS/MSI 및 AppImage는 production updater 검사와 분리한 기존 native 문서 시나리오로
  각각 확인할 수 있도록 matrix 선택을 최소 입력화한다. production updater 신규 활성화나
  기존 production-check 시나리오 변경은 포함하지 않는다.
- `accept-release-arm64.sh`, `accept-release-fedora.sh`, `release-fedora-vm-guest.sh`,
  `release-fedora-vm-session.sh`의 version/source/run 고정값은 검증한 후보 환경값으로 전달한다.
  KVM/Fedora·arm64 실행·정리·필수 GUI gate는 완화하지 않는다.
- 관련 기존 release-candidate/Windows·Linux acceptance 계약 테스트를 보정하고,
  승인된 입력의 거부 조건과 이전 baseline 계약 보존을 검증한다.
- 최종 DEB x64는 기존 Linux GUI full 경로로 native 저장·재열기·PDF·인쇄를 수용한다.
  나머지 NSIS/MSI/AppImage, RPM Fedora VM, arm64 DEB는 위 기존 exact-file 경로를 쓴다.
- 제품 version 변경, `LOCAL_FONTS.md`의 최소 계약 보정 및 최종 full CI는 원래 Stage 4 계획을 따른다.
  새 signed bytes와 native package bytes의 실제 설치 수용 후에만 공개 후보를 확정한다.

추가 제품 문서 루트는 만들지 않는다. 후보 데이터·실행 증거는 승인된 working/report 위치와
GitHub Actions artifact에 보존한다. 전체 source/bytes와 미검증 항목은 Stage 4 보고서에서 구분한다.
이 보정안은 Stage 3 수용 보고와 다음 단계 승인 요청 때 함께 제시하며 현재 승인을 간주하지 않는다.


Stage 3 비교 harness 실행 보정 기록:

- 제품 후보 `ef54ae9dd1de17a208eff6986335d23b2e7ff86b`의 full CI
  [37116980444](https://github.com/postmelee/alhangeul-tauri/actions/runs/37116980444)는 최종 success다.
- 비교 run [37119712473](https://github.com/postmelee/alhangeul-tauri/actions/runs/37119712473)은
  두 플랫폼에서 환경 증거 수집의 `tauri-driver --version` 호출로 실패했다. 이 driver는 해당
  옵션을 지원하지 않는다. 실제 앱 비교는 시작하지 않았으며 성능 수용 결과가 없다.
- 승인된 Stage 3 harness 범위에서 기존 Linux release harness와 같이 `cargo install --list` 및
  고정 버전 행 확인으로 보정한다. 제품 코드·후보 파일·서명·upstream은 바꾸지 않는다.
- harness SHA와 product SHA를 구분하고 성공한 37116980444의 exact 후보 파일을 재사용한다.
  Linux local-fonts/full 및 Windows PDF 검증은 같은 product SHA로 별도 실행 중이다.
- 아래 후속 Stage 4 보정안은 계속 승인 대기이며, 이번 커밋에 제안 문서만 포함한다.
